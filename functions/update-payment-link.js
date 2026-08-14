// Payment Link の「決済完了後のリダイレクトURL」を Stripe API 経由で更新する。
//
// ■ なぜこれが必要か
// Payment Links API で作成されたリンクは、Stripeダッシュボードから編集できず
// （「APIを使用してのみ編集できます」と表示される）、API でしか変更できない。
//
// ■ 使い方（しろちゃんご自身のターミナルで実行してください）
//   1. 確認だけ（何も変更しない）
//        cd F:\Claude学習\howto-v2\functions
//        node update-payment-link.js
//   2. 実際に更新する
//        node update-payment-link.js --apply
//
//   実行前に、そのターミナルで Stripe のキーを環境変数に入れておく:
//        PowerShell:  $env:STRIPE_SECRET_KEY = "rk_live_ここに貼り付け"
//        Git Bash:    export STRIPE_SECRET_KEY="rk_live_ここに貼り付け"
//
// ■ どのキーを使うか（重要）
//   既存の sk_live_ は作成時にしか表示されず、後から見ることはできない。
//   かといって「ロール（作り直し）」すると旧キーが失効し、Secret Manager 経由で
//   それを使っている stripeWebhook / verifyCheckoutSession が本番で止まる
//   （復旧には Secret Manager への新バージョン登録＋3関数の再デプロイが必要）。
//   → この用途では「Payment Links: 書き込み」だけを許可した
//     制限付きキー(rk_live_) を新規作成して使い、終わったら削除するのが安全。
//
// ■ 注意
//   - このスクリプトはキーを一切表示・保存しません（頭4文字だけ形式確認に使います）
//   - --apply を付けない限り、Stripe 側は何も変わりません
//   - 実行後はターミナルを閉じるか、環境変数を消してください
//        PowerShell:  Remove-Item Env:\STRIPE_SECRET_KEY
//        Git Bash:    unset STRIPE_SECRET_KEY

const Stripe = require("stripe");

// 対象の Payment Link（本番・¥100）と、設定したいリダイレクト先
const TARGET_URL = "https://buy.stripe.com/8x24gAe62bwQaYO07teUU00";
const NEW_REDIRECT_URL =
  "https://crossmemo.web.app/?payment=success&session_id={CHECKOUT_SESSION_ID}";

const apply = process.argv.includes("--apply");

function fail(message) {
  console.error(`\n[エラー] ${message}\n`);
  process.exit(1);
}

(async () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    fail(
      "環境変数 STRIPE_SECRET_KEY が設定されていません。\n" +
        '        PowerShell: $env:STRIPE_SECRET_KEY = "rk_live_..."\n' +
        '        Git Bash:   export STRIPE_SECRET_KEY="rk_live_..."\n' +
        "        （Payment Links を『書き込み』にした制限付きキーの利用を推奨）"
    );
  }
  // 過去に mk_ で始まる誤った値を貼ってしまった事例があるため、形式だけ確認する
  // （値そのものは表示しない）。
  // rk_ = 制限付きキー。既存の sk_live_ を作り直す（ロールする）と Cloud Functions が
  // 使っているキーが失効して本番の決済検証が止まるため、この用途では
  // 「Payment Links: 書き込み」だけを許可した制限付きキーを使うのが安全
  if (!/^(sk|rk)_(live|test)_/.test(key)) {
    fail(
      `キーの形式が正しくありません（先頭が "${key.slice(0, 4)}..."）。\n` +
        "        Stripeのキーは sk_live_ / sk_test_ / rk_live_ / rk_test_ で始まります。"
    );
  }
  const isRestricted = key.startsWith("rk_");
  const isLive = /^(sk|rk)_live_/.test(key);
  console.log(
    `使用するキー: ${isLive ? "本番" : "テスト"}／${isRestricted ? "制限付き(rk)" : "標準シークレット(sk)"}`
  );

  const stripe = new Stripe(key);

  // buy.stripe.com/xxxx の短いコードは Payment Link のID（plink_...）ではないため、
  // 一覧から url が一致するものを探して plink_ を特定する
  console.log("\nPayment Link を検索しています…");
  let link = null;
  for await (const l of stripe.paymentLinks.list({ limit: 100 })) {
    if (l.url === TARGET_URL) {
      link = l;
      break;
    }
  }
  if (!link) fail(`対象の Payment Link が見つかりませんでした: ${TARGET_URL}`);

  const before = link.after_completion;
  console.log(`\n  ID        : ${link.id}`);
  console.log(`  URL       : ${link.url}`);
  console.log(`  有効       : ${link.active}`);
  console.log(`  現在の設定 : ${JSON.stringify(before)}`);
  console.log(`\n  変更後     : redirect → ${NEW_REDIRECT_URL}`);

  const currentRedirect = before && before.redirect && before.redirect.url;
  if (currentRedirect === NEW_REDIRECT_URL) {
    console.log("\n既に設定済みです。変更の必要はありません。\n");
    return;
  }

  if (!apply) {
    console.log("\n--- 確認モードです。Stripe側は何も変更していません。 ---");
    console.log("実際に更新するには、もう一度 --apply を付けて実行してください:");
    console.log("    node update-payment-link.js --apply\n");
    return;
  }

  console.log("\n更新しています…");
  const updated = await stripe.paymentLinks.update(link.id, {
    after_completion: {
      type: "redirect",
      redirect: { url: NEW_REDIRECT_URL },
    },
  });

  const after = updated.after_completion;
  console.log(`  更新後の設定: ${JSON.stringify(after)}`);

  if (after && after.redirect && after.redirect.url === NEW_REDIRECT_URL) {
    console.log("\n✅ 更新できました。\n");
  } else {
    fail("更新後の値が期待と違います。Stripeダッシュボードで確認してください。");
  }
})().catch((err) => {
  const permissionIssue =
    err.type === "StripePermissionError" || /permission/i.test(err.message || "");
  fail(
    `${err.type || "Error"}: ${err.message}` +
      (permissionIssue
        ? "\n\n        制限付きキー(rk_)をお使いの場合は、権限の設定を確認してください。" +
          "\n        「Payment Links」を『書き込み』にする必要があります（読み取りだけでは更新できません）。"
        : "")
  );
});
