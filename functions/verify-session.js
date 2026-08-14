const { HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { grantApp } = require("./grant-app");

// Stripe の Checkout Session ID の形式。ここで先に弾いておくと、
// でたらめな値を延々と Stripe API に投げさせる総当たりをある程度防げる
const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{10,200}$/;

// 決済完了後のリダイレクトで受け取った session_id を検証し、
// 呼び出し元の uid に購入フラグを立てる。
// stripe / db を引数で受け取るのはテストで差し替えられるようにするため
// （この関数自体は Firebase の実体に依存しないので、実費ゼロで検証できる）。
async function verifyCheckoutSessionCore({
  stripe,
  db,
  priceToAppId,
  emailToKey,
  sessionId,
  uid,
}) {
  // 1. 形式チェック（Stripe API を叩く前に落とす）
  if (typeof sessionId !== "string" || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new HttpsError("invalid-argument", "お支払い情報の形式が正しくありません。");
  }

  // 2. Stripe に実在するセッションか
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    logger.warn("checkout session retrieve failed", {
      sessionId,
      uid,
      errorMessage: err.message,
    });
    throw new HttpsError("not-found", "お支払い情報が見つかりませんでした。");
  }

  // 3. 本当に支払い済みか（未払い・期限切れのセッションでは絶対に付与しない）
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    logger.warn("checkout session is not paid", {
      sessionId,
      uid,
      paymentStatus: session.payment_status,
    });
    throw new HttpsError("failed-precondition", "お支払いがまだ完了していません。");
  }

  // 4. 何を買ったのか（Price ID -> appId）。
  //    stripeWebhook と同じ PRICE_TO_APP_ID を使うので判定はぶれない
  let lineItems;
  try {
    lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 });
  } catch (err) {
    logger.error("listLineItems failed", { sessionId, uid, errorMessage: err.message });
    throw new HttpsError("internal", "お支払い内容を取得できませんでした。時間をおいてお試しください。");
  }

  const appIds = [];
  for (const item of lineItems.data) {
    const priceId = item.price && item.price.id;
    const appId = priceId ? priceToAppId[priceId] : null;
    if (appId && !appIds.includes(appId)) appIds.push(appId);
  }
  if (appIds.length === 0) {
    logger.warn("verified session contains no known price ID", { sessionId, uid });
    throw new HttpsError("failed-precondition", "このお支払いは対象のアプリのものではありません。");
  }

  // 5. 冪等性の担保。
  //    同じ session_id を最初に使った uid で「予約」する。
  //    - 別の uid が同じ session_id を使い回そうとしたら弾く（URL 転載・共有対策）
  //    - 同じ uid の再実行は許可し、下の付与だけやり直す
  //      （1 回目が付与の途中で落ちていても、もう一度呼べば復旧できるようにするため）
  const claimRef = db.ref(`checkoutSessions/${sessionId}`);
  let existing = null;
  const tx = await claimRef.transaction((current) => {
    if (current === null || current === undefined) {
      return { uid, appIds, claimedAt: Date.now() };
    }
    existing = current;
    return undefined; // 中断（既にある予約は絶対に書き換えない）
  });

  if (!tx.committed) {
    const snapVal = tx.snapshot ? tx.snapshot.val() : null;
    const owner = (existing && existing.uid) || (snapVal && snapVal.uid) || null;
    if (owner && owner !== uid) {
      logger.warn("checkout session already claimed by another user", { sessionId, uid, owner });
      throw new HttpsError(
        "permission-denied",
        "このお支払いは、すでに別のアカウントで有効化されています。"
      );
    }
    // 同じ uid による再実行。付与のやり直しなので、このまま続行する
  }

  // 6. 購入フラグの付与（true を入れるだけなので、何度実行しても結果は同じ）
  try {
    await Promise.all(appIds.map((appId) => grantApp(db, uid, appId)));
  } catch (err) {
    logger.error("failed to write purchasedApps from session verify", {
      sessionId,
      uid,
      errorMessage: err.message,
    });
    // 予約レコードは残したままにする。同じ uid で再実行すれば 5. を素通りして
    // ここだけやり直せるため、消さない方が復旧しやすい
    throw new HttpsError("internal", "購入情報の保存に失敗しました。時間をおいてお試しください。");
  }

  // 7. 同じ決済についてメール照合待ちのレコードが残っていれば消し込む。
  //    残しておくと「そのメールで後から Google アカウントを作った人」に
  //    もう一度付与が走ってしまうため。失敗しても付与は済んでいるので致命扱いしない
  const email =
    (session.customer_details && session.customer_details.email) || session.customer_email || null;
  if (email && typeof emailToKey === "function") {
    try {
      const key = emailToKey(email);
      await Promise.all(
        appIds.map((appId) => db.ref(`pendingPurchases/${key}/${appId}`).remove())
      );
    } catch (err) {
      logger.warn("failed to clear pendingPurchases after session verify", {
        sessionId,
        errorMessage: err.message,
      });
    }
  }

  logger.info("checkout session verified", {
    sessionId,
    uid,
    appIds,
    reclaimed: !tx.committed,
  });
  return { grantedAppIds: appIds, alreadyClaimed: !tx.committed };
}

module.exports = { verifyCheckoutSessionCore, SESSION_ID_PATTERN };
