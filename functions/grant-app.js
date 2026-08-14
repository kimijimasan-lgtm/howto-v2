// 購入フラグの付与をこの1関数に集約する。
// stripeWebhook（client_reference_id 経路）／claimPendingPurchase（メール照合経路）／
// verifyCheckoutSession（session_id 経路）の3経路すべてがここを通るので、
// 「どのアプリに何を書くか」を変えたいときはこのファイルだけを見ればよい。
//
// ■ crossmemo（PCスマホ連動メモ）だけ特別扱いする理由
// crossmemo は他アプリより前に作られたため、購入判定が purchasedApps ではなく
// users/{uid}/isPremium という別の場所を読む設計になっている（app.js の
// onAuthStateChanged が isPremium を1回読むだけ）。
// アプリ側の読み取りを purchasedApps へ切り替えるには既存の課金済みユーザーの
// 移行が必要なので、当面はサーバー側で isPremium にも書いて両対応にする。
//
// なお isPremium は RTDB ルール上いまもクライアント（本人）から書ける。
// これをサーバー専用に閉じると、ゲスト（匿名）が Google 昇格に失敗して
// uid が変わったとき（auth/credential-already-in-use）の逃げ道が無くなり
// 「払ったのに永久に制限が外れない」状態を作りかねないため、
// 閉じるかどうかは session の予約を新uidへ移譲する仕組みとセットで別途検討する。
const APP_IDS_ALSO_GRANTING_IS_PREMIUM = new Set(["crossmemo"]);

async function grantApp(db, uid, appId) {
  // 先に isPremium を書くのは、これがアプリの実際の解錠条件だから。
  // 万一2つ目の書き込みで失敗しても、購入者は買ったものを使える状態で止まる
  if (APP_IDS_ALSO_GRANTING_IS_PREMIUM.has(appId)) {
    await db.ref(`users/${uid}/isPremium`).set(true);
  }
  await db.ref(`users/${uid}/purchasedApps/${appId}`).set(true);
}

module.exports = { grantApp, APP_IDS_ALSO_GRANTING_IS_PREMIUM };
