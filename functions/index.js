const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const { verifyCheckoutSessionCore } = require("./verify-session");

admin.initializeApp();

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// price ID -> purchasedApps 側の appId。新アプリを追加するときはここに1行足して再デプロイする。
// 「じゆうけんきゅうナビ」用のPrice IDはStripeダッシュボードでPayment Link作成後に確定する未確定値。
const PRICE_TO_APP_ID = {
  price_1TyL6pJGshE4KWJ24f3wZODn: "jiyu-kenkyu-app",
  price_1U2kIrJGshE4KWJ2DpUjet62: "houji-pwa",
};

// メールアドレスをRTDBキーとして安全に使える形式に変換する（$ # [ ] . / を含められないため）。
// stripeWebhook（書き込み）とclaimPendingPurchase（読み取り・消し込み）の両方で
// 必ず同じ関数を使うこと（片方だけ変えるとキーが一致しなくなる）
function emailToKey(email) {
  const normalized = String(email).trim().toLowerCase();
  return Buffer.from(normalized, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

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

    // client_reference_idは「存在する」かつ「実在するFirebaseユーザーのuidである」場合のみ有効とする。
    // 壊れた値（なりすまし・古いuid等）だった場合も、無い場合と同じくメール照合の救済フローに回す
    let uid = session.client_reference_id || null;
    if (uid) {
      try {
        await admin.auth().getUser(uid);
      } catch {
        logger.warn("client_reference_id does not match an existing user; falling back to email match", {
          sessionId: session.id,
          clientReferenceId: uid,
        });
        uid = null;
      }
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

    // uidが特定できている場合は従来通り即時付与（この分岐の挙動は変更していない）
    if (uid) {
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
      return;
    }

    // uidが特定できない場合（ログイン前に決済リンクへ直接アクセスした等）のフォールバック。
    // 決済者のメールアドレスで pendingPurchases に一時保存し、
    // 該当メールでのログイン時（claimPendingPurchase）に本付与する
    const email = (session.customer_details && session.customer_details.email) || session.customer_email || null;

    if (!email) {
      // メールアドレスも取れない場合は従来通り何もできない。リトライしても解決しないため200で確認しつつログに残す
      logger.error("checkout.session.completed has no usable client_reference_id and no email to fall back on", {
        sessionId: session.id,
      });
      await eventRef.set({ processedAt: admin.database.ServerValue.TIMESTAMP, error: "missing_client_reference_id" });
      res.status(200).send("missing client_reference_id");
      return;
    }

    try {
      const emailKey = emailToKey(email);
      await Promise.all(
        Array.from(matchedAppIds).map((appId) =>
          admin.database().ref(`pendingPurchases/${emailKey}/${appId}`).set(true)
        )
      );
      await eventRef.set({
        processedAt: admin.database.ServerValue.TIMESTAMP,
        email,
        appIds: Array.from(matchedAppIds),
        pending: true,
      });
    } catch (err) {
      logger.error("Failed to write pendingPurchases", { email, sessionId: session.id, errorMessage: err.message });
      res.status(500).send("Failed to write pendingPurchases");
      return;
    }

    res.status(200).send("ok (pending email match)");
  }
);

// ログイン済みユーザーが呼び出す。IDトークンで検証済みのメールアドレス（クライアントの
// 自己申告ではない）で pendingPurchases を確認し、あれば purchasedApps へ昇格して消し込む。
// 同じアプリを複数回・複数タブから同時に呼んでも二重付与にならないよう、
// 消し込み（true→null）はトランザクションで「本当に自分が消し込めたか」を確認してから
// purchasedAppsに書き込む
exports.claimPendingPurchase = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  const uid = request.auth.uid;
  const email = request.auth.token.email;
  if (!email) return { claimedAppIds: [] };

  const emailKey = emailToKey(email);
  const pendingSnap = await admin.database().ref(`pendingPurchases/${emailKey}`).once("value");
  const pending = pendingSnap.val();
  if (!pending) return { claimedAppIds: [] };

  const claimed = [];
  for (const appId of Object.keys(pending)) {
    if (pending[appId] !== true) continue;
    let wonClaim = false;
    const entryRef = admin.database().ref(`pendingPurchases/${emailKey}/${appId}`);
    const txResult = await entryRef.transaction((current) => {
      if (current === true) {
        wonClaim = true;
        return null;
      }
      wonClaim = false;
      return current;
    });
    if (txResult.committed && wonClaim) {
      await admin.database().ref(`users/${uid}/purchasedApps/${appId}`).set(true);
      claimed.push(appId);
    }
  }
  return { claimedAppIds: claimed };
});

// 決済完了後のリダイレクト（?session_id=cs_...）を受けて、クライアントから呼ばれる。
// webhook の到着やメールアドレスの一致に依存せず、Stripe に直接
// 「この Checkout Session は支払い済みか」を問い合わせて、
// IDトークンで検証済みの uid に購入フラグを立てる。
//
// 既存の stripeWebhook（client_reference_id 方式）と
// claimPendingPurchase（メール照合方式）はそのまま残しており、
// この関数が使えなかったときのフォールバックとして併存する。
exports.verifyCheckoutSession = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "ログインが必要です");
  }
  return verifyCheckoutSessionCore({
    stripe: new Stripe(stripeSecretKey.value()),
    db: admin.database(),
    priceToAppId: PRICE_TO_APP_ID,
    emailToKey,
    sessionId: request.data && request.data.sessionId,
    uid: request.auth.uid,
  });
});
