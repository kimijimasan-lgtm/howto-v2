const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// price ID -> purchasedApps 側の appId。新アプリを追加するときはここに1行足して再デプロイする。
// 「じゆうけんきゅうナビ」用のPrice IDはStripeダッシュボードでPayment Link作成後に確定する未確定値。
const PRICE_TO_APP_ID = {
  price_1TyL6pJGshE4KWJ24f3wZODn: "jiyu-kenkyu-app",
};

exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const stripe = new Stripe(stripeSecretKey.value());

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers["stripe-signature"],
        stripeWebhookSecret.value()
      );
    } catch (err) {
      logger.warn("Stripe signature verification failed", { errorMessage: err.message });
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type !== "checkout.session.completed") {
      res.status(200).send("ignored");
      return;
    }

    // Stripeはwebhookを at-least-once で配信し、同一イベントが再送されることがあるため
    // イベントIDで二重処理を防ぐ（既に処理済みなら何もせず200を返す）
    const eventRef = admin.database().ref(`webhookEvents/${event.id}`);
    const alreadyProcessed = (await eventRef.once("value")).exists();
    if (alreadyProcessed) {
      res.status(200).send("already processed");
      return;
    }

    const session = event.data.object;
    const uid = session.client_reference_id;

    if (!uid) {
      // client_reference_idが無いとどのユーザーの購入か特定できない。
      // Payment Link側の遷移URLに ?client_reference_id={uid} を付与し忘れている可能性が高い。
      // リトライしても解決しないため200で確認しつつログに残す。
      logger.error("checkout.session.completed missing client_reference_id", {
        sessionId: session.id,
      });
      await eventRef.set({ processedAt: admin.database.ServerValue.TIMESTAMP, error: "missing_client_reference_id" });
      res.status(200).send("missing client_reference_id");
      return;
    }

    let lineItems;
    try {
      lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    } catch (err) {
      logger.error("Failed to list line items", { sessionId: session.id, errorMessage: err.message });
      res.status(500).send("Failed to list line items");
      return;
    }

    const matchedAppIds = new Set();
    const unknownPriceIds = [];
    for (const item of lineItems.data) {
      const priceId = item.price && item.price.id;
      if (!priceId) continue;
      const appId = PRICE_TO_APP_ID[priceId];
      if (appId) {
        matchedAppIds.add(appId);
      } else {
        unknownPriceIds.push(priceId);
      }
    }

    if (unknownPriceIds.length > 0) {
      logger.warn("checkout.session.completed contains unmapped price IDs", {
        sessionId: session.id,
        unknownPriceIds,
      });
    }

    try {
      await Promise.all(
        Array.from(matchedAppIds).map((appId) =>
          admin.database().ref(`users/${uid}/purchasedApps/${appId}`).set(true)
        )
      );
      await eventRef.set({
        processedAt: admin.database.ServerValue.TIMESTAMP,
        uid,
        appIds: Array.from(matchedAppIds),
      });
    } catch (err) {
      logger.error("Failed to write purchasedApps", { uid, sessionId: session.id, errorMessage: err.message });
      res.status(500).send("Failed to write purchasedApps");
      return;
    }

    res.status(200).send("ok");
  }
);
