// verify-session.js の検証ロジックを、偽の Stripe と偽の RTDB だけで検証する。
// Stripe API へは一切アクセスしないので実費はゼロ。Firebase エミュレータも不要。
//
// 実行: cd F:\Claude学習\howto-v2\functions ; node test\verify-session.test.js

const assert = require("assert");
const { verifyCheckoutSessionCore } = require("../verify-session");

// ---------- テスト対象と同じ設定（index.js から写したもの） ----------
const PRICE_HOUJI = "price_1U2kIrJGshE4KWJ2DpUjet62";
const PRICE_JIYU = "price_1TyL6pJGshE4KWJ24f3wZODn";
const PRICE_TO_APP_ID = {
  [PRICE_JIYU]: "jiyu-kenkyu-app",
  [PRICE_HOUJI]: "houji-pwa",
};

// index.js の emailToKey と同一の実装（回帰確認用にここでも固定する）
function emailToKey(email) {
  const normalized = String(email).trim().toLowerCase();
  return Buffer.from(normalized, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------- 偽の RTDB ----------
// transaction は本物と同じ契約にしている:
//   コールバックが undefined を返したら中断（committed:false, snapshot は現在値）
function makeFakeDb() {
  const data = {};
  const readPath = (path) =>
    path.split("/").reduce((node, key) => (node == null ? undefined : node[key]), data);
  const writePath = (path, value) => {
    const keys = path.split("/");
    const last = keys.pop();
    let node = data;
    for (const k of keys) {
      if (typeof node[k] !== "object" || node[k] === null) node[k] = {};
      node = node[k];
    }
    if (value === null) delete node[last];
    else node[last] = value;
  };

  const db = {
    _data: data,
    _writes: 0,
    _failWritesAt: null, // 付与の失敗を再現したいときに使う
    ref(path) {
      return {
        path,
        async set(value) {
          if (db._failWritesAt && path.startsWith(db._failWritesAt)) {
            throw new Error("simulated write failure");
          }
          db._writes += 1;
          writePath(path, value);
        },
        async remove() {
          db._writes += 1;
          writePath(path, null);
        },
        async transaction(fn) {
          const raw = readPath(path);
          const current = raw === undefined ? null : raw;
          const next = fn(current);
          if (next === undefined) {
            return { committed: false, snapshot: { val: () => current } };
          }
          db._writes += 1;
          writePath(path, next);
          return { committed: true, snapshot: { val: () => next } };
        },
      };
    },
  };
  return db;
}

// ---------- 偽の Stripe ----------
function makeFakeStripe({ session, lineItemPriceIds, retrieveThrows, listThrows }) {
  const calls = { retrieve: 0, listLineItems: 0 };
  return {
    calls,
    checkout: {
      sessions: {
        async retrieve(id) {
          calls.retrieve += 1;
          if (retrieveThrows) {
            const err = new Error("No such checkout.session: " + id);
            err.type = "StripeInvalidRequestError";
            throw err;
          }
          return session;
        },
        async listLineItems() {
          calls.listLineItems += 1;
          if (listThrows) throw new Error("simulated listLineItems failure");
          return { data: (lineItemPriceIds || []).map((id) => ({ price: { id } })) };
        },
      },
    },
  };
}

const SID = "cs_test_a1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuVwXyZ";
const UID_A = "uidAAAAAAAAAAAAAAAAAAAAAAAAA";
const UID_B = "uidBBBBBBBBBBBBBBBBBBBBBBBBB";
const PAID_SESSION = {
  id: SID,
  payment_status: "paid",
  customer_details: { email: "you.miz64@softbank.ne.jp" },
};

function paidSetup(extra) {
  const db = makeFakeDb();
  const stripe = makeFakeStripe(
    Object.assign({ session: PAID_SESSION, lineItemPriceIds: [PRICE_HOUJI] }, extra)
  );
  return { db, stripe };
}

function call({ db, stripe, sessionId = SID, uid = UID_A }) {
  return verifyCheckoutSessionCore({
    stripe,
    db,
    priceToAppId: PRICE_TO_APP_ID,
    emailToKey,
    sessionId,
    uid,
  });
}

async function expectFail(promise, expectedCode) {
  try {
    await promise;
  } catch (err) {
    assert.strictEqual(err.code, expectedCode, `期待したエラーコードと違う: ${err.code}`);
    return err;
  }
  throw new Error(`エラーになるはずが成功した（期待: ${expectedCode}）`);
}

// ---------- テスト本体 ----------
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// [1] 正常系
test("[1] 支払い済みセッション → houji-pwa が付与される", async () => {
  const { db, stripe } = paidSetup();
  const result = await call({ db, stripe });

  assert.deepStrictEqual(result.grantedAppIds, ["houji-pwa"]);
  assert.strictEqual(result.alreadyClaimed, false);
  assert.strictEqual(db._data.users[UID_A].purchasedApps["houji-pwa"], true);
  assert.strictEqual(db._data.checkoutSessions[SID].uid, UID_A);
  assert.deepStrictEqual(db._data.checkoutSessions[SID].appIds, ["houji-pwa"]);
  assert.ok(typeof db._data.checkoutSessions[SID].claimedAt === "number");
  // 他アプリの購入フラグを巻き込んでいないこと
  assert.deepStrictEqual(Object.keys(db._data.users[UID_A].purchasedApps), ["houji-pwa"]);
});

test("[1-b] 複数商品でも、対象のPrice IDだけが appId に解決される", async () => {
  const db = makeFakeDb();
  const stripe = makeFakeStripe({
    session: PAID_SESSION,
    lineItemPriceIds: [PRICE_HOUJI, PRICE_JIYU, "price_unknown_xxxxx"],
  });
  const result = await call({ db, stripe });
  assert.deepStrictEqual(result.grantedAppIds.sort(), ["houji-pwa", "jiyu-kenkyu-app"]);
});

// [2] 二重付与の防止（冪等性）
test("[2-a] 同じuidが同じsession_idで2回呼んでも二重付与にならない", async () => {
  const { db, stripe } = paidSetup();
  const first = await call({ db, stripe });
  const claimAfterFirst = JSON.parse(JSON.stringify(db._data.checkoutSessions[SID]));

  const second = await call({ db, stripe });

  assert.strictEqual(first.alreadyClaimed, false);
  assert.strictEqual(second.alreadyClaimed, true, "2回目は alreadyClaimed になるはず");
  assert.deepStrictEqual(second.grantedAppIds, ["houji-pwa"]);
  // 付与は true のまま。値が壊れたり増えたりしない
  assert.strictEqual(db._data.users[UID_A].purchasedApps["houji-pwa"], true);
  assert.deepStrictEqual(Object.keys(db._data.users[UID_A].purchasedApps), ["houji-pwa"]);
  // 予約レコードは1回目のまま（claimedAt が書き換わらない）
  assert.deepStrictEqual(db._data.checkoutSessions[SID], claimAfterFirst);
});

test("[2-b] 別uidが同じsession_idを使い回すと permission-denied で弾かれる", async () => {
  const { db, stripe } = paidSetup();
  await call({ db, stripe, uid: UID_A });

  await expectFail(call({ db, stripe, uid: UID_B }), "permission-denied");

  // 便乗しようとした uid には何も付与されていないこと
  assert.strictEqual(db._data.users[UID_B], undefined, "別uidにフラグが立ってしまっている");
  // 元の持ち主の予約は無傷
  assert.strictEqual(db._data.checkoutSessions[SID].uid, UID_A);
});

test("[2-c] 付与の途中で失敗しても、同じuidの再実行で復旧できる", async () => {
  const { db, stripe } = paidSetup();
  db._failWritesAt = `users/${UID_A}`;
  await expectFail(call({ db, stripe }), "internal");
  // 予約は残っている（消してしまうと再実行できなくなるため）
  assert.strictEqual(db._data.checkoutSessions[SID].uid, UID_A);
  assert.strictEqual(db._data.users, undefined);

  // 復旧: 書き込みが通るようになれば、同じ呼び出しで付与できる
  db._failWritesAt = null;
  const retry = await call({ db, stripe });
  assert.strictEqual(retry.alreadyClaimed, true);
  assert.strictEqual(db._data.users[UID_A].purchasedApps["houji-pwa"], true);
});

// [3] 無効な session_id
const badSessionIds = [
  ["空文字", ""],
  ["でたらめな文字列", "abc"],
  ["cs_ で始まるが短すぎる", "cs_x"],
  ["null", null],
  ["undefined", undefined],
  ["数値", 12345],
  ["オブジェクト", { toString: () => SID }],
  ["パス区切りの混入", "cs_aaaaaaaaaa/../../users"],
  ["記号の混入", "cs_aaaaaaaaaa$#[]"],
  ["長すぎる値", "cs_" + "a".repeat(300)],
];
for (const [label, value] of badSessionIds) {
  test(`[3-a] 形式不正(${label}) → invalid-argument。Stripeを一度も呼ばない`, async () => {
    const { db, stripe } = paidSetup();
    // call() のデフォルト引数に吸収されないよう、ここだけ本体を直接呼ぶ
    const promise = verifyCheckoutSessionCore({
      stripe,
      db,
      priceToAppId: PRICE_TO_APP_ID,
      emailToKey,
      sessionId: value,
      uid: UID_A,
    });
    await expectFail(promise, "invalid-argument");
    assert.strictEqual(stripe.calls.retrieve, 0, "Stripe API を呼んでしまっている");
    assert.deepStrictEqual(db._data, {}, "DBに書き込みが発生している");
    assert.strictEqual(db._writes, 0);
  });
}

test("[3-b] Stripeに存在しない session_id → not-found、付与なし", async () => {
  const db = makeFakeDb();
  const stripe = makeFakeStripe({ retrieveThrows: true });
  await expectFail(call({ db, stripe }), "not-found");
  assert.deepStrictEqual(db._data, {});
  assert.strictEqual(db._writes, 0);
});

test("[3-c] payment_status が unpaid → failed-precondition、付与なし", async () => {
  const db = makeFakeDb();
  const stripe = makeFakeStripe({
    session: { id: SID, payment_status: "unpaid", customer_details: { email: "a@example.com" } },
    lineItemPriceIds: [PRICE_HOUJI],
  });
  await expectFail(call({ db, stripe }), "failed-precondition");
  assert.deepStrictEqual(db._data, {});
  assert.strictEqual(stripe.calls.listLineItems, 0, "未払いなのに商品を取得している");
});

test("[3-d] 対象外のPrice IDのみ → failed-precondition、付与なし", async () => {
  const db = makeFakeDb();
  const stripe = makeFakeStripe({
    session: PAID_SESSION,
    lineItemPriceIds: ["price_someone_elses_product"],
  });
  await expectFail(call({ db, stripe }), "failed-precondition");
  assert.deepStrictEqual(db._data, {});
  assert.strictEqual(db._writes, 0);
});

test("[3-e] 商品の取得に失敗 → internal、予約も付与もしない", async () => {
  const db = makeFakeDb();
  const stripe = makeFakeStripe({ session: PAID_SESSION, listThrows: true });
  await expectFail(call({ db, stripe }), "internal");
  assert.deepStrictEqual(db._data, {});
  assert.strictEqual(db._writes, 0);
});

test("[3-f] no_payment_required（¥0クーポン等）は支払い済みとして扱う", async () => {
  const db = makeFakeDb();
  const stripe = makeFakeStripe({
    session: { id: SID, payment_status: "no_payment_required", customer_details: { email: "a@example.com" } },
    lineItemPriceIds: [PRICE_HOUJI],
  });
  const result = await call({ db, stripe });
  assert.deepStrictEqual(result.grantedAppIds, ["houji-pwa"]);
});

// [4] 既存方式の回帰確認
test("[4] emailToKey は既存の実装と同じ結果を返す（水野さんの実データで固定）", () => {
  assert.strictEqual(
    emailToKey("you.miz64@softbank.ne.jp"),
    "eW91Lm1pejY0QHNvZnRiYW5rLm5lLmpw"
  );
  // 大文字・前後の空白の正規化も従来どおり
  assert.strictEqual(emailToKey("  You.Miz64@SoftBank.ne.JP "), emailToKey("you.miz64@softbank.ne.jp"));
});

test("[4-b] pendingPurchases は対象appIdのみ消し、他アプリ分は残す", async () => {
  const { db, stripe } = paidSetup();
  const key = emailToKey("you.miz64@softbank.ne.jp");
  db._data.pendingPurchases = { [key]: { "houji-pwa": true, "jiyu-kenkyu-app": true } };
  const otherKey = emailToKey("other@example.com");
  db._data.pendingPurchases[otherKey] = { "houji-pwa": true };

  await call({ db, stripe });

  assert.strictEqual(db._data.pendingPurchases[key]["houji-pwa"], undefined, "消し込まれていない");
  assert.strictEqual(db._data.pendingPurchases[key]["jiyu-kenkyu-app"], true, "他アプリ分まで消している");
  assert.strictEqual(db._data.pendingPurchases[otherKey]["houji-pwa"], true, "別メールの分まで消している");
});

test("[4-c] メール未取得のセッションでも付与自体は成功する", async () => {
  const db = makeFakeDb();
  const stripe = makeFakeStripe({
    session: { id: SID, payment_status: "paid" },
    lineItemPriceIds: [PRICE_HOUJI],
  });
  const result = await call({ db, stripe });
  assert.deepStrictEqual(result.grantedAppIds, ["houji-pwa"]);
  assert.strictEqual(db._data.users[UID_A].purchasedApps["houji-pwa"], true);
});

// ---------- 実行 ----------
(async () => {
  let passed = 0;
  const failures = [];
  for (const [name, fn] of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`  PASS  ${name}`);
    } catch (err) {
      failures.push([name, err]);
      console.log(`  FAIL  ${name}`);
      console.log(`        ${err.message}`);
    }
  }
  console.log(`\n${passed}/${tests.length} passed`);
  if (failures.length) process.exit(1);
})();
