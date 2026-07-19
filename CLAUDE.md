# howto-v2 プロジェクト状態

## アプリ概要
PCスマホ連動メモ — Firebase Realtime Database を使ったカテゴリ別記事管理PWA。

**ホスティング（2026-07-02にFirebase Hostingへ移行）:**
- **本番URL: `https://crossmemo.web.app`**（Firebaseプロジェクト `torisetu-234c3` のマルチサイト `crossmemo`）
- デプロイ手順: `git push`（save.bat）だけでは**Firebase Hostingには反映されない**。`firebase deploy --only hosting:crossmemo` を別途実行すること
- 旧URL `https://kimijimasan-lgtm.github.io/howto-v2/`（GitHub Pages）は当面残存（save.batのpushで更新され続ける）。ただし `manifest.json` の start_url/scope は `/` に変更済みのため旧URLでのPWAインストールは非対応になった
- Auth承認済みドメインに `crossmemo.web.app` 追加済み（Firebase Console、2026-07-02）
- 設定ファイル: `firebase.json`（target: crossmemo、public: "."、md/bat/.tiptap-build除外）、`.firebaserc`（default: torisetu-234c3）

## 画面構成
- **home** (`renderHome`) — カテゴリ一覧
- **category** (`renderCategory`) — カテゴリ内カード一覧
- **editor** (`renderEditor`) — 記事エディター（TipTap）

## TipTap 移行（完了）

### バンドル
- `tiptap.bundle.js`（296KB、IIFE、`window.TipTapBundle` に export）
- ビルド元: `.tiptap-build/entry.js`（esbuild）
- エクスポート: `Editor`, `StarterKit`, `ImageExtension`, `YoutubeExtension`, `TaskList`, `TaskItem`, `TextStyleExtension`, `UnderlineExtension`（`@tiptap/extension-underline`、`.tiptap-build/entry.js` で追加 export）
- `ImageExtension` は `CustomImageExtension`（`class` 属性を per-image で保持できるよう extend 済み）
- `TextStyleExtension` は `@tiptap/extension-text-style` を extend し、`color` 属性（inline style）を追加

### 初期化（`renderEditor` 内）
```js
const { Editor: TiptapEditor, StarterKit, ImageExtension, ..., TextStyleExtension } = window.TipTapBundle;
tiptapEditor = new TiptapEditor({
  element: document.getElementById('edContent'),
  extensions: [
    StarterKit,
    ImageExtension.configure({ allowBase64: true, inline: true, HTMLAttributes: { class: 'inserted-img' } }),
    YoutubeExtension.configure({ controls: true, nocookie: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TextStyleExtension,
  ],
  editable: false,
  editorProps: { handlePaste(...) { ... } },
  onUpdate: ({ editor }) => { /* 1秒デバウンス自動保存 */ },
  onCreate: ({ editor }) => { /* compositionstart/end バインド */ },
});
```

### TipTap関連の主要関数
| 関数 | 役割 |
|------|------|
| `_insertImageBlock(imgHtml)` | 画像HTMLを独立段落として挿入するコアヘルパー（後述） |
| `insertSingleImageIntoTipTap(data)` | `_insertImageBlock` 経由で1枚挿入 |
| `insertPortraitGroupIntoTipTap(imageData)` | `_insertImageBlock` 経由で複数縦画像を1段落に挿入 |
| `handleMultipleImagesForTipTap(files)` | 複数画像を向き・枚数に応じてレイアウト分けして挿入 |
| `handleImageForTipTap(file)` | 後方互換ラッパー → `insertSingleImageIntoTipTap` を呼ぶ |
| `compressImageForLayout(file)` | 画像圧縮(800px/JPEG0.75)→`{src, w, h, isPortrait}` |
| `getCleanEditorHTML(editor)` | `tiptapEditor.getHTML()` を返す |
| `saveEditorContentDirectly()` | Firebase に即時保存 |
| `isEditorEmpty()` | `tiptapEditor.isEmpty` を返す |
| `initializeNativeParagraphActions(pm)` | ProseMirror domにスワイプ・SortableJS等をバインド |
| `forceSaveEditorContent()` | 保存後 `tiptapEditor.destroy()` |

### `_insertImageBlock` の挙動（重要）
```js
function _insertImageBlock(imgHtml) {
  // カーソルが空段落 → その段落を置換（splitで余分な空段落を作らない）
  // カーソルが文字段落 → 段落末尾の直後に挿入（テキストと混在しない）
  // 挿入後: 直後にブロックが既存 → そこへ移動、末尾 → 空段落を1つ追加
  const isEmpty = (curPara.childCount === 0 || hardBreakOnly);
  tiptapEditor.chain()
    .focus()
    .insertContentAt(isEmpty ? { from: paraStart, to: paraEnd } : paraEnd, imgHtml)
    .command(/* 直後のブロックへ移動 or 空段落1つだけ追加 */)
    .run();
}
```
- `setImage`（インライン挿入）を廃止し `insertContentAt` に統一
- テキストと画像が同じ `<p>` に混入しない
- 挿入のたびに空段落が積み重なる問題を解消

### DOM構造
```
#edContent.editor-content
  └── .ProseMirror  ← tiptapEditor.view.dom（ここにバインド）
        └── <p>, <img>, ...
```

### モード切替
- `setEditorMode('edit')` → `tiptapEditor.setEditable(true)`
- `setEditorMode('view')` → `tiptapEditor.setEditable(false)` + `blur()`
- **`setEditorMode()` 内に解説パネル用のロックガード**: `mode === 'edit' && state.cardLocked` の場合、`mode` を強制的に `'view'` に上書きしてからセットする（→ 詳細は「解説パネルのカードロック」セクション）
- モード切替UIは右下固定の小ボタン（`position: fixed; bottom: 1.5rem; right: 1rem; 50×50px`）
  - 閲覧モード：「閲」（青）、編集モード：「編」（赤）
  - `#btnModeToggle` の `textContent` を切り替えるだけ（span不使用）
- **Undoボタン**（`#btnUndo`）を編集モード時のみ表示（`setEditorMode` 内で `display` 切替）
- **iOSキーボード「完了」で自動閲覧モード復帰**:
  ```js
  let _blurToViewTimer = null;
  tiptapEditor.on('blur', () => {
    _blurToViewTimer = setTimeout(() => {
      if (state.editorMode !== 'edit') return;
      if (!tiptapEditor || tiptapEditor.isDestroyed || tiptapEditor.isFocused) return;
      setEditorMode('view');
    }, 300);
  });
  tiptapEditor.on('focus', () => {
    if (_blurToViewTimer) { clearTimeout(_blurToViewTimer); _blurToViewTimer = null; }
    // ... 既存スクロール補正
  });
  ```

### iOSキーボード時のカーソルスクロール補正
`tiptapEditor.on('focus')` + 500ms 後に実行：
```js
const rect = el.getBoundingClientRect();
const vvHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
const visibleBottom = vvHeight - 20;
if (rect.bottom > visibleBottom) {
  const edContent = document.getElementById('edContent');
  if (edContent) edContent.scrollTop += rect.bottom - visibleBottom;
}
```
- `visualViewport.height` はキーボード＋予測変換バーを除いた高さを返す
- カーソルが隠れているときだけ差分を加算（アニメーションなし・最小限）
- `scrollIntoView` は上下に無駄な動きが出るため不使用

### iOSステータスバータップ→カード先頭スクロール（実装を撤回・見送り）
iOS Safariの「ステータスバータップでwindowを先頭へスクロール」標準動作を `#edContent` の先頭スクロールに転用しようとしたが、bodyを1pxスクロール可能にする方式（`#app`のpositionを変更しない版でも）が原因で `#edContent` 内の手動スクロールが壊れる不具合が発生したため、実装を完全に取り消し済み（`#statusbarScrollSpacer`・`statusbar-tap-armed`関連のCSS/JSは削除）。再実装する場合は手動スクロールとの共存方法を要検討。

### データ保存形式
Firebase: `users/{uid}/articles/{catId}/{artId}.content` にHTML文字列

## Firebase

### 構成
- `index.html` の `<script>` タグに `firebaseConfig` を直接記述（CDN compat版 v10.12.0）
- Auth: **Googleログイン** + **匿名認証（ゲスト）**（メール/パスワード認証は廃止）
- DB: Realtime Database

### セキュリティルール（設定済み）
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "templates": {
      ".read": "auth !== null",
      "default": {
        ".write": "auth.token.email === 'kimijimasan@gmail.com'"
      }
    }
  }
}
```

## 認証フロー

### ログイン画面（`renderLogin`）
- 「Googleでログイン」ボタン（メイン・白背景）
- 「ゲストとして試す」ボタン（サブ・半透明）→ `firebase.auth().signInAnonymously()`
- メール/パスワード認証は削除済み
- 説明文（`.login-desc`）は **黄色（`#f5c400`）・太字**

### 起動シーケンス（`onAuthStateChanged`）

**ログインフラッシュ修正（2026-06、複数回対応・最終的に根本解決）**:
1回目: `getRedirectResult()` を `onAuthStateChanged` の外で呼ぶと、セッション復元前に `null` が先発火してログイン画面が一瞬表示される問題があった。`null` ハンドラの**内部**で呼ぶよう修正。

2回目: それでもフラッシュが再発（「正規ログイン済みで開く」「ゲストログオフ→正規ログイン」の両方）。固定の待機時間（150ms、初回コールバックのみ）で「本物のnullか、復元前の仮のnullか」を**タイマーで推測**する対処をしたが、推測である以上、復元が遅い環境では取りきれず根本解決にならなかった。

3回目（根本解決）: ゲストログイン（`signInAnonymously()` を直接 `await` してその結果に従うだけで、タイマー等の推測を一切使わない）と構造を比較し、正規ログイン側だけがタイマーで「復元完了済みかどうか」を当てようとしていたことが本質的な原因だと判明。
→ Firebase Auth が提供する **`firebase.auth().authStateReady()`**（永続化セッションの復元が完全に確定するまで解決しないPromise）を `DOMContentLoaded` 内で最初に `await` するよう変更。これにより `onAuthStateChanged` を登録する時点で `firebase.auth().currentUser` は既に確定済みとなり、初回コールバックが暫定的な `null` になることがなくなる。`setTimeout` によるタイマー推測は完全に撤廃。

4回目（保険として多重防御・2026-06）: `authStateReady()` で根本解決した後も、「万一フラッシュが起きてもユーザーの目に入らないようにする」二重の安全策として、起動直後に**スプラッシュ画面**（`.splash-screen`）を表示するよう変更。認証確定（`goTo('home')`/`goTo('login')`直前）まではスプラッシュ画面が`#app`を占有しているため、内部でどんなタイミングずれが起きてもユーザーには一切見えない。
最低表示時間（0.8秒固定）は一度導入したが、認証確認が完了しているのに無駄に画面を待たせるだけだったため**撤廃**。`authStateReady()` 完了後は待機ゼロで即座に `goTo('home')` / `goTo('login')` を呼ぶ。

**デザイン**: 背景は紺→黒のグラデーション（`linear-gradient(160deg, #131a3d 0%, #090b18 55%, #000000 100%)`）。中央に `icon.png`（`splashIconIn` で軽くスケール＋フェードインしながら登場）、その下に「PCスマホ連動メモ」を白・細字（`font-weight: 300`、`splashLogoIn` で少し遅れてフェードイン）、さらに下に3つのドットが順番にパルスするローディングアニメーション（`.splash-dots`）。次画面への遷移は `#app` の既存のopacityトランジション（`goTo()`が`visible`クラスを外す処理）でフェードアウトする。

起動時は常に最初にスプラッシュ画面（`.splash-screen`）を表示し、`authStateReady()` の解決 → `onAuthStateChanged` 登録・確定値での発火 → 即座に `goTo('home')` / `goTo('login')` の順で遷移する（`index.html` の `#app` は空のまま、`DOMContentLoaded` 内で初めてスプラッシュHTMLを挿入するため、静的HTML由来のログイン画面フラッシュは存在しない）。

```
起動
 └─ #app にスプラッシュ画面（アイコン＋ロゴ、暗い背景）を表示
 └─ await firebase.auth().authStateReady()  ← 永続化セッション復元の完全確定を待つ（タイマー推測なし）
 └─ onAuthStateChanged を登録（この時点で currentUser は確定済み）
      ├─ user あり
      │   ├─ state.isAnonymous = user.isAnonymous をセット
      │   ├─ isPremium フラグを Firebase から取得
      │   ├─ categories が 0件 かつ 開発者でない → copyTemplateToUser()
      │   └─ goTo('home')  ← 待機なし、即座に呼ぶ
      └─ user なし
           ├─ await getRedirectResult()  ← ここで初めて呼ぶ（外で呼ばない）
           ├─ currentUser が非 null → 何もしない（redirect成功、再発火されたuser分岐が処理済み）
           └─ currentUser が null → goTo('login')  ← 待機なし、即座に呼ぶ
```

### state オブジェクト
```js
let state = {
  screen, categoryId, articleId,
  uid,
  isPremium,    // Firebase の isPremium フラグ（課金済みのみ true）
  isAnonymous,  // firebase.auth().currentUser.isAnonymous
  editorMode,   // 'view' | 'edit'
};
```
- `goTo()` / `goBack()` / `createArticle()` でも `isPremium` と `isAnonymous` を引き継ぐよう修正済み

### ゲストのサインアウト（`btnSignOut`）
- ゲスト: 「サインアウトするとゲストデータが失われます。よろしいですか？」確認 → `signOut()`
- 通常ユーザー: 「サインアウトしますか？」確認 → `signOut()`

### ★アイコン（ゲストのみ表示）
- ホーム画面ヘッダーに表示（`_homeUser?.isAnonymous` の場合）
- `title="Googleアカウントでログイン"`
- クリック → `showGoogleSyncModal()`（データ同期の案内。詳細は「制限・課金」セクションの「Googleログイン案内」参照）

### アップグレードボタン（`showLimitModal` 内）の動作
- ユーザー種別を問わず `startStripePayment()` で Stripe Payment Link（100円・現在テストリンク）へ遷移
- 決済完了後は `?payment=success` で戻り、起動時分岐等で `users/{uid}/isPremium = true` を設定 → 無制限化（付与の3系統は「Stripe課金」セクション参照）

## 新規ユーザーの初期テンプレート機能

### テンプレートの構成
Firebase `templates/default` に保存されており、新規ユーザーに自動コピーされる。

| パネル | カード数 |
|--------|---------|
| 活用例 | 6枚 |
| 解説 | 6枚 |
| 初めに確認して | 2枚 |

解説カードの内容はコード定数 `TEMPLATE_EXPLANATION_CARDS`（`app.js` 内）で管理。テンプレートの更新は開発者専用の `saveCurrentDataAsTemplate()` で行う。

### 関連関数
| 関数 | 役割 |
|------|------|
| `copyTemplateToUser(uid)` | `templates/default` を読み込み、新規ユーザーのパスにコピー。テンプレート不在時は `createSampleData` にフォールバック |
| `createSampleData(uid)` | フォールバック用静的サンプル。`TEMPLATE_EXPLANATION_CARDS` 定数を使用 |
| `saveCurrentDataAsTemplate()` | 開発者専用。`TEMPLATE_EXPLANATION_CARDS` 定数から `templates/default` を生成・上書き |

### ピン留め（`pinned`）フラグの引き継ぎ（修正済み）
`saveCurrentDataAsTemplate()` が記事を再構築する際、`content`/`createdAt`/`updatedAt`/`order` のみを明示的にコピーしていたため `pinned: true` が欠落し、テンプレート経由のコピー先（新規ユーザー・ゲスト）でピン留めが先頭表示されない不具合があった。`art.pinned === true` の場合のみ `pinned: true` を含めるよう修正。
`copyTemplateToUser(uid)` 側は `{ ...art, ... }` で全フィールドをスプレッドコピーしているため元々問題なし（テンプレート側に `pinned` が無かったことが根本原因）。
カード一覧の表示順（`renderCategory` 内 `doRender()`）は元々 `categoryLocked` やユーザー種別と無関係に `pinned` を先頭ソートしているため、表示ロジック自体に修正は不要だった。
### 「テンプレートを更新」モーダル（開発者専用）
- 表示条件: `firebase.auth().currentUser?.email === 'kimijimasan@gmail.com'`
- 場所: ホーム画面ヘッダー（サインアウトボタンの左隣、データベースアイコン）
- **チェックボックスはデフォルトで全チェック外し**（誤更新防止）
- **パネルが多い場合はスクロール対応**（rows コンテナに `max-height:60vh; overflow-y:auto`）

### 除外条件
- 開発者アカウント（`kimijimasan@gmail.com`）はテンプレートコピーをスキップ
- categories が既に存在するユーザーにはコピーしない

## 制限・課金

### ユーザー種別と制限（2026-07-02 再改定・ログイン済みは同期回数制限）

| 種別 | パネル/カード作成 | データ変更（同期） |
|------|-----------------|------------------|
| ゲスト（匿名）| パネル3つまで・カード各パネル6枚まで | 無制限（作成上限側で制御） |
| 無料Googleログイン | **無制限** | **累計10回まで**（閲覧は無制限） |
| 課金済み（`isPremium: true`）| 無制限 | 無制限 |
| 開発者（`kimijimasan@gmail.com`）| 無制限 | 無制限 |

**パネル/カード作成上限（ゲストのみ・2026-07-18に実在数カウント方式へ変更）**
- 判定: `isCreateLimitedUser()` = `state.isAnonymous && !state.isPremium && !isDeveloperAccount()`（匿名ユーザーのみ対象。無料Googleログインは同期回数制限側で管理）
- **実在数カウント方式**: テンプレートかユーザー作成かを区別せず、その時点で実際に存在するパネル数・カード数をカウントして判定する。削除すればその分だけ枠が空く
- 定数: `FREE_PANEL_LIMIT = 3`（パネル総数の上限）/ `FREE_CARDS_PER_PANEL_LIMIT = 6`（1パネルあたりのカード数上限）
- ヘルパー: `getActualPanelCount()`（`users/{uid}/categories` の実数）/ `getActualCardCount(catId)`（`users/{uid}/articles/{catId}` の実数）
- チェック箇所: `showCategoryModal` 保存（新規分岐）/ `createArticle()` / `duplicateArticle()`
- テンプレート初期状態（3パネル・14カード）ではパネル作成が即座に制限にかかり、6枚パネルへのカード追加も不可（ゲストが「制限がない」と感じることを防止）

**同期回数制限（ログイン済み無料ユーザーのみ・2026-07-02実装）**
- 判定: `isSyncLimitedUser()` = `!!state.uid && !state.isAnonymous && !state.isPremium && !isDeveloperAccount()`
- **同期1回の定義 = 編集セッション単位**: アプリを開いて（ページ読み込み後）最初にデータ変更操作をした時点で1回カウント。同じ起動中の以降のデータ変更は同じ1回に含まれる（`_syncConsumedThisSession` フラグ）。閲覧だけなら消費しない
- 累計・生涯カウント（日次リセットなし）。定数 `FREE_SYNC_LIMIT = 10`。保存先: RTDB `users/{uid}/stats/syncCount`（`transaction` でインクリメント、ログイン時に `state.syncCount` へ読み込み）
- ゲート関数: `consumeSyncQuota()` — true なら続行可（必要なら1回消費）、false なら上限到達（`showLimitModal` 表示済み、呼び出し元は中断）
- **ゲート箇所（データ変更の入口すべて）**: `setEditorMode('edit')`（編集モード入場時。編集開始前にブロックして書いた内容が消える事故を防ぐ）/ パネル作成・編集・削除（`mSave`/`mDel`）/ `createArticle` / `duplicateArticle` / `deleteArticle` / `deleteArticleById` / ピン留め切替 / カード移動（`showMoveModal`）/ カード連結（`mergeSelectedCards`）/ パネル・カード並び替え（Sortable `onEnd`）/ 一括カット（`btnBulkDelete`、閲覧モードからも可能なため）/ 空行削除（`btnRemoveEmptyLines`）
- 上限到達時モーダル文言: 「無料の同期回数（累計10回）を使い切りました。100円で無制限に同期できます。」→ 既存の `showLimitModal` → `startStripePayment()`
- **残り回数表示**: ホーム画面ヘッダー下のバッジ `#syncQuotaBadge` を**制限対象ユーザーには常時表示**（v=861〜。残り4回以上=青系、残り3回以下=オレンジ警告色。タップで案内モーダル）。ログイン直後はホームに着地するため初回案内を兼ねる。加えて残り3回以下では消費時にトースト「無料の同期 残りn回」。`updateSyncQuotaBadge()` で文言・色を更新
- `deleteArticleSilently()`（最後の段落削除時のシステム自動削除）は意図的にゲート対象外
- ⚠️ **`state` 再代入の罠（v=860で修正済みのバグ）**: `goTo()`/`goBack()`/`createArticle()` は `state` を新オブジェクトで丸ごと再代入するため、引き継ぎリストに無いフィールドは画面遷移で消える。`syncCount` の引き継ぎ漏れで制限が一切効かないバグがあった（isPremium/isAnonymousでも過去に同種バグ）。**stateに永続フィールドを追加したら、この3箇所の再代入にも必ず追加すること**
- 100kin-blog `login.html` の制限説明文も更新が必要（ゲストの制限が「パネル3つ・カード各6枚（実在数）」に変更されたため）

### `showLimitModal(message)`
上限到達時の案内。「100円で無制限に使えます」→「アップグレードする（100円）」ボタン → `startStripePayment()`（Stripe Payment Link、現在テストリンク）。

### Googleログイン案内（データ同期用・上限解除とは別軸）
- ホーム画面の★アイコン（ゲストのみ表示）→ `showGoogleSyncModal()`
- 文言は「PCとスマホでデータが同期される」趣旨のみ。**無制限になるとは案内しない**（無料Googleログインは制限対象のため）
- 「Googleでログイン」→ `linkGuestToGoogle()`: `linkWithPopup` でゲストuidをそのままGoogleアカウントに昇格（パネル・カード・累計カウント・isPremiumすべて引き継がれる）
  - `auth/credential-already-in-use`（既存Googleユーザー）→ データ引き継ぎ不可の confirm 後 `signInWithCredential`
  - popup ブロック時は `linkWithRedirect` にフォールバック

## UI詳細

### パネル名入力フォーム（`#catInput` / `.modal-input`）
- 文字色: `#ffffff`（白）、`font-weight: 700`（太字）
- `showCategoryModal` で使用（新規作成・編集とも同じ input）

### カテゴリ編集モーダル（`showCategoryModal`）の文字色（修正済み）
- `.modal-box h3`（タイトル「カテゴリを編集」）・`.modal-box .btn-secondary`（キャンセル）・`.modal-box .btn-danger`（削除）の文字色を `#ffffff`・`font-weight: 700` に固定
- `.modal-box` の背景は常に暗色（`#1c2230`）だが、これらのテキスト色は元々テーマ変数（`var(--text-primary)` / `var(--danger)`）依存だったため、ライト系テーマ選択時に暗い文字色になり視認できなくなっていた

### カテゴリ編集モーダルのキーボード対策（`.modal-overlay.kb-open`）
キーボード表示中にダイアログ（中央配置）がキーボードに押しつぶされ、カラーパレットが見えなくなる問題を修正。
- `#catInput` の `focus`/`blur` で `#modal`（`.modal-overlay`）に `kb-open` クラスを付け外しする
- `.modal-overlay.kb-open { align-items: flex-start; padding-top: 1rem; }` でダイアログを画面上部に移動し、キーボードに隠れないようにする

### カード一覧の並び替え
- **デフォルト**: 名前の昇順（`sortField = 'name'`, `sortDir = 'asc'`）
- 起動時に `updateSortUI()` を呼んでデフォルト状態をUIに反映

### カード編集（エディター）1行目の見出しスタイル
```css
.editor-content .ProseMirror > p:first-child:not(:has(> img)) {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.6;
}
```
- 画像段落が1行目の場合は適用しない（`:not(:has(> img))`）

### カード1行目の自動H1（`_firstLineWasEmpty` / `_autoH1Done`）
- カードを開いたとき、1行目が空段落なら `_firstLineWasEmpty = true` にセット（`setContent` 後に判定）
- 既存カードで1行目にすでに内容があれば `_firstLineWasEmpty = false` → 自動H1不適用
- `onUpdate` で「1行目が空 → テキスト入力」を検出したら `setTimeout(0)` 後に H1 を自動適用
  ```js
  if (!_autoH1Done && _firstLineWasEmpty && state.editorMode === 'edit') {
    const firstNode = editor.state.doc.firstChild;
    if (firstNode && firstNode.type.name === 'paragraph' && firstNode.textContent.trim() !== '') {
      _autoH1Done = true;
      setTimeout(() => {
        tiptapEditor.chain().setTextSelection(1).setHeading({ level: 1 }).run();
      }, 0);
    }
  }
  ```
- `_autoH1Done = true` にして再適用を防ぐ（ユーザーが手動で H1 を解除しても再適用しない）

### コピー＆カットボタンの間隔
`#btnBulkCopy` / `#btnBulkDelete` の `margin-right: 0.75rem`（戻す・編ボタンの間隔と統一）

### 段落書式アクションボタン（`#btnTextFormat`）
- `btnBulkDelete` の右隣に配置（紫系：`#8b5cf6`）、アイコンは `🚀` 絵文字（`font-size: 1.6rem`・最大サイズ）
- 段落・見出しが選択されているとき（`para-selected` > 0）のみ表示（`updateBulkDeleteButtonState` で制御）
- タップで `#textFormatMenu` を表示（ボタン直下に位置合わせ）
- `#textFormatMenuBackdrop`（z-index: 5）でエディターコンテンツ外のクリックを拾って閉じる
  - ヘッダー（z-index: 10）はバックドロップより上なので引き続き操作可能
- **メニューUI**: H1・地の文・H2 + 区切り線 + **B（ボールド）・U（アンダーライン）** + **文字色パレット（17色実装完了）** + **実行ボタン**
  - **選択→実行方式（2026-06改修）**: H1/H2/地の文・B/U・文字色のボタンは押しても即時反映されない。タップで「選択中」状態（紫ハイライト/アウトライン）になるだけで、実際の適用は `#btnApplyExecute`（メニュー最下部の「実行」ボタン）を押した時点でまとめて反映される
  - **完全トグル方式（2026-06改修、⚠️実装中・ON/OFF表示が未完了）**: H1/H2/地の文・B/U のいずれも、メニューを開いた時点で選択中の段落の**現在の状態を検出してON表示**する設計（`_initialHeadingChoice` / `_initialBold` / `_initialUnderline`、`_pendingXxx` の初期値もこれに合わせる）
    - ONのボタンをタップしてOFFにしてから実行すると、その書式が**解除**されて地の文・通常テキストに戻る（OFF→ONも同様に有効化される）想定
    - 実際にコマンドを発行するのは「実行時の `_pendingXxx` が開いた時点の `_initialXxx` と異なる場合」のみ。何も触らずに実行すれば既存の書式はそのまま変化しない
    - H1/H2/地の文は内部的には三択のラジオ的トグル（`_pendingHeadingChoice`: `1|2|'p'|null`）。B/Uは独立した boolean トグルで、見出し選択や互いと**同時選択可能**
    - 見出しの初期検出は選択中の要素タグ（`allH1`/`allH2`/`allP`、全部一致のときのみ確定、混在時は`null`）。B/Uの初期検出はブロック選択時は範囲内テキストが**全て**そのマークを持つか（`rangeFullyHasMark()`）、単一テキスト選択時は `tiptapEditor.isActive('bold'|'underline')`
    - 検出ロジック自体は実際の`tiptap.bundle.js`をjsdomで動かしたシミュレーションでは正しく動作（単一H1選択→`allH1=true`、ボールド段落選択→`initialBold=true`を検出）。pushし忘れによるGitHub Pages未反映の問題も解消した上で、**実機ではON/OFF表示がまだ反映されないという報告あり（2026-06-20時点・未解決）**。次回はこの食い違いの原因（DOM上の`.para-selected`付与タイミング、メニュー再オープン時のボタン要素取得、実際のテストで使っている段落の構造など）から再調査すること
    - ON状態の視認性のため、ハイライトは半透明背景ではなく**ベタの紫背景（`#8b5cf6`）＋白文字＋外側グロー（`box-shadow: 0 0 0 2px rgba(139,92,246,0.5)`）**にしている（`toggleActiveStyle()`）。視認性は強化したが、ON判定自体が実機で機能していない可能性が残る
    - 見出し適用は `toggleHeading` ではなく明示的な `setHeading({level})` を使用（ON/OFF判定は自前の状態機械で行うため、ProseMirror側のtoggle機能と二重にトグルさせると意図と逆転するのを避けるため）
    - 実行時は見出し変換 → 文字色適用 → ボールド → アンダーラインの順で処理。見出し変換でノード（p→h1等）のDOMが置き換わりPM位置情報が失われるため、色・B・U適用用のテキスト範囲は見出し変換前に確保しておく（`setHeading`/`setParagraph`はノードサイズを変えないため、保存したposは変換後も有効）
  - `#btnApplyH1` → 選択トグル（実行時に変更があれば `setHeading({ level: 1 })` or `setParagraph()`）
  - `#btnApplyH2` → 選択トグル（実行時に変更があれば `setHeading({ level: 2 })` or `setParagraph()`）
  - `#btnApplyParagraph` → 選択トグル（実行時に変更があれば `setParagraph()` で見出しを解除し通常テキストに戻す）
  - **`#btnApplyBold` / `#btnApplyUnderline`（ボールド・アンダーライン、⚠️実装中・トグル動作の表示が未完了）**:
    - 実行時に状態が変化していれば段落選択中はその全テキスト範囲、無ければ現在のテキスト選択範囲に対して `bold`/`underline` マークを `addMark`（ONにする場合）または `removeMark`（OFFにする場合）
    - `UnderlineExtension`（`@tiptap/extension-underline`）が必要。StarterKitにBoldは含まれるが Underline は含まれないため `.tiptap-build/entry.js` に追加 export し、TipTapエディター初期化（`renderEditor`・`warmUpTipTap` 両方）の `extensions` 配列に追加した
  - **文字色（`.color-swatch-btn` × 17色 + デフォルト解除ボタン）**:
    - 赤・オレンジ・黄・緑・青・紫・黒・白・ピンク・マゼンタ・ライトブルー・シアン・ライムグリーン・ブラウン・ゴールド・シルバー + デフォルト（`✕`、実行時に `removeMark`で解除）
    - **`input type="color"` のネイティブピッカーは廃止**（iOS Safariで連続タップ時にダブルタップズームが誤発動し画面全体が拡大される不具合があったため）
    - 段落（ブロック）が選択されていればそれら全体に適用、未選択時は現在のテキスト選択範囲に適用（見出し設定と独立して動作）
- **見出し選択の対応**: `h1.para-selected`, `h2.para-selected` もスワイプ左フリップで選択可能
  - `toggleParagraphSelect` は `<h1>`,`<h2>` 要素でも呼び出せる
  - ドラッグハンドル・SortableJS・一括コピー・カット・すべての選択処理が見出しに対応
  - `updateBulkDeleteButtonState` のセレクターに `h1.para-selected, h2.para-selected` を追加
- **H1/H2設定後のドラッグハンドル再注入**:
  - `applyHeadingToSelected` の末尾で `refreshYoutubeDeleteButtons('view')` を呼ぶ
  - TipTap が DOM ノードを置換するため、変換後の見出し要素に新たにハンドルを inject
- **`cleanupSingleParagraph` の修正**:
  - 旧: `p.removeAttribute('class')` → 全クラス強制削除
  - 新: `if (!p.classList.length) p.removeAttribute('class')` → 空のときだけ属性削除（h1/h2 の残余クラスを保護）

### 書式の自動引き継ぎ防止（実装完了）
見出し・ボールド・アンダーライン・文字色を設定した段落から、カーソルを別の段落に移動（クリック／矢印キー／Enterで新規段落作成など）すると、その書式が新しい段落にまで引き継がれてしまう問題を修正。
- **マーク（B/U/文字色）の引き継ぎ**: `tiptapEditor.on('selectionUpdate', ...)` で現在のブロック開始位置（`$from.before($from.depth)`）を毎回記録し、前回と異なるブロックに移動したことを検知したら `editor.view.dispatch(editor.state.tr.setStoredMarks([]))` でタイピング用の保留マーク（stored marks）をリセットする
  - ProseMirrorの`storedMarks`は「次に入力する文字に自動で乗るマーク」を指す内部状態で、これをクリアするだけで既存の文字に付いている実際のマークには影響しない（新しく入力する文字だけが地の文・デフォルト色になる）
- **見出しの引き継ぎ**: TipTapの`splitBlock`コマンドはデフォルト（`keepMarks: true`）でEnter時に同じノードタイプ（見出しならh1/h2のまま）を維持するため、見出し内でEnterすると次の段落も見出しになってしまう
  - `editorProps.handleKeyDown` で `Enter`（Shiftなし）かつカーソルが`heading`ノード内のときだけ専用処理に分岐: `event.preventDefault()` → `tiptapEditor.chain().splitBlock().setParagraph().run()` で分割後の新ノードを明示的に`setParagraph()`で地の文に戻し、続けて`setStoredMarks([])`でB/U/色の引き継ぎも防止
  - 通常の地の文同士の分割（見出みでない場合）はTipTapのデフォルトEnter処理に委ねており、`selectionUpdate`側のstored marksリセットだけで対応している

### テーマ管理
現在のテーマ一覧（`THEMES` 配列）:

| id | ラベル | スウォッチ |
|----|--------|----------|
| dark | ダーク | `#0d1117` |
| ocean | オーシャン | `#102840` |
| purple | パープル | `#1e0e3a` |
| mint | ミント | `#eaf7f2` |
| sepia | セピア | `#f5edd8` |
| light | ライト | `#f2f4f7` |
| rose | ローズ | `#fce0ec` |
| lavender | ラベンダー | `#ddd6fe` |
| coral | コーラル | `#ffd4bf` |
| gold | ゴールド | `#c9930a` |
| charcoal | チャコール | `#3a3a3c` |
| forest | フォレスト | `#0d2010` |

- **デフォルトテーマ**: `'rose'`（`getCurrentTheme()` の fallback）
- テーマ選択UIタイトル: `'テーマ色を選んでください'`
- `applyTheme(name)` の削除リストに `'gold'`, `'charcoal'`, `'forest'` を含む

## スワイプジェスチャー

### `addSwipeBack`（右スワイプ → 前の画面へ）
```js
const rawDy = e.changedTouches[0].clientY - sy; // 符号付き
const dy    = Math.abs(rawDy);
if (dx > 20 && dy < dx * 5 && rawDy > -30) onSwipe();
```
- **速度・時間判定を廃止**（旧: duration > 300ms を除外）→ **方向角度のみで判定**
- 右方向ジェスチャーは甘めに判定（`dx > 20`、角度制限を `dx * 5`）
- **上方向への移動が 30px 超の場合はスクロール操作とみなして発火しない**（`rawDy > -30`）
- エディター→カード一覧に適用（`container` レベル）
- カード一覧→ホームには **artList直接バインド版**も追加（SortableJSのバブル消費を迂回）: `dx > 30 && !isStraightDown && !isStronglyUp`（`bindParagraphSwipeEvents`と同一閾値）

### `bindParagraphSwipeEvents`（エディター内スワイプ）
```js
const isStraightDown = dy >= 80 && dx < dy * 0.2;
const isStronglyUp   = rawDy < 0 && dy > dx * 0.5; // 上成分が右成分の半分超でスクロール扱い
if (dx > 30 && !isStraightDown && !isStronglyUp) goBack();
```
- 右フリップで前の画面に戻る（閲覧モードのみ）
- `isStronglyUp` の閾値を `dy > dx * 2` → `dy > dx * 0.5` に緩和（斜め上フリップの誤発火を防止）
- 左フリップ（厳しいルール）: `dx < -50 && dy < 40` → 段落選択

### `addPullToCreate`（真下プル → 新規カード作成）
```js
// onMove: 右方向10px超で即キャンセル（右スワイプを確実に優先）
if (dx > 10) { isCancelled = true; ... }

// onEnd: 真下方向のみ（右移動10px以下 + 横ブレが縦の15%未満）
if (dy >= 80 && dx <= 10 && Math.abs(dx) < dy * 0.15) createArticle(true);
```
- 右フリップとの誤判定を防ぐため、キャンセル閾値を `20px → 10px`、判定を `0.2 → 0.15` に厳格化

## 解説パネルのカードロック（実装完了）
開発者アカウント以外は解説パネル（テンプレートの「解説」パネル）のカードを編集・削除・カット・コピー・並び替えできない。

### 判定方法
```js
function isDeveloperAccount() {
  return firebase.auth().currentUser?.email === 'kimijimasan@gmail.com';
}
function isLockedCategory(catData) {
  if (!catData) return false;
  if (isDeveloperAccount()) return false;
  return catData.locked === true || catData.name === '解説';
}
```
- パネル名が `'解説'` **または** `locked: true` フラグのいずれかでロック（OR条件、開発者は常に除外）
- `createSampleData()` で作る解説パネルには `locked: true` を明示的に付与
- `saveCurrentDataAsTemplate()`（テンプレート更新）でも `locked: true` は消えずに引き継がれる

### ロックの適用範囲（意図的に限定）
`isLockedCategory()` / `state.cardLocked` は **パネル内のカード**（編集・削除・カット・コピー・カード並び替え・ピン留めの切替）にのみ適用される。以下は意図的にロック対象外（ホーム画面のパネル自体の操作は誰でも可能）:
- **ホーム画面でのパネル並び替え**（`catSortable`, `renderHome`内）: `isLockedCategory()` を一切参照しない。ゲスト・一般ユーザーでも解説パネルをドラッグして好きな位置に移動できる
- **ピン留めカードの表示順**（`renderCategory`内 `doRender()`）: `pinned` なカードを先頭に並べる処理（`pinned.sort(...) + unpinned`）は `categoryLocked` の値に関係なく常に適用される。ロックされるのはピン留め**状態の切り替え**操作のみで、表示順序ロジック自体はロック有無で分岐しない
- 上記2点について「直っていないのでは」と感じた場合は大抵 **iPhoneのキャッシュ**（古い`app.js`を読んでいる）が原因。`index.html`の`?v=`を確認すること

### 根本的な実装：`setEditorMode()` でブラウザレベルにロック
ボタンを隠すだけでは将来の機能追加で抜け道ができるため、**`setEditorMode()` 自体**にガードを入れて、どの経路から呼ばれても編集可能にならないようにしている。
```js
function setEditorMode(mode) {
  if (mode === 'edit' && state.cardLocked) {
    showToast("このカードは編集できません");
    mode = 'view';
  }
  state.editorMode = mode;
  // mode === 'edit' のときのみ tiptapEditor.setEditable(true) が呼ばれるため、
  // ロック中は editable が絶対に true にならない
  ...
}
```
`editable: false`（=`contentEditable="false"`）はブラウザレベルの制約なので、これだけで以下がすべて自動的に不可能になる:
- テキスト入力・編集・IME変換
- ペーストによる画像挿入・YouTubeリンク挿入（ペーストイベント自体、非編集要素には配送されない）

### 多重ガード（個別の入口も明示的にブロック）
| 場所 | 内容 |
|------|------|
| `refreshYoutubeDeleteButtons()` | `state.cardLocked` なら `.para-drag-handle`（6点ドット移動ハンドル）・YouTube削除ボタンの注入自体をスキップ |
| `refreshParaSortable()` | `state.cardLocked` なら段落のSortableJSインスタンスを作成しない |
| `_insertImageBlock()` / `handleMultipleImagesForTipTap()` | 画像挿入の共通コア関数に `state.cardLocked` チェック |
| `handlePaste`（editorProps） | ロック中は貼り付け処理を一切実行しない |
| モード切替ボタン・本文タップでの自動編集モード移行 | `state.cardLocked` で早期return + トースト表示 |
| `btnDel`（カード削除）・`btnBulkCopy`・`btnBulkDelete`（一括コピー/カット） | `state.cardLocked` で早期return + トースト表示 |
| 左スワイプでの段落選択・カットバッファのタップ貼り付け | `bindParagraphSwipeEvents` 内で `state.cardLocked` チェック |
| カテゴリ一覧画面のスワイプ操作（ピン留め・複写・移動・削除）・並び替え | `renderCategory` 内の `categoryLocked`（`isLockedCategory()`で判定）でチェック |

### ロック中のUI
`applyCardLockUI()` で編集系ボタン（`btnModeToggle`, `btnDel`, `btnTextFormat`, `btnPaste`, `btnPasteCancel`, `btnAttach`, `btnAttachFab`, `btnUndo`, `btnBulkCopy`, `btnBulkDelete`）を `display:none` で非表示化。判定が非同期（Firebaseキャッシュ/読み取り）のため、確定後に `refreshYoutubeDeleteButtons('view')` / `refreshParaSortable('view')` を再実行し、確定前に注入されてしまったハンドルを確実に除去する。

## キーボード表示中の画像添付FAB（`#btnAttachFab`、実装完了）
iOSキーボード表示中、トップバー（`.editor-header`）がキーボードに隠れて`#btnAttach`（画像添付アイコン）が押せなくなる問題への対策。
- Undoボタン（`#btnUndo`）の左隣に固定配置（`.editor-attach-fab`、オレンジ）。`btnAttachFab.onclick = () => btnAttach.click()` で既存の添付処理（`fileInput.click()`）をそのまま呼ぶだけの薄いラッパー
- 表示/非表示は `updateEditorHeight()`（`visualViewport.resize`）内で判定: `keyboardVisible && state.editorMode === 'edit' && !state.cardLocked` のときのみ `display:flex`
- ロック中のカードでは `applyCardLockUI()` の非表示リストにも含めている

## 閲覧モードでの画像タップ（修正完了）
閲覧モード中、画像をタップしてもカーソルが点滅したり一覧へ戻ったりしないよう完全に無反応にしている。拡大モーダル機能（`showLightbox`）は実装済みだが呼び出しを停止中（保留）。

### 実装
`renderEditor` 内、`edEl`（ProseMirrorの親要素 `#edContent`）に**キャプチャフェーズ**でタップ関連イベントを先取りしてブロック:
```js
const blockImageTouchInViewMode = (e) => {
  if (state.editorMode !== 'view') return;
  if (e.target?.tagName === 'IMG' && e.target.classList.contains('inserted-img')) {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
  }
};
['mousedown','mouseup','click','pointerdown','pointerup','pointercancel'].forEach(t => edEl.addEventListener(t, blockImageTouchInViewMode, true));
['touchstart','touchmove','touchend','touchcancel'].forEach(t => edEl.addEventListener(t, blockImageTouchInViewMode, { capture: true, passive: false }));
```
- **重要**: タップの開始から終了に関わる全イベント種別を一貫してブロックする必要がある。`touchstart`だけ止めて`touchend`を素通りさせると、スワイプ判定用の`txStart`/`sx`が前回の別ジェスチャーの値のまま残り、`touchend`側で異常な移動量と誤認識されて`goBack()`が誤発火する不具合があった
- `setupImageDeleteButtons()` のPC用ホバー削除ボタンは `state.editorMode === 'edit'` の場合のみ表示（以前は閲覧モードでも出てしまっていた）。スマホでは編集モード中の画像タップで同様に削除ボタンを表示する `click` リスナーを追加

## 画面遷移の二重発火バグ（修正完了・重要）
**症状**: カードを右/左フリップしているうちに内容が消え、新規カード扱いになることがあった。

**原因**: `goTo()`/`goBack()` を呼ぶスワイプリスナーが、入れ子になった2つの要素（例: `container` と、その内側の `edContent`/`artList`）に重複してバインドされていた。タッチ終了イベントは内側から外側へバブリングするため、1回のスワイプで両方のリスナーが発火し、`goBack()` が2回呼ばれて `navHistory` が二重に`pop`され、`state` が想定外の画面に上書きされていた。

**修正**: `goTo()`/`goBack()` の先頭に `_isNavigating` ガードを追加し、画面遷移中（90ms間）は新たな遷移要求を無視するようにした。加えて、内側のスワイプリスナー（`bindParagraphSwipeEvents`、`artList`直接バインド版）で `goBack()` を呼ぶ際に `e.stopPropagation()` を追加し、そもそも外側へイベントが伝播しないようにした（二重の安全策）。

## 画面切り替えの体感速度改善（実装完了）

### 1. 画面遷移アニメーションの軽量化
- `#app` のフェード遷移を `opacity 0.2s + translateY(10px)` → **`opacity 0.1s` のみ**に変更
- `goTo()`/`goBack()` の画面切り替え待機時間を `180ms → 90ms` に短縮

### 2. Firebaseデータのキャッシュ
一度読んだデータをモジュール変数に保持し、再訪問時はキャッシュから即座に描画 →（裏で）ライブリスナー/`.once`で最新化。
```js
let _categoriesCache = null;        // ホーム: カテゴリ一覧
let _allArticlesCountCache = null;  // ホーム: カテゴリ別カード数バッジ
let _categoryMetaCache = {};        // カテゴリ画面: catId -> {name, color, locked?}
let _categoryArticlesCache = {};    // カテゴリ画面: catId -> 記事データ
```
- `renderCategoryGrid()`/カード一覧の`doRender()`は、直前に描画したデータと同一内容ならJSON比較で**再描画をスキップ**（点滅防止）
- 2回目以降の再描画ではエントランスアニメーション（`fadeUp`）を `no-entrance-anim` クラスで止める（初回表示だけアニメーションさせる）。これが無いと「キャッシュ表示→ライブ更新」の2回描画で画面全体が点滅して見える

### 3. TipTapエディターの事前ウォームアップ
ログイン後ホーム画面が落ち着いたタイミング（`requestIdleCallback`、フォールバック600ms）で、画面外に使い捨てのTipTapインスタンスを1回構築してすぐ破棄し、スキーマ構築等の初期化コストを先払いしておく（`warmUpTipTap()`）。エディター自体は今も画面ごとに `new Editor()` で作り直す設計のまま（常駐インスタンス再利用への変更はリスクが高いため見送り）。

## ホーム画面パネルドラッグ（`catSortable`）
- **スクロールジャンプ修正済み**: `onStart` で `grid.style.overflow = 'visible'` を設定していた行を削除
- `scroll: true, scrollEl: grid, scrollSensitivity: 60, scrollSpeed: 12` を追加（SortableJS の明示的スクロール設定）
- ドラッグ中はドラッグ開始位置を基準に追従スクロール（ページトップへジャンプしない）

## ホーム画面の全文検索（`showSearchModal`）
- 右下の虫眼鏡FAB（`#btnSearchFab`）で起動
- Firebase から全カテゴリ・全カードを並列取得 (`Promise.all`)
- `htmlToLines(content)` でHTML→テキスト行配列変換
- 結果クリック → `state.pendingScrollToParagraph` / `state.pendingSearchKeyword` をセット → エディターで3秒点滅（`blinkSearchKeyword`）

## テキスト貼り付け処理（`handlePaste`）
- 画像: 常に横取りして圧縮・挿入（縦画像は `max-height: 66vh` でiPhone画面2/3以下に表示）
- **YouTube URL（`youtu.be/`, `youtube.com/watch?v=`, `youtube.com/shorts/`）: TipTapのパスルールに委ねる**（`return false`）→ `YoutubeExtension` の `addPasteRules` が自動でノード変換
- テキスト: 常に横取りして `cleanMarkdownForPaste()` を通す
  - Markdown記法（`##`, `**`, `` ` ``, `-`, `>` 等）を除去
  - 連続する空行を最大1行に圧縮（`cleanMarkdownForPaste` 内）
  - **空行は段落として挿入しない**（`filter(l => l.trim() !== '')` でスキップ）→ GeminiやClaude貼り付け時の余分な空行を排除
- 罫線テーブル文字（`│`, `┼` 等が3つ以上）: `cleanAndFormatBorderLines()` で整形
  - 縦罫線（`│`, `├`, `└` 等）および後続の `─` を `\n` に変換（行ごとに分離）
  - 横罫線のみの行（3文字以上）は削除
  - 連続する空行は1行に圧縮

### カット後の空行詰め（修正済み）
`btnBulkDelete.onclick` で段落を削除した後、孤立した空段落（`<p></p>` / `<p><br></p>`）を一括削除してから TipTap に同期する。画像を含む段落は除外。

### 空行削除ボタン（`#btnRemoveEmptyLines`、実装完了）
エディター上部バーの💥アイコン。`btnAttach`の左隣に配置。テキスト・画像・YouTubeのいずれも含まない`<p>`（`<p></p>` / `<p><br></p>` / 空白・nbspのみ等）をカード全体から一括削除する（h1/h2、画像入り段落、YouTube埋め込みを含む段落は対象外）。
- 判定: `p.querySelector('img, [data-youtube-video]')` があれば除外、`textContent`を nbsp→半角スペース変換後に `trim()` して空でなければ除外
- タップ時に `confirm('編集画面の空行をすべて削除します。\nよろしいですか？')` で確認（OK/キャンセル）
- ロック中のカード（`state.cardLocked`）では他の編集系ボタンと同様 `applyCardLockUI()` で非表示
- 削除前のHTMLを `lastDeletedContent` に保存するため、Undoボタン（`#btnUndo`）で復元可能
- DOM直接操作 → `getCleanPMHTML()` 経由で `tiptapEditor.commands.setContent()` に同期（`btnBulkDelete`と同じパターン）

## 画像レイアウト

### 縦画像（`portrait-img`）・横画像（`landscape-img`）のクラス付与
- `compressImageForLayout(file)` で `isPortrait` を判定
- `_insertImageBlock` 経由で `<img class="portrait-img" ...>` or `<img class="landscape-img" ...>` を挿入
- TipTap の `CustomImageExtension` が `class` 属性を per-image で保持・復元

### CSS レイアウト
```css
/* 縦画像（単独・グループ共通の基準サイズ） */
img.inserted-img.portrait-img {
  width: calc(50% - 2px);
  max-height: 66vh;
  display: block;
}

/* 横画像 */
img.inserted-img.landscape-img {
  width: 100%;
  max-height: none;
}

/* 縦画像を含む段落 → flex で自動2列レイアウト（枚数問わず） */
.editor-content p:has(> img.portrait-img) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.editor-content p:has(> img.portrait-img) > img.inserted-img.portrait-img {
  flex: 0 0 calc(50% - 2px);
  width: calc(50% - 2px);
  max-height: 66vh;
  border-radius: 8px;
}
```

- 1枚: 50%幅で左寄せ
- 2枚: 各50%で横並び（flex で自動）
- 3枚: 上段2枚・下段1枚
- 4枚: 2×2グリッド
- `:has(> img.portrait-img)` を使用（子要素の枚数に関係なく適用）

### `preprocessHTMLForTipTap` でのクラス保持（重要）
Firebase から読み込んだHTMLを `setContent` に渡す前処理:
- `<img>` の `contenteditable` 属性と `inserted-img` クラスは除去
- **`portrait-img` / `landscape-img` クラスは保持する**（除去すると再表示時にレイアウトが崩れる）
- テキストと画像が混在する `<p>` を分割する際、**連続する `portrait-img` は同一 `<p>` に保持**（グループを維持）

## stripTrailingEmptyP の実装
```js
function stripTrailingEmptyP(html) {
  const stripped = html.replace(/(<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>)+$/, '');
  return stripped || '<p></p>';
}
```
- 末尾の空段落（`<br>`バリアント含む）を除去
- `getCleanEditorHTML()` / `forceSaveEditorContent()` / `setContent`後の後処理で使用

## 画像段落の空行削除で発生するRangeError対策（2026-06-20、再発防止の保険として実装）
**症状**: 画像の直後の空段落を削除しようとした際に `tiptap.bundle.js` 内で `RangeError: Position out of range` が発生することがある。

**対応箇所**: 画像段落に隣接する空行削除に関わる3箇所すべてに try-catch を追加し、根本原因（ProseMirrorの位置計算が環境依存でズレるケース）を完全に特定できなくても、エラー発生時にアプリが赤いエラー画面で固まらず安全に復帰できるようにした。
1. **Backspace処理**（`editorProps.handleKeyDown`、画像段落の直後の空段落でBackspaceを押した時）: 直前段落の画像判定を「1枚だけ」から「画像のみで構成される段落（複数枚グループも含む）」に拡張した上で、`deleteCurrentNode()` + `setTextSelection()` のチェーンを try-catch。失敗時は `showToast('エラーが発生しました')` → `goBack(true)` でカード一覧へ復帰
2. **閲覧モードでの末尾空段落自動削除**（`onUpdate` 内、画像段落の直後の末尾空段落を自動で消す処理）: `tr.delete()` の dispatch を try-catch（自動処理のため失敗時はトーストなしで握り潰すのみ）
3. **💥空行削除ボタン**（`#btnRemoveEmptyLines`）: 全体を try-catch。失敗時は `showToast('エラーが発生しました')` → `goBack(true)` でカード一覧へ復帰

いずれも `goBack(true)`（`skipSave=true`）で戻ることで、壊れた可能性のある状態のまま再保存を試みて二次被害が起きないようにしている。

## ログイン画面の一瞬の映り込み対策・第二段（2026-06-20、`#authOverlay` 常時最前面オーバーレイ）
`authStateReady()` による根本対策（上記「ログインフラッシュ修正」参照）を入れた後も、ごく短時間のログイン画面の映り込みが報告されたため、二重の安全策として**画面遷移そのものを裏側に隠す**オーバーレイを追加した。

### 実装
- `index.html`: `#app`・`#modal-root` と同じ階層に `#authOverlay`（`class="auth-overlay"`）を**静的HTML**として配置。中身は従来の `.splash-screen`（アイコン+ロゴ+ドット）。JSの実行を待たずに最初の描画から存在するため、JS実行前の空白フラッシュも防げる
- `style.css`: `.auth-overlay { position: fixed; inset: 0; z-index: 999999; opacity: 1; transition: opacity 0.3s ease; }` / `.auth-overlay.auth-overlay-hidden { opacity: 0; pointer-events: none; }`
- `app.js`: `DOMContentLoaded` 内で `#app` に splash HTMLを動的挿入する処理を削除（静的化したため不要）。`onAuthStateChanged` 内で `goTo('home')` / `goTo('login')` を呼んだ直後に `revealAppAfterAuth()` を呼ぶ
  ```js
  function revealAppAfterAuth() {
    const overlay = document.getElementById('authOverlay');
    if (!overlay) return;
    setTimeout(() => {
      overlay.classList.add('auth-overlay-hidden');
    }, 250);
  }
  ```
  - `goTo()` の画面切り替え（90ms待機 + opacity 0.1sトランジション）が完全に終わるのを待ってからオーバーレイをフェードアウトするため、ログイン画面⇄ホーム画面の入れ替わりは常にオーバーレイの裏側で完結し、ユーザーには見えない

### 第三段（2026-06-20、ログインボタン押下時の映り込み対策）
第二段の対策後も「ログインボタンを押した直後に1秒ほどログイン画面が映り込む」という報告があった。原因は、`revealAppAfterAuth()` が**起動時の初回判定のみ**を想定しており、ボタン押下時にはオーバーレイが既にフェードアウト済み（非表示）だったこと。そのため、Googleポップアップが閉じた後 `isPremium`/`categories` をFirebaseから読む間（直列で2回読むため〜1秒程度）、何もオーバーレイで覆われずログイン画面が素のまま見え続けていた。
- `renderLogin()` 内の `btnGoogleLogin.onclick` / `btnGuestLogin.onclick` の**冒頭**（`signInWithPopup`/`signInAnonymously` を呼ぶ前）で `showAuthOverlay()` を呼び、オーバーレイを即時再表示する
  ```js
  function showAuthOverlay() {
    const overlay = document.getElementById('authOverlay');
    if (!overlay) return;
    overlay.style.transition = 'none';   // CSSのopacity 0.3sトランジションでうっすら見えるのを防ぐ
    overlay.classList.remove('auth-overlay-hidden');
    void overlay.offsetWidth;            // 強制リフローでスナップ表示を確定
    overlay.style.transition = '';
  }
  ```
- 成功時はそのまま `onAuthStateChanged` の `user` 分岐 → `goTo('home')` → 既存の `revealAppAfterAuth()`（250ms後にフェードアウト）に委ねる
- **失敗時（ポップアップブロック以外のエラー・ゲストログイン失敗）**は `hideAuthOverlayNow()` で待機なしに即フェードアウトし、エラーメッセージをすぐ見せる
- **`auth/popup-blocked` 等で `signInWithRedirect` にフォールバックする場合**はページがまるごとリダイレクトで離脱するため、オーバーレイを隠す処理は行わず `return` する（リダイレクト復帰後は起動時フローの第二段対策がそのまま適用される）

## Undoボタン（#btnUndo）の動作
- **表示条件**: 編集モード中は**常に表示**
- **active/inactive**: `lastDeletedContent !== null` → 通常、`=== null` → `.inactive`（opacity 0.35）
- **`lastDeletedContent` をセットする箇所**: 画像挿入前 / 段落カット前 / YouTube削除前 / PC画像削除前

## ファイル構成
```
index.html          — エントリポイント（app.js?v=891, style.css?v=722, tiptap.bundle.js?v=8）
app.js              — アプリ全体（約5,900行）
style.css           — スタイル
tiptap.bundle.js    — TipTapバンドル（IIFE）
manifest.json       — PWA設定（start_url/scope: /howto-v2/）
storage.rules       — Firebase Storageセキュリティルール（deploy --only storage で反映）
firebase.json       — Hosting設定＋CSPヘッダー＋storageルール参照
.nojekyll           — GitHub Pages Jekyll無効化
.gitignore          — .tiptap-build/node_modules/ を除外
```

## キャッシュバスティング（重要）
`index.html` の `?v=NNN` をインクリメントすること。iPhoneは古いキャッシュを長く保持する。
- `style.css?v=723`
- `tiptap.bundle.js?v=8`
- `app.js?v=892`

## テスト
- ローカルサーバー: `serve.bat`（port 8080）または `python -m http.server 8080`
- テスト用アカウント: `kimijimasan+test@gmail.com`
- 開発者アカウントの制限解除: Firebase Console で `users/{uid}/isPremium: true` を設定

## 直近の対応（2026-07-19）

- **決済成功モーダルの表示遅延解消＋再表示保証（app.js?v=892・style.css?v=723、本番デプロイ済み）**: 実ユーザーから「決済後 `?payment=success` で戻ってからモーダル表示まで長すぎ、その間に画面を触って迷子になる」との報告。本番実測（Playwright+CDPスロットリング）で、実購入者の経路（`pending_payment_uid`あり）はモーダル表示まで通常回線1.7秒・低速モバイル回線（1.5Mbps/RTT150ms）**10.9秒**と確認。内訳はスクリプト一括DL（約2.5MB）＋**起動時の `await db.set(isPremium)` がApp Checkトークン交換→reCAPTCHA読込→RTDB接続を直列に待っていた**こと。対応3点:
  - **① isPremium付与の非await化**: 起動時の書き込みを `.catch()` 付きバックグラウンド実行に変更（失敗時に `pending_premium_grant` へ退避する既存の保険はそのまま）。モーダル表示が書き込み完了の人質にならなくなり、低速回線で「スクリプト読込完了+5.5秒」→「+0.1秒」、通常回線1.7秒→0.3秒に短縮。App Check交換が失敗し続ける環境では旧コードはモーダルが**永遠に出ない**ことも確認（localhostのデバッグトークン未登録時に再現）
  - **② スプラッシュに処理中案内**: `?payment=success` のときだけ index.html のインラインスクリプトが「決済を確認しています。そのままお待ちください…」（`.splash-status`）を即時表示（app.jsのDL完了を待たない。低速回線では画面描画できた約3.9秒時点で出る）
  - **③ モーダル再表示保証（`payment_modal_pending` フラグ）**: 従来は起動直後に `history.replaceState` でURLパラメータを消すため、背景タップで誤って閉じると**二度と表示できず**購入者が迷子になっていた。起動時にlocalStorageへフラグを立て、**Googleログイン（非匿名）確定までは起動のたびにモーダルを再表示**。ログイン確定（onAuthStateChanged非匿名／モーダル内同一アカウント再ログイン経路）でフラグ除去。Googleログイン済みのまま決済から戻った人にはモーダルの代わりにお礼トースト（モーダル経由ログインの「ログイン完了！」トーストとは `pending_premium_grant` の有無で二重表示ガード）
  - **検証（ローカルChrome/Playwright、全PASS）**: 背景タップで閉じる→素のURLで再訪→再表示（2回繰り返し）／フラグ除去後は非表示／書き込み拒否時の保険退避がモーダル表示後のバックグラウンドで実行／通常起動（決済と無関係）でモーダル・文言・フラグとも出ない回帰確認。**未検証**: 実Googleログインでのフラグ除去（ヘッドレスでは不可、実機で「閉じる→再表示→Googleログイン→以後出ない」を確認のこと）
  - **懸念メモ**: (1) ヘッドレス計測では本番App Checkトークン交換が常に**403**だった（bot判定の可能性が高いが、**enforcement有効化前にConsoleのApp Checkモニタリングで実ユーザーの合格率を必ず確認**。実ユーザーも403なら強制化で全滅する）(2) ブログの「購入済みなのに使えない方」リンクを踏んだ未購入者もGoogleログインするまで毎起動モーダルが出る（実害小、気になれば表示回数上限を後付け）(3) isPremium読み取りと背景書き込みの順序はRTDBの同一クライアント内順序保証＋3系統の保険でカバー
- **解説パネルのロックを「パネル単位」から「カード単位」に再設計（app.js?v=891、本番デプロイ済み。v890の作成禁止方式をユーザー指示で置き換え）**: 正規ログインユーザーから「解説パネルで新規作成したカードが削除できない」との報告（信用問題）。根本原因は、ロック判定（`isLockedCategory`）が**パネル単位**（名前「解説」or `locked:true`、開発者以外に一律適用）で、**テンプレート由来カードとユーザー新規作成カードを区別していなかった**こと。ロック中パネルにカードが入った瞬間からそのカードも編集・削除不可になり詰んでいた。
  - **方式: `userCreated: true` フラグ**。ユーザー操作で作られるカード全経路（`createArticle`／`duplicateArticle`の複製データ／`mergeSelectedCards`の連結カード／新パネル初期カード／空パネル自動補充3箇所（renderCategory・deleteArticleById・showMoveModal）／**カード移動時**（`{...artData, userCreated: true}`で移動先に付与））に付与。テンプレート由来カードにはフラグが無い（`copyTemplateToUser`はスプレッドコピーだが元データに無し、`saveCurrentDataAsTemplate`は明示フィールドのみコピーでフラグ混入なし）ため、**ロック中パネルでは「フラグ無しカード＝テンプレート由来」だけを保護**する
  - **判定箇所（2箇所）**: ①カード一覧のスワイプ操作（ピン留め・複写・移動・削除）: `const artLocked = categoryLocked && art.userCreated !== true` を各ハンドラで使用 ②エディター: ロックIIFE内で、`state._isNewCard` なら即ロック解除、それ以外はカードデータの `userCreated` を1回読んで判定（`state.cardLocked`）。`duplicateArticle` は関数内でも対象カードのフラグを確認（テンプレートカードの複写のみ禁止）
  - **v890からの変更**: `createArticle`のパネル単位作成ブロック・＋FAB非表示・移動先リストからの解説除外は**撤回**（ユーザー方針: 解説パネルでも自分のカードは作成・編集・削除とも完全に自由）。残置: `isLockedCategoryId(catId)`ヘルパー／空カード救済削除（`isEmptyCardContent`、フラグ導入前に作られた詰みカード用。`artLocked && !isEmptyCardContent` のときのみ削除ブロック）／パネル名「解説」の予約ガード（開発者以外は新規・改名で使用不可。フラグ無しの既存カードが自己ロックされる罠防止）
  - **注意**: v891より前に解説パネルへ作られてしまった既存の詰みカードはフラグが無いため保護対象のままだが、編集不可だった以上必ず空なので空カード救済削除で消せる。カード並び替え（artSortable）と連結モードはロック中パネルでは従来どおりパネル単位で無効のまま（テンプレートカードと混在操作になるため意図的に維持）
  - **検証（ローカルChrome・ゲスト+isPremium模擬・v891）**: 解説で新規作成→`userCreated:true`保存・自動編集モード進入・内容入力保存・**中身ありでもスワイプ削除成功**／テンプレートカードはスワイプ削除・ピン留め・複写（DB変更なし・トースト、showToastラップで確認）・エディター編集（`cardLocked:true`・editable false）すべてブロック維持／別パネル→解説へ移動でフラグ付与・移動後も削除可／非ロックパネル回帰なし／アプリ起因コンソールエラーゼロ。テストデータ全削除済み。**トースト検証の注意**: showToastはキュー式で順次表示のため、連続操作直後のbody.textContent検査は偽陰性になる（ラップして呼び出しログで判定すること）

## 直近の対応（2026-07-18）

- **ゲスト作成制限を実在数カウント方式に変更（完了・本番デプロイ済み、app.js?v=889）**: ゲストログインで「制限の有無が感じられない」との報告を受け調査。根本原因は2つ: ①テンプレートが3パネル・14カードに拡大されていたが、旧方式（累計カウント）ではテンプレート由来のパネル/カードがカウント対象外だったため、追加でさらにパネル3つ・カード7枚まで作成でき、実質6パネル・21カードまで使えていた ②開発者アカウント（`kimijimasan@gmail.com`）でテストすると `isDeveloperAccount()=true` で制限が一切かからない
  - **変更内容**: 「累計カウント方式（`stats/panelsCreated`・`stats/cardsCreated` に加算、削除しても減らない）」を廃止し、「実在数カウント方式（その時点で実際に存在するパネル数・カード数で判定、削除すれば枠が空く）」に変更。テンプレート由来かユーザー作成かを区別しない
  - **新しい上限**: パネル総数3つ（`FREE_PANEL_LIMIT=3`）・1パネルあたりカード6枚（`FREE_CARDS_PER_PANEL_LIMIT=6`）。ヘルパー関数 `getActualPanelCount()` / `getActualCardCount(catId)` を新設
  - **旧関数の整理**: `getCreatedCount()` は削除。`bumpCreatedCount()` は同期回数制限（`syncCount`）でのみ使用していたため `bumpSyncCount()` にリネーム
  - **検証（ローカルChrome・ゲスト）**: 見本のまま（3パネル）→パネル作成で制限にかかる（`actualPanelCount=3 >= FREE_PANEL_LIMIT=3`）／パネル1つ削除後→1つだけ作成可能（2<3で許可、作成後3>=3で再ブロック）／6枚パネルへのカード追加→制限にかかる（`actualCardCount=6 >= FREE_CARDS_PER_PANEL_LIMIT=6`）／4枚パネル→あと2枚だけ追加可能／開発者アカウントでは `isCreateLimitedUser()=false` で無制限（変更なし）

## 直近の対応（2026-07-17）

**セッション概要**: ①Ctrl+クリック段落選択の不具合修正（v884）②カード内画像の外部アプリへのドラッグ&ドロップ書き出し（v885→886で試行錯誤→v887のStorage方式で解決）③画像保存のFirebase Storage移行（新規挿入分・バケット有効化・storage.rulesデプロイ）④画像カーソルのgrab/grabbing対応（v888）。**最終状態: 本番はapp.js?v=889・style.css?v=722を配信済み、GitHubのmainと一致**。積み残し: 実装項目「4.」の内容が未受領（ユーザーのメッセージが途中で切れていた）／画像・カード削除時のStorage孤児ファイル削除連動は未実装／実マウスでの外部アプリへのドロップ最終確認・カーソル見た目確認は未報告

- **カード内画像のカーソルをgrab/grabbing対応に変更（app.js?v=889・style.css?v=722、ローカル検証済み・本番デプロイ済み）**: 画像ホバー時=パーの手（`cursor: grab`、旧`zoom-in`を置換。拡大モーダルは保留中の機能のため）、押下中=`:active`でグー（`grabbing`）、ドラッグ中=`:active`だけではブラウザ外D&D中に反映されないことがあるため、dragstartで`#edContent`に`.img-dragging`を付与し `.editor-content.img-dragging img.inserted-img { cursor: grabbing !important }` で明示切替、dragendで除去してパーに復帰。**クラスは`<img>`自体ではなくPM管理外の`#edContent`に付ける**（imgのclass属性はCustomImageExtensionがper-imageで保存するため、自動保存のタイミング次第で一時クラスがFirebaseに永続化される危険がある）。検証: 通常grab／dragstart後grabbing＋クラス付与／dragend後grab＋クラス除去／段落は通常カーソル・段落ドラッグではクラス非付与／保存HTMLへの`img-dragging`混入なし
- **画像保存をFirebase Storage方式へ移行（新規挿入分のみ・app.js?v=887・index.htmlにstorage-compat SDK追加、Storage有効化・ルールデプロイ・E2E検証・本番デプロイまで完了）**: 外部アプリへのドラッグ書き出し（DownloadURL方式）は http/https の実URLでないと機能しない（blob:はレンダラープロセス紐付きで解決不能、data:も実機で機能しないことがv885/886で判明）ため、新規画像はStorageに保存してhttpsダウンロードURLをsrcに使う方式へ変更。
  - **実装**: `uploadImageToStorage(dataUrl)`（`users/{uid}/images/{timestamp}-{rand}.jpg` にput→getDownloadURL）と `prepareImageForInsert(file)`（圧縮→アップロード成功時のみsrcをhttpsに差し替え）を新設。挿入の全入口（`handleMultipleImagesForTipTap`/`handleImageForTipTap`）を `prepareImageForInsert` 経由に変更。RTDBの`content`にはhttps URL入りHTMLが保存される（base64はcontentに残らない）
  - **フォールバック設計（重要）**: アップロード失敗（Storage未有効化・オフライン・タイムアウト10秒）時は従来どおりdata:URLのまま挿入するため機能停止しない。SDK既定のリトライ2分は長すぎるため `setMaxUploadRetryTime/setMaxOperationRetryTime(7000)` に短縮し、失敗後60秒間はアップロード試行自体をスキップ（`_storageCooldownUntil`）。実測: 初回失敗9.3秒→クールダウン中の挿入は約1秒
  - **後方互換**: 既存のbase64画像は`<img src>`としてそのまま表示される（表示側の分岐は不要）。既存画像の自動移行はしない。ドラッグ書き出しはsrcがhttp(s)の場合のみDownloadURLを付与（拡張子はURLパス部から推定、jpeg→jpg）。data:の場合はコンソールに「旧形式のため非対応」とログを出すのみ（エラー表示なし）
  - **検証（ローカルChrome・ゲスト）**: 画像挿入→アップロード失敗→data:フォールバック挿入OK／クールダウン動作OK／dragstart分岐（data:→DownloadURLなし+ログ、https(Storage URL形式)→`image/jpeg:crossmemo-image-*.jpg:https://...`が完全なURL（token含む）で付与、.png拡張子推定もOK）／アプリ起因エラーなし。テストで挿入した画像はカードから除去済み
  - **Storage有効化完了（2026-07-17・ユーザーがConsoleで実施）＋ルールデプロイ済み**: バケット`torisetu-234c3.firebasestorage.app`が有効化された（404→403に変化を実測確認）。当初はルール未設定（ロックモード）で`storage/unauthorized`だったため、**`storage.rules`をリポジトリに新規作成**し`firebase deploy --only storage`でデプロイ（`firebase.json`に`"storage": {"rules": "storage.rules"}`を追加、hosting ignoreにも追加）。ルール内容: `users/{uid}/images/{fileName}`に本人のみread/create/update（2MB上限・image/*のみ）/delete可。**以後ルール変更はConsoleではなく`storage.rules`を編集して`firebase deploy --only storage`で行うこと**
  - **有効化後のエンドツーエンド検証（ローカルChrome・ゲスト・全パス）**: 画像挿入→Storageアップロード→トークン付きhttps URLがsrcに使用（挿入1.9秒）→表示OK／dragstartでDownloadURLに完全なStorage URL付与／保存→カード開き直しでURL維持・再表示OK／**ブラウザ外プロセス（PowerShellのcurl＝OSのドロップ処理相当）からトークンURLで200・image/jpeg・正しいJPEGバイト列のダウンロード成功**／`refFromURL().delete()`によるStorage削除もルール上動作。テストデータはカード・Storageとも削除済み。CSPは変更不要（connect-srcの`https://*.googleapis.com`がカバー、img-src `https:`許可済み）
  - **未解決の検討事項**: 画像削除・カード削除時にStorage上のファイルが孤児として残る（削除連動は未実装）。ゲストuidのままStorageに保存した画像はGoogleアカウント昇格（linkWithPopup=uid維持）後もそのまま有効
- **画像ドラッグ書き出しのDownloadURLをblob:からdata:URL直渡しに修正（app.js?v=886）**: v885の実機テストで「ドラッグアニメーションは出るがドロップ先に実データが渡らない」ことが判明。原因は **blob: URLがレンダラープロセス紐付きのため、ドロップ時にファイル化を行うブラウザプロセス／OS側から解決できない**こと。画像srcは元々data:URL（自己完結・プロセスをまたいで解決可能）なので、Blob変換を廃止してsrcのdata:URLをそのまま `DownloadURL` に渡す方式に変更（コードも簡素化、blob URLキャッシュ削除）。合成dragstartで閲覧・編集両モードともURL部=画像srcそのもの・PMのclearData後も残存を確認済み。**データサイズ懸念**: 本アプリの画像は800px/JPEG0.75圧縮（base64で概ね100〜300KB想定）。この規模のdata:URLのDownloadURLは一般に動作するが、実機で大きい画像のドロップが失敗する場合は代替案（`dataTransfer.items.add(File)`方式等）を検討すること
- **カード内画像を外部アプリ（ワープロ等）へドラッグ&ドロップで書き出せるようにした（app.js?v=885→886・style.css?v=721。⚠️v885のblob:方式・v886のdata:方式とも実機の外部ドロップでは実データが渡らず、最終的にv887のStorage https URL方式で解決。本エントリはドラッグ開始側の実装記録として有効）**:
  - **根本原因（なぜ今までドラッグできなかったか）**: ①CSS `.inserted-img { -webkit-user-drag: none }`（iOS誤作動防止コメント付きだがChromium全般に効く）が全モードでネイティブ画像ドラッグを禁止 ②閲覧モードでは `blockImageTouchInViewMode` が画像上の mousedown/pointerdown を preventDefault し、ドラッグ開始自体が不可能だった。画像srcは `data:image/jpeg` URL のためそのままドラッグできても外部アプリはファイルとして受け取れない
  - **修正内容（4点）**: ①CSSのドラッグ禁止を `@media (pointer: coarse)`（タッチデバイス）限定に変更（PCマウスはドラッグ許可、iPhoneは従来どおり禁止）②`blockImageTouchInViewMode` でマウス押下（`mousedown` / `pointerType==='mouse'` の `pointerdown`）のみ preventDefault をスキップ（stopPropagation は継続＝タップ→編集切替等の誤作動防止は維持。タッチ系は全ブロックのまま）③`#edContent` に**バブル段**の dragstart リスナーを追加し、data:URL を Blob URL に変換（img要素単位でキャッシュ・再利用）して `dataTransfer.setData('DownloadURL', 'image/jpeg:crossmemo-image-<timestamp>.jpg:<blobURL>')` を付与 — **キャプチャ段では不可**（編集モードではProseMirrorのdragstartハンドラが `dataTransfer.clearData()` を呼ぶため、PM処理後のバブル段で付与する必要がある。実測で `text/html,text/plain,downloadurl` の共存を確認）④編集モードの paraSortable に `filter: 'img.inserted-img'` + `preventOnFilter: false` を追加（選択段落内の画像から始まるドラッグはSortableに拾わせずネイティブドラッグ優先。`preventOnFilter:false` が無いとSortableのpreventDefaultでネイティブドラッグが死ぬ）。閲覧モードの段落並び替えは元々 `handle: '.para-drag-handle'`（⠿）限定のため画像と競合しない
  - **検証（ローカルChrome・合成イベント）**: 閲覧モード=マウス押下の既定動作維持・タッチpointerdownブロック維持・画像クリックで編集モードに切り替わらない（回帰なし）・`-webkit-user-drag: auto`（PC）／dragstartでDownloadURL正常付与（blob URLをfetchして761バイト・image/jpegを確認、2回目ドラッグでblob URLキャッシュ再利用）／編集モードでもPMのclearData後にDownloadURL残存／Ctrl+クリック段落選択の回帰なし・アプリ起因のコンソールエラーゼロ
  - **実機テストの結果**: 実マウスでの外部ドロップは「ドラッグアニメーションは出るが実データが渡らない」ことが判明（blob:はプロセス間で解決不能、data:も不可）→ v887のStorage https URL方式で解決。なお `DownloadURL` はChromium独自形式（エクスプローラー等へのファイルドロップ用）で、ワープロ系はブラウザ既定の text/html／FileContents 経由で受け取る想定

- **カード一覧のCtrl+クリック（スワイプメニュー）が発火しない問題を修正＋編集モードからのCtrl+クリック段落選択に対応（app.js?v=884、ローカルChrome検証済み・実機確認済み・本番デプロイ済み 2026-07-17）**: 「編集画面のCtrl+クリック段落選択が動かなくなった」との報告を受けて調査。
  - **実測で確定した根本原因**: artSortable/catSortableは `forceFallback: true` かつ `delayOnTouchOnly: true`（＝マウスは遅延ゼロ）のため、マウス押下で即Sortableのドラッグ追跡が始まり、押下中にわずかでも `mousemove` があると（`fallbackTolerance`未設定＝閾値0px）ドラッグ扱いになる。この場合Sortable 1.15は **mouseupをpreventDefaultし、直後のclickをdocumentキャプチャハンドラで握り潰す**（preventDefaultトレーサで `Sortable.min.js の _onDrop` と documentハンドラのスタックを実測確認）。カード一覧のCtrl+クリック処理は2箇所とも `click` イベント依存（2026-06-23実装）だったため一切発火しなくなっていた。通常クリックでのカード/パネルオープンも同条件（クリック中に1px以上の手ブレ）で握り潰されるため「クリックしてもカードが開かないことがある」潜在バグでもあった
  - **エディター側の段落選択（閲覧モード）はv883時点でも正常動作**（実クリックで確認。v883の `ctrlPointerDownBlocker` がSortableへの伝播を遮断しているため）。**編集モードでは元々機能しない**ことも実測確認（ProseMirrorが編集可能時にDOM同期で `para-selected`/チェックspanを即巻き戻す。イベントログ上もmousedown直後に段落内DOMが再描画）。両画面のハンドラの直接競合（同一要素への二重登録）は無し — 画面が別DOMなので「奪い合い」ではなく、共通原因がSortableJSだった
  - **修正内容（4点）**: ①カード一覧のCtrl+クリックを `click` 依存から**エディターと同じ「`pointerdown`キャプチャでstopPropagation（Sortable遮断）＋`mousedown`キャプチャでトグル」の2段構え**に変更（li単位で登録、`.swipe-action-btn` は除外、`.article-inner` のonclickはCtrl時ガードのみ残し二重トグル防止）②artSortable/catSortableに **`fallbackTolerance: 3`** を追加（3px未満の手ブレをドラッグ扱いにしない→通常クリックの握り潰し解消）③エディターの `ctrlClickHandler` で `state.editorMode === 'edit'` なら **`window._setEditorMode('view')` で先に閲覧モードへ切り替えてから選択**（選択系機能はすべて閲覧モードの選択が前提のため整合）④`editor.onkeydown` の `cleanupAllSwipedParagraphs` を修飾キー単独（Control/Meta/Shift/Alt）ではスキップ（Ctrl押下のオートリピートで選択が消えるのを防止）
  - **検証（ローカルChrome・ゲスト）**: カード一覧Ctrl+クリックON/OFF/排他切替・メニュー内ボタン操作・通常クリックでカードオープン（旧v883で握り潰された「同座標mousemove付き」イベント列でも開く）／エディター閲覧モードCtrl+クリック選択・解除・2段落複数選択・Ctrlキーオートリピートで選択維持／編集モードCtrl+クリック→自動で閲覧モード＋選択（1.2秒後も巻き戻りなし）／閲覧モード通常クリック→編集モード移行（回帰なし）、コンソールエラーゼロ。**注**: 検証セッション途中でブラウザ拡張の実クリック入力が環境的に死んだため、根本原因の特定までは実クリック、v884の動作検証は実クリックと同一イベント列（pointerdown→mousedown→同座標mousemove→pointerup→mouseup→click）の合成ディスパッチで実施。実機（実マウス）での最終確認はユーザーが実施済み（2026-07-17）
  - **デプロイ済み**: 実機確認後、`firebase deploy --only hosting:crossmemo` 実行・本番（crossmemo.web.app）にv884配信を確認済み（2026-07-17）

## 直近の対応（2026-07-15）

- **Ctrl+クリック選択の副作用「段落が空白の点線枠になりレイアウトが下に押し出される」を修正（app.js?v=883、ローカルChromeで検証済み）**: 下記v882の修正後、Ctrl+クリックで選択はできるものの段落の中身が空白になる不具合が報告された。
  - **原因**: SortableJS 1.15はマウス操作を`pointerdown`で拾うため、v882時点の`ctrlClickHandler`（`mousedown`キャプチャで`stopPropagation`）では**Sortableへのジェスチャー伝播を遮断できていなかった**。Ctrl+クリック（特にドラッグ気味の操作や⠿ハンドル付近）がSortableのドラッグ準備・開始として処理されると、段落に`sortable-chosen`/`sortable-ghost`クラスが付き、ジェスチャーが中断される（`ctrlClickHandler`の`preventDefault`がネイティブdragstartを殺す等）とクラスが**残留**する。`style.css`の`.sortable-ghost * { visibility: hidden !important }`（ドラッグ中のプレースホルダー表示用）により、残留した段落は「中身が空白・点線枠・高さ維持」＝報告どおりの見た目になる。**v882以前はこの残留が起きても直後の編集モード切替（タップ→編集）の`cleanupAllSwipedParagraphs`とPM再描画で毎回掃除されていた**ため顕在化せず、v882で閲覧モードに留まるようになったことで永続化するようになった
  - **修正（2段構え）**: ①`bindParagraphSwipeEvents`に`pointerdown`のキャプチャリスナー（`ctrlPointerDownBlocker`）を追加し、Ctrl/Cmd押下時は`stopPropagation`でSortable/ProseMirrorにジェスチャー開始を一切渡さない（`preventDefault`はしない——すると後続のmousedown/click自体が生成されず選択トグルが死ぬ）。`cleanupNativeParagraphListeners`にも解除処理を追加 ②`toggleParagraphSelect`の冒頭で対象段落から`sortable-ghost`/`sortable-chosen`の残留クラスを除去（自己修復。ドラッグ中はCtrl+クリック自体が不可能なため正常なドラッグ表示には影響しない）
  - **検証（ローカルChrome・ゲスト・実クリック）**: `sortable-ghost`を意図的に残留させて症状（空白点線枠・子要素visibility:hidden・レイアウト押し下げ）を画面再現→Ctrl+クリックで自己修復（クラス除去＋選択ON＋中身復元＋閲覧モード維持）を確認。修正前に「選択2段落が全ワイプされる」ことを確認済みのCtrl+ドラッグ（ハンドル上）シナリオが、修正後は選択維持・ghost残留ゼロ・段落順序無傷になることを確認。選択/解除/複数選択/通常クリック→編集モード移行の回帰なし・コンソールエラーゼロ
- **閲覧モードのCtrl+クリック段落選択が動かなくなっていた問題を修正（app.js?v=882→883、ローカルChromeで検証済み）**: PC用のCtrl/Cmd+クリック段落選択（`para-selected` トグル、スマホの左スワイプ相当。`57b71f3`・2026-06-21実装）が機能していなかった。
  - **原因**: 実装当初は `.ProseMirror` へのバブリング段階の `click` リスナーで、`stopPropagation()` により外側 `#edContent` の「本文タップ→編集モード自動切替」ハンドラへの伝播を止めていた。その2日後の `a3b0bb3`（2026-06-23）で「ProseMirrorにclickが消費される」対策としてリスナーを **`mousedown`（キャプチャ）に変更**したが、`mousedown` での `stopPropagation()` は別イベントである `click` の発生を止めないため、Ctrl+クリックのたびに ①mousedownで選択ON → ②直後のclickがタップ→編集切替ハンドラ（Ctrlチェックなし）に届き `setEditorMode('edit')` → ③その中の `cleanupAllSwipedParagraphs()` が選択を即解除、という流れで「一瞬付いて消える」状態になっていた
  - **修正**: `#edContent` のタップ→編集モード自動切替ハンドラ（`renderEditor`内）の冒頭に `if (e.ctrlKey || e.metaKey) return;` を追加（Ctrl+クリックは段落選択ジェスチャーなので編集モードへ移行させない）。`mousedown` キャプチャ化自体はProseMirror対策の意図があるため変更していない
  - **検証（ローカルChrome・ゲスト・実クリック）**: 閲覧モードでCtrl+クリック→選択ON（オレンジ点線ハイライト＋赤チェック＋🚀/コピー/カットボタン出現、`contenteditable=false`維持・編集モードに切り替わらない）／再Ctrl+クリック→解除（チェックspanも残らない）／2段落同時選択可／通常クリック→従来どおり編集モード移行（回帰なし）をすべて確認。コンソールエラーなし（拡張機能由来のメッセージチャネルエラーのみ）
- **閲覧モードへの画像ドロップで自動的に編集モードへ切り替えて挿入する機能を追加（app.js?v=881、実機での外部ドラッグは未検証）**: 従来は閲覧モード（`editable=false`）だと画像ドロップが受け付けられなかった（ProseMirrorは `editable=false` のとき drop イベントの処理自体をスキップし `editorProps.handleDrop` が呼ばれないため、ブラウザ既定動作で画像が新規タブで開いていた）。
  - **実装**: `renderEditor` 内で `edContent` に素のDOM `dragover`/`drop` リスナーを追加（`blockImageTouchInViewMode` 登録の直後）。編集モード中は早期returnして従来の `editorProps.handleDrop` に完全に委ねる（二重処理なし）。閲覧モードで画像を含み得るドラッグ（types に `Files` または `text/html`）なら `dragover` を `preventDefault`（これが無いと閲覧モードでは drop 自体が発火しない）し、drop 時に `setEditorMode('edit')` → 成功していればドロップ位置にカーソルを移して `handleMultipleImagesForTipTap()` で挿入
  - **既存ガードとの整合**: モード切替は既存の `setEditorMode('edit')` をそのまま呼ぶため、カードロック（トースト表示・挿入なし）と同期回数制限（`consumeSyncQuota`、上限時はモーダル表示・挿入なし）が自動的に働く。切替後に `state.editorMode === 'edit'` を確認してから挿入
  - **エディタ内発ドラッグへの不干渉**: 閲覧モードでも段落並び替え（SortableJSはネイティブDnD使用）が動くため、`edContent` 上の `dragstart`/`dragend` でフラグ（`_internalDragFromEditor`）を立てて除外。なお閲覧モードの画像自体のドラッグは既存の `blockImageTouchInViewMode` が mousedown を止めるため発生しない
  - **リファクタ**: `handleDrop` 内の画像抽出ロジック（`dt.files` の画像フィルタ＋ text/html 内 data:image URL 抽出）をモジュールレベルの共通ヘルパー `extractDroppedImageFiles(dt)` に切り出し（`dataUrlToImageFile` の直後に定義）、新リスナーと共用。`handleDrop` 内の到達不能だった閲覧モード分岐（「編集モードにすると〜」トースト）は削除
  - **検証（ローカルChrome・ゲスト、合成DragEventによる）**: ①閲覧モードに data:image 入り text/html をドロップ→編集モード自動切替＋画像挿入＋既定動作抑止 ②編集モードでのドロップ→従来の `handleDrop` 経路で+1枚のみ（二重挿入なし）③テキストのみのドロップ→閲覧モード維持・挿入なし・案内トースト ④ロックカード（解説）へのドロップ→閲覧モード維持・挿入なし・「このカードは編集できません」トースト、をすべて確認。コンソールエラーなし（拡張機能由来のメッセージチャネルエラーのみ）。**実機（スクショトリマー→閲覧モードのカード）での最終確認は未実施（ユーザー確認推奨）**
- **外部アプリからの画像ドラッグ中に編集モードが解除されるバグを修正（app.js?v=880、実機での外部ドラッグは未検証）**: スクショトリマー等の外部アプリから画像をドラッグしてカードに落とそうとすると、事前に編集モードにしていてもドロップ前に閲覧モードへ戻ってしまい、画像が新規タブで開いてしまう問題。
  - **根本原因**: 編集モードでエディターにフォーカスがある状態から外部アプリへ操作を移すと、**ブラウザウィンドウ全体の非アクティブ化に伴ってエディターの `blur` が発火**し、300ms後のタイマー（iOSキーボード「完了」用の閲覧モード自動復帰）が `setEditorMode('view')` を実行。`editable=false` になるとProseMirrorは drop イベントの処理自体をスキップするため（`editorProps.handleDrop` は `view.editable` が false だと呼ばれない）、ブラウザ既定動作で画像がページとして開かれていた
  - **修正**: モジュールレベルに `_windowInactive` フラグを追加（`window` の `blur`/`focus` イベントで更新。要素のblurはバブリングしないため、ウィンドウ自身のアクティブ切替でのみ発火する）。blur→閲覧モード復帰タイマーの中で `_windowInactive` なら復帰をスキップ。これにより「ページ内でフォーカスが外れた」（iOS完了ボタン等→従来どおり閲覧モードへ）と「ウィンドウごと非アクティブ」（アプリ切替・外部ドラッグ中→編集モード維持）を区別する
  - **検証**: ローカル（Chrome・ゲスト）で①window blur + 要素blur後600msでも `contenteditable=true` 維持（修正の効果）②window アクティブのまま要素blurのみ→600msで `contenteditable=false`（既存のiOS完了動作の回帰なし）③コンソールエラーゼロ、を実ブラウザで確認。**実機での外部アプリドラッグ→ドロップの最終確認は未実施（ユーザー確認推奨）**

## 直近の対応（2026-07-11）

- **Firebase App Check導入（モニタリングモードのみ・enforcementは未有効化、app.js?v=875）**: 100kin-blogで採用した方式と同じ「サイトキー空文字ガード付き」構成をcompat SDKで実装。保護対象はRealtime DatabaseとAuthentication。
  - `index.html`: `firebase-app-check-compat.js`（10.12.0、他のcompat SDKと同バージョン）の`<script>`タグを`firebase-database-compat.js`の直後に追加
  - `app.js`: `firebase.initializeApp()`直後・`firebase.database()`取得**前**に初期化コードを追加（App Checkは他のFirebaseサービス利用開始前に有効化する必要があるため。firebaseConfigがapp.js側にあるので、100kin-blogの`firebase-config.js`に相当する位置）。定数 `APP_CHECK_SITE_KEY = ""`（**現在は空文字＝初期化スキップ状態**）。reCAPTCHA v3サイトキーをFirebase Consoleで発行したらこの定数に貼り付けて`firebase.appCheck().activate(APP_CHECK_SITE_KEY, true)`（第2引数=トークン自動更新）が動く設計
  - **localhostデバッグトークン**: `location.hostname`が`localhost`/`127.0.0.1`のとき`self.FIREBASE_APPCHECK_DEBUG_TOKEN = true`を`activate`より前に自動セット。初回アクセス時にコンソールへ出力されるトークンをFirebase Console > App Check > アプリ > デバッグトークンに登録して使う
  - `firebase.json` CSP: reCAPTCHA v3用に`script-src`と`frame-src`へ`https://www.google.com`を追加（`www.gstatic.com`は既存許可、App Checkトークン交換先`content-firebaseappcheck.googleapis.com`は既存の`https://*.googleapis.com`でカバー済み）
  - 検証: ローカル（Chrome）でサイトキー空文字状態の起動を確認（コンソールエラーゼロ・ホーム画面正常描画・`firebase.appCheck`関数のロード確認）。**サイトキー設定後の実動作（reCAPTCHA読み込み・トークン取得・CSP違反ゼロ）は未検証**——キー設定・再デプロイ後に実ブラウザで`securitypolicyviolation`とApp Checkメトリクス（Firebase Console）を確認すること
  - **残タスク**: ①ユーザーがFirebase ConsoleでreCAPTCHA v3アプリ登録＋サイトキー発行 ②`APP_CHECK_SITE_KEY`に貼り付けて再デプロイ ③モニタリング期間（1〜2週間目安）でメトリクス確認 ④問題なければConsole側でRTDB/Authのenforcement有効化
- **App Checkサイトキー設定・本番有効化（同日・app.js?v=876）**: 上記残タスク①②を実施。ユーザーがFirebase Consoleで発行したreCAPTCHA v3サイトキー（`6LdGYE0t...`）を`APP_CHECK_SITE_KEY`に設定して本番デプロイ。**モニタリングモードのまま（enforcement未有効化）**。残タスクは③メトリクス確認（1〜2週間）→④enforcement有効化

## 直近の対応（2026-07-09）

- **ゲストサインアウト確認モーダルの本文を修正（完了・本番デプロイ済み、app.js?v=874、`showGuestSignoutModal()` 内 `app.js:5741`）**: 旧文言「100円でアップグレードすると無制限で使えます。」だけでは、なぜサインアウトが必要なのか（Googleログインには一度ログオフが要る）が伝わらないとの指摘。「Googleアカウントでログインするには、一度ログオフする必要があります。データを引き継ぎたい場合は、先に「100円でアップグレード」をご検討ください。」に変更。見出し「サインアウトするとゲストデータが失われます」は変更なし。文章量が増えたため、ローカルでモーダル高さ（449px、ウィンドウ内に収まりボタンとの間隔も崩れないことを実測）を確認済み
- **PC活用促進バナーを再設計（完了・本番デプロイ済み、app.js?v=873・style.css?v=720）**: 「小さい版がパネルカードに埋もれて見えない」「大きい版に切り替わらない」という2件の実機報告を受け、まず実際にローカルでパネル数3枚/7枚を再現して`showLarge`判定・DOM・z-indexを検証した。
  - **判明した根本原因**: ①「大きい版に切り替わらない」問題は判定ロジックのバグではなく、2026-07-08の全面変更（コミット`20ab06c`）で"見出し+本文の大きいカード"自体が廃止され、大小どちらも`height:36px`の1行ピルに統一されていたため、大きい版に切り替わっても見た目上「大きく」ならなかったのが真因。②「小さい版が埋もれる」問題はz-indexの階層自体は正しかった（`elementFromPoint()`で検証済み）が、背景が`rgba(96,165,250,0.08)`という8%の半透明のみだったため、下の明るいパネルカードの色が透けて文字が読めなくなっていたのが真因
  - **大きい版（パネル3枚以下）**: 廃止されていたカードデザインを復活。濃い紫背景(`#4c1d6e`)+黄色太枠(`#fbbf24`、3px)、見出し「💻 PCでも同じ画面が見られます」+本文「PCのブラウザで crossmemo.web.app と入力してみてください」+✕ボタン。高さは検索FAB(50px)の約4倍＝200px、横幅は左右FABの外端に揃え、FAB行の上に重なる形で配置（`positionPcPromoBannerLarge()`新設）。本文は長文用に`text-align:left`＋`align-self:stretch`（stretchが無いと flexアイテムが文字幅に縮んでcenter同然になるため必須）
  - **小さい版（パネル4枚以上）**: 半透明背景を廃止し、大きい版と同じ濃い紫+黄色太枠の不透明背景に変更。2行表示「PCでも同じ画面が見られます」/「crossmemo.web.app」
  - **検証**: ゲストテストアカウントのRTDBに一時的にダミーパネルを追加/削除し、パネル3枚（大きい版）・7枚→オレンジ系カード直上での5枚（小さい版）の両方をスクリーンショットで確認。z-indexは`elementFromPoint()`でバナー自身が最前面に来ることを再確認、✕ボタン/タップ再展開の動作も確認
  - **既知の制約**: ローカル検証環境は`window`のresizeが実ビューポートに反映されないため、実測できた画面高さは545pxまで（本来のiPhone幅相当が再現できない）。この条件だと大きい版カードがパネル3枚目の下部に重なって見えるが、実寸で計算するとパネル3枚の合計高さ約330pxに対し大きい版カードの上端は画面下端から約284pxのため、画面高さ614px以上（iPhone SE級667pxでも該当）あれば重ならない計算。**実機での最終見た目確認は未実施（推奨）**

- **PC活用促進バナーをFABと同じ行の隙間に収める配置に全面変更（完了・本番デプロイ済み、app.js?v=871・style.css?v=717）**: 実機確認で「バナーが独立した別行として画面下部に追加され、画面が縦に伸び余白が無駄になっている」との指摘。左下FAB（ファイル/ブログ）・右下の検索FABは同じ`bottom:1.5rem`の行に`position:fixed`で並んでいるため、バナーもその「間」に収めるよう再設計した。
  - **デザイン変更**: カード形式（見出し+本文+✕、`.pc-promo-large`）と2行の控えめ表示（`.pc-promo-small-line1/2`）を廃止し、単一行のピル型（`.pc-promo-pill`）に統一。大きい版「💻 crossmemo.web.appでも見られます」+✕ボタン、小さい版「💻 PCでも見られます」（タップで一時展開）。パネル数に応じた大小の出し分け・✕での永続クローズ・タップでのトグルは従来ロジックを維持
  - **配置の仕組み**: 左下FABはログイン種別（ファイル/ブログ）で幅が異なる（44px/約83px）ため、固定値ではなく`positionPcPromoBanner()`（`app.js:944〜951`）が実際のFAB位置を`getBoundingClientRect()`で読み取り、両FABの隙間（8pxの余白付き）に収まるよう`left`/`right`を動的に設定。`.pc-promo-banner`自体は`position:fixed; bottom:1.5rem; height:36px`でFABと同じ行に固定（`style.css:466〜`付近）
  - **検証**: ローカル環境はwindow resizeが実ビューポートに反映されないため、`#app`を`position:relative`・FABを`position:absolute`に一時的に切り替える手法で実機と同等（430px幅）の座標関係を再現。左下FABが幅広なゲスト条件（より厳しい条件）でも、バナーが両FABの間に約8px前後の隙間を保って収まり、垂直方向の余分な行が増えていないことを確認
- **PC活用促進バナーの小さい版を2行化・文言変更（完了・本番デプロイ済み、app.js?v=870→871・style.css?v=716→717で上記に置き換え）**: 実機確認で2件のフィードバックがあり対応。
  - **小さい版の2行化**: 「💻 PCでも見られます（crossmemo.web.app）」の1行→「💻 PCでも同じ画面が見られます」／「crossmemo.web.app」の2行に変更（`app.js:956〜961`、新規`.pc-promo-small-line1`/`.pc-promo-small-line2`、`style.css:518〜532`付近）。左右FABの間の余白を活かすため、フォントサイズも拡大（0.82rem→1行目0.92rem/2行目0.88rem）。`.pc-promo-banner`の`margin-bottom`（FABとの重なり回避の余白）はバナー自身の高さと独立した固定値のため、2行化でバナーが縦に伸びてもFABとの隙間（検索FAB:12px、左下FAB:22px）は変化しないことを実測で確認
  - **「パネル3枚でも小さい版が表示される」報告の調査**: `panelCount`の判定ロジック（`<=3`）・カウント方法（`cats.length`、テンプレート由来も含めた素直な子要素数）とも問題なし。`pc_promo_dismissed`を書き込む箇所も✕ボタンの1箇所（`app.js:952`）のみで、コード上のバグは見つからなかった。実機側で過去に✕を押した操作がlocalStorageに残っていたことが原因と推定（ローカルでフラグをクリアした状態では、パネル3枚で正しく大きい版が表示されることを確認済み）。実機での解消は、Safariの「Webサイトデータ」削除または`localStorage.removeItem('pc_promo_dismissed')`で確認可能
- **PC活用促進バナーとFABの重なりを解消・フォントサイズ拡大（完了・本番デプロイ済み、style.css?v=715→716で追加修正）**: 下記「PC活用促進バナーを追加」実装を実機iPhone Safariで確認したところ、バナーが右下の検索FAB・左下のファイル/ブログFAB（いずれも`position:fixed`）と重なり、本文後半が隠れる不具合が発覚。修正内容:
  - **根本原因**: `.screen-home`は`height:100dvh`の縦flexで`.category-grid`が`flex:1`のため、`.pc-promo-banner`（`style.css:466〜`）は常に画面最下端に接する位置に来る。一方FABは`bottom:1.5rem`・最大高さ50px（`.search-fab`）で画面下端から24px〜74pxの帯を常時占有しており、この帯とバナーが重なっていた
  - **修正**: `.pc-promo-banner`に`margin-bottom: calc(1.5rem + 50px + 0.75rem)`（=86px、FABオフセット+最大高さ+ゆとり）を追加。px/rem固定値の計算のため画面幅に依存せずどの端末でも成立する。水平paddingも`0.75rem→1.25rem`に拡大（防御的対応）。併せて見出し・本文のフォントサイズを拡大（見出し`0.85rem→0.92rem`、大きい版本文`0.78rem→0.85rem`、小さい版`0.75rem→0.82rem`）
  - **検証**: ローカルで`getBoundingClientRect()`による幾何学的検証を実施し、バナー下端とFAB上端の間に12px（検索FAB）・22px（ファイルFAB）の隙間を確認。本番デプロイ後、配信されたCSSに修正が反映されていることを`curl`で確認済み。**実機での最終見た目確認はユーザー対応待ち**
- **PC活用促進バナーを追加（完了・本番デプロイ済み、app.js?v=870・style.css?v=714→715で上記修正）**: `#btnShowQR`（QRコードボタン）が`.btn-pc-only`でPC限定表示のため、スマホユーザーはPC版が使えることに気づく機会がなかった問題への対応。スマホ表示のホーム画面下部（`#pcPromoBanner`、画面下部固定・スクロールに追従しない帯）に案内を追加。
  - **表示場所**: `app.js:816〜886`付近の`renderHome`内、`#catGrid`と`#btnSearchFab`の間に器を配置。`renderCategoryGrid()`の両分岐（カテゴリ0件/あり）から新設の`renderPcPromoBanner(panelCount)`を呼び出す形（`app.js:929〜962`付近）
  - **大小の出し分け**: パネル数3枚以下（`PC_PROMO_PANEL_THRESHOLD`）は見出し＋説明文＋✕ボタンの大きいカード、4枚以上またはクローズ済みは1行の控えめな表示。3枚という閾値は、テンプレート初期状態（3パネル）とゲストのパネル上限（`FREE_PANEL_LIMIT=3`）を踏まえて設定
  - **状態管理**: ✕クローズは`localStorage.pc_promo_dismissed='1'`でブラウザ単位（uid非依存）に永続化。小さい版タップでの再展開は`_pcPromoExpanded`というクロージャ変数によるセッション限りの一時トグルで、localStorageは変更しない（次回読み込みではクローズ済み状態から開始）
  - **デザイン**: QRコードモーダル（`app.js:5558〜5564`）と同じ青系トーン（背景`rgba(96,165,250,0.1)`、見出し`#60a5fa`、本文`#93c5fd`）を再利用し、アプリ内の「情報提供トーン」の色を統一
  - **CSS**: `.pc-promo-banner`は既存の`.btn-mobile-only`（`style.css:274〜281`）と同じ600pxブレークポイントで、スマホ幅（max-width:600px）でのみ`display:block`
  - **検証状況**: ブラウザ自動化環境の制約でウィンドウリサイズが実ビューポート幅に反映されず、狭いビューポートでの見た目そのものは確認できなかった。PC幅（1177px）で`display:none`となること、CSSのメディアクエリ記法が正しいことはJS経由で確認済み。JSロジック（大小の閾値判定・✕クローズでの永続化・小さい版タップでの一時トグル）は`!important`でメディアクエリを一時上書きするテスト専用スタイルを注入し、パネル4枚（小さい版）・パネル3枚境界値（大きい版）の両方で動作確認済み。**実機スマホでの最終見た目確認は未実施（ユーザーが実機で確認予定）**
- **QRコードモーダルの案内文言を修正（完了・本番デプロイ済み、app.js?v=869、`showQRCodeModal()` 内 `app.js:5558〜5564`）**: `#btnShowQR`（ホーム画面ヘッダー、`.btn-pc-only` によりPC表示時のみ出現）から開くQRコードモーダルの警告文を調査・修正。
  - **調査で判明した事実**: QRコードは `window.location.href`（現在表示中のURL）をそのままエンコードしているだけで、ログイントークン・セッションID・UID等の認証情報は一切含まれない。画面遷移はJSのstate管理でURL自体は変化せず、`history.replaceState` の2箇所（`app.js:6116`, `6137`）も`?payment=success`等のパラメータを除去するのみで付加はしない。したがって通常表示時のQRは常に単純な `https://crossmemo.web.app/` のみをエンコードする。用途は「PCでQRコードを表示し、スマホのカメラで読み取って同じ画面をスマホで開く」（`.btn-pc-only` がPC限定表示であること、モーダル内の「スマホで表示されない原因」警告文の内容と整合）
  - **旧文言の問題**: 「このQRコードはあなた専用のFirebase同期URLです。他人に読み取られないよう十分に注意してください！」という、実態（トークンを含まない単なる公開URL）より厳しい警告になっていた
  - **修正内容**: 見出しを「⚠️【厳重注意】」（赤系配色）→「💡【ご案内】」（青系配色）に変更、本文を「このQRコードをスマホのカメラで読み取ると、同じ画面をスマホでも開けます。パスワード等の情報は含まれていません。」に差し替え
  - ⚠️ **中間バージョンの誤り（訂正済み）**: 初回修正時は「このQRコードをPCで読み取ると、同じ画面をPCでも開けます」という誤った向き（PC→PC）の文言でいったん実装したが、ユーザー指摘により`.btn-pc-only`の実装とモーダル内警告文を再確認し、正しい向き（PC表示→スマホ読み取り）に訂正した。commit履歴には最終版のみが反映されている
  - ローカル・本番（crossmemo.web.app、PC幅表示）の両方でモーダル表示・DOM検証（見出し・本文テキスト・色）を確認済み
- **authDomainをcrossmemo.web.appに変更（完了・本番デプロイ済み、app.js?v=868）**: モバイルで `signInWithRedirect` がサイレント失敗する問題（下記調査記録参照）の根本対応。
  - 変更: `app.js` の `authDomain` を `torisetu-234c3.firebaseapp.com` → `crossmemo.web.app`、`firebase.json` のCSP `frame-src` に `'self'` 追加（旧ドメインの許可は移行期間用に残置。GCPのOAuthクライアント登録も旧エントリは削除していないため、ロールバックは `app.js` 1行戻し＋デプロイのみ）
  - 事前確認: GCPコンソールでOAuthクライアントに `https://crossmemo.web.app` (JS生成元) / `https://crossmemo.web.app/__/auth/handler` (リダイレクトURI) を登録済み。APIレベルで反映を外形検証（`createAuthUri` で実際の認可URLを生成→Googleがエラーなしでサインインページを返す。未登録URIでは `redirect_uri_mismatch` が返ることも対照確認）。`/__/auth/handler`・`/__/auth/iframe` は crossmemo.web.app で200配信済み、かつ firebase.json のカスタムヘッダー（X-Frame-Options等）は予約パス `/__/*` には適用されないことも実レスポンスで確認済み
  - 検証: ローカル（Chrome）で新authDomain経由の `signInWithPopup` を実ログインで完走（`siro.usertest@gmail.com`、ポップアップに「crossmemo.web.appに移動」表示→ログイン成功→ホーム遷移→isPremium反映）。本番デプロイ後、v=868配信・既存ログインセッション維持（再ログイン不要）・CSP違反ゼロを確認
  - **残検証（推奨）**: 実機iPhone Safariで「ポップアップブロックON→redirectフォールバックが実際に成功する」ことの確認（本変更の主目的。PCでは再現できないため実機でのみ検証可能）
  - ⚠️ 検証中の注意: 長時間開きっぱなしの自動化タブでRTDB接続が切断されたまま復帰せず、ログイン後処理（isPremium読み込み）が止まる現象があった。アプリの不具合ではなく検証環境要因（Chromeのタブフリーズ）。タブを開き直せば正常
- **購入済みユーザー向け問い合わせ導線を追加（完了・本番デプロイ済み、app.js?v=867）**: ログイン画面（`renderLogin`、ゲストボタンの下）と同期回数制限モーダル（`showLimitModal`、閉じるボタンの下）に「ご購入済みなのに反映されない方はこちら」の控えめなテキストリンクを追加。リンク先は100kin-blogの問い合わせページ `https://apps100kin.web.app/contact.html`（Firestore `inquiries` に保存される本番稼働フォーム。管理画面 `admin/inquiries.html` で確認可能）。静的アンカー（`target="_blank" rel="noopener"`）のみでJS処理なし。ローカル・本番の両方で表示とcontact.htmlへの遷移を確認済み。決済がisPremium付与に反映されなかったユーザーの受け皿（恒久対応③-(a)。根本対応のWebhook自動付与③-(b)は未実施）
- **決済成功モーダルの空画面詰みバグ修正（完了・本番デプロイ済み、app.js?v=866）**: 実ユーザーから「購入してログインを選んだが、課金はできたがログインができない」との問い合わせを受け調査。`?payment=success` 起動分岐が `return` で `onAuthStateChanged` の登録ごとスキップしていたため、**モーダルの背後が完全な空画面**になり、①背景タップでモーダルを閉じた ②ポップアップログインに失敗した（閉じた・ブロック等）場合に何も操作できない詰み状態になっていた。修正内容:
  - 早期returnを廃止し、通常の起動フローで背後にホーム/ログイン画面を描画した後（`goTo` → `revealAppAfterAuth` 直後、初回発火のみ）にモーダルを表示するフラグ方式へ変更
  - ログイン失敗時（`popup-closed-by-user` 等）は**モーダルを自動再表示**して再試行可能に
  - モーダル内のisPremium付与・テンプレートコピー・ホーム遷移は `onAuthStateChanged`（`pending_premium_grant` 保険）に一本化（onAuthStateChangedが登録されるようになったため、従来のインライン処理を残すとテンプレート二重コピー等の二重実行になる）。ただし**同一アカウントへの再ログインでは onAuthStateChanged が再発火しないことがある**ため、popup成功時のuidが直前のuidと同じ場合のみインラインで付与＋`goTo('home')` する保険を追加
  - 検証: ローカル（Chrome・テストアカウント）で「背景タップで閉じる→背後のホーム画面が操作可能」「popup-closed失敗→モーダル再表示・保険フラグ残存」「同一uidログイン成功→ホーム遷移・isPremium反映・フラグ除去」「通常起動が無影響（コンソールエラーゼロ）」を確認。本番（crossmemo.web.app/?payment=success）でもv=866配信・モーダル+背後画面描画・閉じる動作を確認済み。テストで付与したisPremiumは検証後に除去済み
  - **未検証**: 未ログイン状態でのモーダル表示（ログイン画面が背後に出る側。コードはログイン済み側と対称）と、実Googleポップアップでの成功/redirectフォールバック
- **モバイルでログインできない問題の調査（原因候補の特定・恒久対応は未実施）**: 上記問い合わせの調査で、空画面詰みの他に以下の構造的問題を特定。
  - **`signInWithRedirect` がモバイルで機能しない可能性大**: authDomain（`torisetu-234c3.firebaseapp.com`）とアプリ配信ドメイン（`crossmemo.web.app`）が**クロスオリジン**のため、Safari ITP / Chrome M115+ のサードパーティストレージ分割でリダイレクト認証がサイレントに失敗する（Firebase公式の既知問題）。popup がブロックされた端末では popup→redirect の両方が失敗し「何度ログインしてもログイン画面に戻る」状態になる
  - 恒久対応方針（未実施）: authDomain を `crossmemo.web.app` に変更（app.js 1行 + firebase.json CSPの `frame-src` に `'self'` 追加 + **GCPコンソールでOAuthクライアントに `https://crossmemo.web.app/__/auth/handler` のリダイレクトURI追加が必須**。忘れるとGoogleログイン全滅・ロールバックはapp.js 1行戻し）。既存ログイン済みユーザーへの影響なし（セッションはアプリオリジンのIndexedDB保存のためre-login不要）
  - アプリ内ブラウザ（LINE等のWebView）では Google OAuth 自体が拒否される（`disallowed_useragent`）。これは対応不能で案内が必要
  - 救済手段: モーダルのログインボタンを一度でも押していれば `pending_premium_grant` が残るため同じブラウザで後からログイン成功時に自動付与。それ以外は `?payment=success` を手動で開いてもらう（※誰でも無料でisPremiumを取れる抜け道でもあるため案内は個別に）か Firebase Console で手動付与

## 直近の対応（2026-07-06）

- **「画像を入れた後の再編集」で画像がすり替わる/消えるバグの根本修正（app.js?v=865、実機未検証）**: 既知問題「画像→文章の順なら問題ないが、画像を入れた後に再編集すると不具合が起きることがある」の根本原因を特定し修正。
  - **根本原因**: iOS Safari は contenteditable 内の `data:` 画像URLを `blob:` URLに勝手に変換する。保存時の `restoreOriginalSrcs()` がこれを元に戻す際、「カード読み込み時に記録した `origDataUrls` 配列を blob の**出現順に先頭から当てはめる**」インデックス方式だったため、読み込み後に画像を途中挿入・削除・並べ替え・カットすると対応がズレ、**別の画像にすり替わる**か **blob: のまま保存されて次回開くと画像が消えていた**（blob URLはセッション限りで無効になるため）。上から順に編集/最後に追加だけなら順序が保たれるため発症しなかった。Safariでのみ発症（Chromeはblob変換をしない）
  - **修正内容**: ①`_blobToDataUrl`（Map）を新設し、カード読み込みの `setContent` 直後に「パースに渡したHTMLのimg src列」と「DOM上の実際のimg src列」を位置対応で突き合わせて blob→data: の**厳密な対応表**を記録（`registerBlobMappingsFromDom` + `extractAllImgSrcs`。枚数不一致時は誤対応を避け登録しない）②`restoreOriginalSrcs` は対応表で復元し、表に無い blob は表示中の `<img>` から canvas 再エンコード（JPEG 0.85、`reencodeBlobImgToDataUrl`）で復元 ③どちらも不能なら誤った画像に差し替えるより安全側で blob のまま残す（影響はその1枚のみ）。再setContentによる二重blob変換も対応表の連結で追跡
  - Node.jsシミュレーション8ケース（変更なし/先頭削除/並べ替え/途中挿入/二重変換/枚数不一致/非Safari素通し + 旧方式のバグ再現）全パス。テスト手順: 「画像入りカードを開く→途中に画像挿入・削除・並べ替え→保存→開き直し」で画像が正しく残ることを確認する
  - **検証状況（2026-07-06、本番デプロイ済み）**: 1回の実機テストでは「まあまあ」との結果。ただし長年解決できなかった不具合のため、まだ「解決した」と断定せず、**引き続き注意深く検証を続ける方針**。今後の実機使用で不具合が再発したら、症状（すり替わり/消失/その他）と直前の操作を記録して再調査すること
  - **ユーザー向け案内文（画像編集時の注意事項）は現時点では追加しない**。複数回の実機使用で問題が再発しないことを確認してから、案内文の要否を再判断する
- **貼り付けMarkdownの太字を実際にスタイル適用（完了、app.js?v=864）**: 従来の`cleanMarkdownForPaste()`は見出し（`##`→H2）以外のMarkdown記法（太字含む）を記号だけ除去してプレーンテキスト化していたが、太字（`**text**`/`__text__`）だけは実際に`<strong>`装飾されるよう変更。
  - `cleanMarkdownForPaste()`内で太字を`\x02text\x03`マーカー（見出し用`\x01`と同様の内部マーカー、行の`\n`分割・空行圧縮・引用番号除去等の後処理を通過しても壊れない）に置換するよう変更（従来は`$1`で即座に記号除去していた）
  - 新設: `escWithBoldMarkers(text)`（`esc()`の直後に定義）——`\x02`〜`\x03`区間を`<strong>${esc(...)}</strong>`に変換しつつ、それ以外のテキストは通常通り`esc()`でエスケープするヘルパー
  - `handlePaste`内のHTML組み立て（見出し/段落生成部分）で`esc(cleanedLine)`を`escWithBoldMarkers(cleanedLine)`に置き換え
  - イタリック・コード・リスト記号・引用・取り消し線は従来通り記号のみ除去してプレーンテキスト化（変更なし）。画像貼り付け・YouTube・罫線テーブル整形（`cleanAndFormatBorderLines`）は別経路のため無影響
  - Node.jsでロジックを抽出したシミュレーションで、見出し単独／太字単独／見出し+太字混在／複数太字／他Markdown記号除去／HTMLタグの誤混入（`<script>`等）を含む太字テキストのエスケープを検証済み。既存の実機テスト（TipTap上でのペースト動作）は未実施——次回実機（Chrome/iPhone）で確認すること
  - 既存のtiptap-markdown等の拡張機能導入は見送り：見出し・記号除去は既存の自前実装（画像貼り付け横取り・YouTube・罫線テーブル整形と統合済み）で十分要件を満たしており、バンドル（`.tiptap-build/entry.js`→esbuild再ビルド）を変更するコストに見合わないため

## 直近の対応（2026-06-28）

- **カード内容が別カードに置き換わるバグの根本修正（完了）**: `setTimeout`内の遅延処理（カット処理500ms、デバウンス保存1000ms）で`state.articleId`を直接参照していたため、遅延中に画面遷移が発生すると別カードに保存されるバグがあった。処理開始時に`articleId`/`categoryId`をキャプチャし、遅延処理実行時に一致確認→不一致なら処理中断するよう修正
- **Gemini貼り付け時のMarkdown自動除去（実装済み）**: `cleanMarkdownForPaste()`関数で太字（`**text**`）、水平線（`---`）等を自動削除。NotebookLMの引用番号`[1]`等も同様に除去。**見出し行（`#`〜`######`）はH2タグに変換して挿入**（テキスト内の他のMarkdown記法は除去してからH2化）
- **ゲストユーザーへのアナウンス統一（完了）**: 全ての制限ダイアログ・ログアウト確認を「100円でアップグレードすると無制限で使えます。」に統一。ログアウト確認ダイアログのボタンも「100円でアップグレード」に変更
- **ファイルアプリボタン追加（完了）**: パネル一覧画面左下に📁ボタン（赤背景・白CSSフォルダアイコン）を追加。正規ログインユーザーのみ表示。`shareddocuments://`でiPhoneのファイルアプリを開く
- **100kin-blog画像配置修正（完了）**: トップページに4枚（IMG_9266〜9270）、詳細ページに6枚（IMG_9271〜9277）を配置。`.nojekyll`追加で404エラー解消

## 直近の対応（2026-06-27）

- **YouTube削除ボタンをNodeView方式から動的生成方式に戻す（完了）**: NodeView方式ではiPhone SafariでYouTube動画が表示されない（空の四角い枠のみ）問題が発生。元の`@tiptap/extension-youtube`を使い、`refreshYoutubeDeleteButtons()`で動的に削除ボタンを追加する方式に戻した。`data-yt-del-btn`属性で重複を防止
- **カード連結機能実装（完了）**: カード一覧トップバーに「連結」ボタンを追加。連結モードに入るとチェックボックス（32px、紫）が表示され、2枚以上選択して「連結」タップで確認ダイアログ→新規カードに内容を結合。関連関数: `enterMergeMode()`, `exitMergeMode()`, `mergeSelectedCards()`, `showMergeConfirmDialog()`
- **トップバーダブルタップでトップスクロール（完了）**: カード編集画面のトップバー（`.editor-header`）をダブルタップすると`edContent.scrollTop = 0`でカード先頭にスクロール。iOSステータスバータップの代替機能。300ms以内の連続タップを検知
- **100kin-blogにスクリーンショット追加（完了）**: `images/`フォルダに10枚のスクリーンショットを追加し、`app-detail.html`の絵文字プレースホルダーを実際の画像スライドショーに変更。`STATIC_SLIDES`配列で静的に管理（Firestore非依存）

## 直近の対応（2026-06-26）

- **起動時自動エクスポート機能を完全削除（完了）**: `autoExportOnStartup()`関数と起動時の呼び出し（`setTimeout`）を削除。手動エクスポート（ホーム画面ヘッダーのボタン→`exportAllPanels()`）は元のまま残存
- **パネル色選択カラーパレット整理（完了）**: 色系統別・グラデーション順に再配置（30色）
- **カード内容消失バグの根本修正（完了）**: `_contentLoaded`フラグを導入し、Firebaseからのコンテンツ読み込み完了前は一切保存しないように修正
- **新規カード1行目Enter時にパネル一覧に戻る問題（完了）**: 自動H1処理で古いドキュメント参照を使っていたためRangeErrorが発生しグローバルエラーハンドラーが`goTo('home')`を呼んでいた。`setTimeout`内で最新のドキュメントからfirstNodeを再取得し、try-catchでエラーを握りつぶすよう修正
- **画像削除ボタンをTipTap NodeView方式に移行（完了）**: 動的DOM追加でモード変更のたびに増え続ける問題を根本解決
  - `.tiptap-build/entry.js`に`addNodeView()`を追加
  - 画像ノードと削除ボタンをセットでレンダリング
  - CSSで`.ProseMirror.mode-edit .img-del-btn-static { display: flex }`により編集モード時のみ表示
  - グローバル関数`window._showToast`/`window._setLastDeletedContent`を公開
- **編集モード時のProseMirrorにmode-editクラス追加（完了）**: `setEditorMode('edit')`で`mode-view`を削除するだけで`mode-edit`を追加していなかった問題を修正
- **キーボード表示時のクリップアイコン（FAB）表示改善（完了）**: TipTapのfocus/blurイベント、setEditorModeからも`updateEditorHeight()`を呼び出すよう修正

## セキュリティ（XSS対策、2026-07-03整理・強化）

ユーザー入力の表示は以下の3層で防御。**新しい表示処理を書くときは必ずこの規約に従うこと**:

1. **テキスト補間は `esc()`（app.js）を通す**: パネル名・カード名・プレビュー・検索結果・エクスポート等、テンプレートリテラルでHTMLに埋め込む文字列は全て `${esc(...)}`。`&<>'"` をエンティティ化する
2. **保存済みHTML（カード本文）の解析は `parseHTMLInert()` を使う**: `DOMParser` の不活性ドキュメントでパースするため、`<img onerror>` 等がパース時に実行されず画像読み込みも起きない。`document.createElement('div') + innerHTML` は**解析用途では使用禁止**（パース時点でonerrorが発火し得る）。適用箇所: `htmlToLines` / `extractThumbnails` / Markdown除去の正規化 / `preprocessHTMLForTipTap` のimg分割
3. **本文の画面表示はTipTap/ProseMirrorのスキーマ経由**: `setContent` はスキーマ定義済みのノード・属性以外（scriptタグ、on*イベント属性等）を落とすため、実質サニタイザーとして機能する

その他: インラインの `onclick="fn('${変数}')"` は属性注入になるため禁止（`addEventListener` で束縛。添付ファイルカードで2026-07-03に修正済み）。RTDBルールにより他ユーザーのデータは読めないため、保存型XSSの影響範囲は自アカウントに限定される（`templates/default` の書き込みは開発者メールのみ）。

### HTTPセキュリティヘッダー（`firebase.json` の `hosting.headers`、2026-07-03設定）
全レスポンスに CSP / X-Content-Type-Options:nosniff / X-Frame-Options:DENY / Referrer-Policy / Permissions-Policy を付与（HSTSはFirebaseデフォルト）。**CSPの許可リストはアプリの外部依存と直結しているため、新しい外部オリジン（CDN・API・iframe埋め込み先）を追加したら `firebase.json` のCSPも必ず更新すること**。現在の許可: script=gstatic/jsdelivr/cdnjs/apis.google（+`'unsafe-inline'`）、connect=`*.firebasedatabase.app`(wss)/`*.googleapis.com`/apis.google/authDomain、frame=youtube/apis.google/authDomain、img=`self data: blob: https:`。CSPを変更したら実ブラウザで `securitypolicyviolation` 違反ゼロを再検証する（ヘッダーはローカルサーバでは付与されず本番デプロイ後のみ有効）。診断の全記録は `セキュリティ診断記録.md`。

## 直近の対応（2026-07-03）

- **簡易脆弱性診断＋修正（完了）**: crossmemo.web.app に対しヘッダー検査・CSPライブ検証・依存点検・XSSレビューを実施。①`firebase.json` に CSP等5種のセキュリティヘッダーを追加しデプロイ ②実ブラウザで全画面操作しCSP違反ゼロ・機能停止なしを確認（ホーム→全文検索749件→カード編集のTipTap描画）。Stripe申告書「定期的な脆弱性診断」への根拠。全記録は `セキュリティ診断記録.md`
- **XSS対策の強化（完了、app.js?v=863）**: ①開発者用テンプレート更新モーダルのパネル名を `esc()` でエスケープ ②保存済みHTMLの解析を不活性な `parseHTMLInert()`（DOMParser）に統一（4箇所）③添付ファイルカードのインラインonclickをaddEventListenerに変更。Chrome実機で新旧解析の等価性（5ケース一致）と `onerror` 非発火を検証済み
- **Stripe旧URL着地バグの修正（完了）**: 決済完了後URLの更新が未使用リンク（3cI4...）に誤適用されていた。アプリ使用中のリンク（5kQ2...）の完了ページを `crossmemo.web.app/?payment=success` に更新し、未使用リンクは無効化

## 次のステップ

1. ~~Stripeテスト用Payment Linkの「決済完了後URL」を更新~~（**2026-07-03完了**。アプリ使用中の `test_5kQ2...` リンクの完了ページを `https://crossmemo.web.app/?payment=success` に更新。未使用の `test_3cI4...` リンクは無効化）
2. ~~Stripeを本番環境に切り替える~~（**2026-07-03完了**。`app.js` の `STRIPE_PAYMENT_LINK` と100kin-blog `login.html` のURLを本番用 `https://buy.stripe.com/8x24gAe62bwQaYO07teUU00` に差し替え済み。詳細は「Stripe課金」セクション参照）
3. ~~残タスク: 一般アカウントで実際に100円決済し、isPremium付与を確認~~（**2026-07-07完了**。`siro.usertest@gmail.com`で本番環境の実決済（Apple Pay）を実施し、決済→リダイレクト→Googleログイン→isPremium付与のフローが正常動作することを確認。詳細は「0-8. ¥100本番決済テスト完了」参照）
4. ~~貼り付けMarkdown処理（2026-07-06実装、app.js?v=864）の実機確認~~（**2026-07-06 Chrome実機確認完了**。ローカルサーバーは`F:\Claude学習\howto-v2`から直接`python -m http.server 8080`で起動（旧`serve.bat`は退避済みOneDriveパスを指しており使用不可、要修正）。`kimijimasan+test@gmail.com`でテスト実施。太字（`**`/`__`）が正しく`<strong>`適用、見出し（`##`）がH2化、他の記号（イタリック・コード・リスト・引用・取り消し線）はプレーンテキスト化、NotebookLM引用番号除去、いずれも仕様通り動作を確認。**注意**: localhost:8080は以前別プロジェクト「ANKI Photo Card」のService Workerが登録されており、初回アクセス時にそのキャッシュ画面が誤表示された（`navigator.serviceWorker.getRegistrations()`で解除・`caches.delete()`で対応済み）。同じ現象が再発したら同様の手順で解除すること）
5. ~~上記4に伴い、画像貼り付け・YouTube表示に既存の貼り付け処理が影響していないかの確認~~（**2026-07-06確認完了**。YouTube URL貼り付け→iframe変換は正常動作（プロトコル省略の`youtu.be/...`単体はTipTap側paste rule仕様上マッチせず`https://`必須。これは既存仕様でありMarkdown太字対応による影響ではない）。`<script>`タグ等のHTMLインジェクションも`escWithBoldMarkers`経由で正しくエスケープされ実行されないことを確認（XSS安全）。画像貼り付け自体は`handlePaste`内の別分岐（`dt.files`優先チェック）のため今回の変更の影響を受けない構造
6. ~~残タスク（100kin-blog側）: カルーセル1枚目の画像差し替え~~（**2026-07-07完了**。100kin-blog側のCLAUDE.md・gitログで確認済み）
7. ~~残タスク（100kin-blog側・未着手）: PWAホーム画面追加の案内モーダル実装~~（**2026-07-07完了**。実機iPhone Safariで確認済み。詳細は100kin-blog側CLAUDE.md「0-8」参照）
8. ~~authDomainのクロスオリジン問題の恒久対応~~（**2026-07-08完了・本番デプロイ済み（v868）**。詳細は「直近の対応（2026-07-08）」参照。残検証: 実機iPhone Safariでポップアップブロック時のredirectフォールバック成功確認）
9. **「購入済みなのに反映されない」ユーザーの復元導線** — 小対応（問い合わせ誘導リンク）は**2026-07-08完了**（ログイン画面・制限モーダルに `apps100kin.web.app/contact.html` へのリンクを設置、v867）。根本対応（Stripe Webhook + Cloud Functionsで決済とアカウントを自動紐付け。Blazeプラン要確認）は未着手
10. ~~serve.bat修正~~（**2026-07-15完了・コミット`d470fc2`**。旧OneDriveパス固定を `cd /d "%~dp0"`（bat自身のディレクトリ基準）に修正済み。python 3.14.3 の存在も確認済み）
11. **画像ドラッグ書き出し関連の実装項目「4.」の内容確認**（2026-07-17のユーザー指示メッセージが「4.」で途切れており内容未受領。次回ユーザーに確認すること）
12. **画像・カード削除時のStorage孤児ファイル削除連動**（未実装。現状は画像やカードを削除してもStorage上の `users/{uid}/images/*` が残り続ける。ルール上 `refFromURL().delete()` は本人なら可能なことを確認済み。項目11の「4.」がこれを指していた可能性あり）
13. **画像ドラッグ書き出し（v887 Storage方式）とカーソル表示（v888）の実機最終確認**（新規挿入画像をワープロ・エクスプローラーへ実マウスでドロップ→実データが渡ること／カーソルがパー→グー→パー→矢印と遷移すること。既存のbase64画像は書き出し非対応が仕様）
14. **App Checkモニタリング確認→enforcement有効化**（導入2026-07-11、目安1〜2週間。Firebase ConsoleでRTDB/Authのメトリクスを確認し、問題なければenforcement有効化。Storageも保護対象に追加するか検討）

## 直近の対応（2026-06-24）

- **複数段落カット誤動作修正（完了）**: `data-cut-id`属性で対象を一意に特定、カット後に即時保存（`saveEditorContentDirectly()`）でモード変更時の復元を防止
- **カード内容消失防止（完了）**: `_isNewCard`フラグとFirebaseデータの両方をチェックし、既存カードが誤って空にされることを防止
- **ペーストキャンセルボタン改善（完了）**: 長押しキャンセルを廃止、ペーストボタン横に「取消」ボタン（42px、font-size: 0.85rem）を表示
- **ログイン時オレンジ枠エラー抑制（完了）**: `_authInProgress`フラグで認証処理中のエラーを無視、ResizeObserverエラーも除外
- **検索機能に置換機能追加（完了）**: 検索モーダルに置換ワード入力欄と「置換」ボタンを追加、`performFullReplace()`で全カードを一括置換
- **PC版カード一覧Ctrl+クリック（完了）**: Ctrl/Cmd+クリックでスワイプメニュー（ピン留め・複写・移動・削除）を表示

## 直近の対応（2026-06-23）

- **カード編集画面の初期スクロール位置修正（完了）**: カードを開いた時に`edContent.scrollTop = 0`で1行目から表示
- **右フリップ判定改善（完了）**: 横移動が縦移動の1.5倍以上の場合のみフリップと判定。縦スクロールはフリップ判定しない（`isHorizontalSwipe`判定）
- **カード一覧スクロール固まり修正（完了）**: `touchmove`でスクロール検出を追加し、縦に10px以上動いたら`_alScrolled=true`でフリップ判定を無効化
- **NotebookLM引用番号自動削除（完了）**: `cleanMarkdownForPaste`・貼り付け時・`onUpdate`イベントの3段階で`[\s*\d+\s*(?:,\s*\d+\s*)*]`パターンを監視・削除
- **ゲスト用100均ブログボタン（完了）**: ホーム画面左下に「📱100均」ボタンを追加（`state.isAnonymous`の場合のみ表示）、https://apps100kin.web.app/ へリンク

## 直近の対応（2026-06-22）

- **100kin-blog公開（完了）**: ブログサイトをGitHub Pagesで公開。URL: https://kimijimasan-lgtm.github.io/100kin-blog/
- **ブログ→Stripe決済→アプリ遷移（動作確認済み）**: 「購入してログイン」→Stripe決済→`?payment=success`でアプリに戻る流れを確認
- **?guest=trueパラメータ対応（完了）**: ブログの「ゲストで試してみる」ボタンから`?guest=true`でアプリを開くと自動ゲストログイン
- **決済完了後のGoogleログイン促進モーダル（未実装→次回継続）**: `?payment=success`で戻った際のモーダル表示は設計のみ。実装は次回継続
- **100kin-blogにsave.bat作成（完了）**: ワンクリックで日時付きコミット&push

## 直近の対応（2026-06-21）

- **🚀メニューのトグルON/OFF表示（完了）**: PCブラウザでデバッグした結果、検出ロジック・UI更新ロジックともに正常に動作していることを確認。段落を選択してメニューを開くと、対応するボタン（H1/H2/地の文）が紫色にハイライトされる
- **PC用Ctrl+クリック段落選択（追加）**: デバッグ用に追加したCtrl+クリック（Mac: Cmd+クリック）で段落選択できる機能を正式採用。スマホの左スワイプ相当の操作がPCでも可能に
- **グローバルエラーハンドラー追加（完了）**: `window.onerror`と`window.onunhandledrejection`で全エラーをキャッチし、トースト表示後に`goTo('home')`でホームに安全復帰。フリーズ防止
- **🚀メニューの文字色パレットに濃い色8色追加**: ダークレッド・ダークブルー・ダークグリーン・ダークパープル・ダークオレンジ・ネイビー・ダークブラウン・ダークシアン（計25色）
- **全パネル一括エクスポート機能（完了）**: ホーム画面ヘッダーにエクスポートボタン追加（スマホのみ表示）。全パネルを1つのtxtファイルにまとめてエクスポート。iOSはシェアシート経由で「ファイル」アプリに保存
- **Stripe課金実装（完了・テスト環境）**: ゲストユーザーが100円で課金 → isPremium=true → Googleアカウント連携を促す流れを実装。テスト決済動作確認済み
- **confirmダイアログの改行コード修正（完了）**: `\\n`がそのまま表示される問題を修正

## 直近の対応（2026-06-20）

- **画像下の空行削除時のRangeError対策（完了）**: `tiptap.bundle.js`内で発生する`RangeError: Position out of range`をBackspace処理・閲覧モードの自動空段落削除・💥空行削除ボタンの3箇所でtry-catch。エラー時はトースト表示後 `goBack(true)` でパネル一覧へ安全に復帰する。詳細は[画像段落の空行削除で発生するRangeError対策](#画像段落の空行削除で発生するrangeerror対策2026-06-20再発防止の保険として実装)を参照
- **ログイン後のログイン画面映り込み問題（完了）**: `#authOverlay`を起動時だけでなく**ログインボタン押下時にも即時表示**する方式に変更。ボタンクリック直後に`showAuthOverlay()`でオーバーレイを即時再表示し、`isPremium`/`categories`読み込み中の素のログイン画面が見えてしまう問題を解消。詳細は[第三段（ログインボタン押下時の映り込み対策）](#第三段2026-06-20ログインボタン押下時の映り込み対策)を参照

## Stripe課金（Payment Links方式・サンドボックス環境）

### 現在の設定値（本番用・2026-07-03移行）
- **Payment Link URL**: `https://buy.stripe.com/8x24gAe62bwQaYO07teUU00`（本番環境）
- **価格ID**: `price_1TkgClJHIlRyZ2PYuHomfChN`（100円）
- **決済完了後URL**: `https://crossmemo.web.app/?payment=success`（2026-07-03に更新済み）
- **テスト決済（旧テスト用Payment Link `test_5kQ2...`）**: 動作確認済み（2026-06-21）
- もう1つのPayment Link（`test_3cI4gAaU6fov7RVcWD7Re00`、06/21 11:06作成）はコード上どこからも未参照。2026-07-02の完了ページURL更新はこちらに誤って行われていた（旧URL着地バグの原因）。2026-07-03に**無効化済み**（ダッシュボードからいつでも再有効化可能）

### フロー（実装完了 2026-06-22、isPremium付与を2026-07-02に堅牢化）
1. ブログ（100kin-blog）の「購入してログイン」ボタン、またはアプリ内「アップグレードする（100円）」（`startStripePayment()`）をタップ
2. Stripe Payment Linkページで決済
3. 決済完了後、`?payment=success` でアプリに戻る
4. 「お支払いありがとうございます！Googleアカウントでログインすると無制限で使えます」モーダル表示
5. Googleログイン完了 → `isPremium: true` 設定 → ホーム画面へ遷移

### isPremium付与の3系統（2026-07-02実装。Webhook不使用・全てクライアントサイド）
1. **起動時の `?payment=success` 分岐**: `startStripePayment()` が決済開始時に保存した `localStorage.pending_payment_uid` へ即 `set(true)`。RTDBルール上、書けるのはログイン中の本人uidのみなので、書き込み失敗時は `pending_premium_grant` フラグに退避
2. **決済成功モーダルの「Googleアカウントでログイン」**: ポップアップ成功時にそのuidへ `set(true)`。押下冒頭で `pending_premium_grant` をセットし、付与成功時に除去（`signInWithRedirect` フォールバックでページ離脱しても消失しない）
3. **`onAuthStateChanged` の保険**: `localStorage.pending_premium_grant === '1'` なら、確定したログインユーザーへ付与して除去（isPremium読み取りの直前に実行するためstateに即反映）

⚠️ ブログ `login.html` の「購入してログイン」はStripeへの**直リンク**で `startStripePayment()` を経由しないため `pending_payment_uid` が無い。この経路は系統2・3（モーダル→ログイン）でのみ付与される。決済とアカウントの完全自動紐付けにはStripe Webhook + Cloud Functionsが必要（未実装）
✅ Payment Linkの「決済完了後URL」は2026-07-03に `https://crossmemo.web.app/?payment=success` へ更新済み（localStorageはオリジン単位のため、旧URLに戻ると系統1が機能しない）
※ 動作検証は開発者アカウント以外（`kimijimasan+test@gmail.com` 等）で行うこと。開発者は制限判定から常に除外されるためisPremiumの効果が観測できない

### 関連関数
- `showLimitModal()`: 制限モーダル表示
- `startStripePayment()`: `pending_payment_uid` 保存 → Payment Linkページに遷移
- `showPaymentSuccessModal()`: 決済成功後のモーダル（Googleログイン促す）
- 旧 `handlePaymentCallback()` はどこからも呼ばれていない死にコードだったため2026-07-02に削除済み（実装は起動時分岐へ移動）

### 本番移行（完了・2026-07-03）
- `STRIPE_PAYMENT_LINK` を本番用Payment Link URL（`https://buy.stripe.com/8x24gAe62bwQaYO07teUU00`）に変更済み
- 100kin-blogの購入ボタンURLも本番用に差し替え済み

## 0-8. ¥100本番決済テスト完了（2026-07-07）

**実施日**: 2026-07-07
**テスト内容**: `siro.usertest@gmail.com` アカウントで、`apps100kin.web.app` の購入ボタンから実際に¥100の本番決済（Apple Pay使用）を実施し、「Stripe課金」セクションに記載の一連のフロー（決済→リダイレクト→Googleログイン→isPremium付与）が本番環境で正常に機能することを実証した。

**確認できたフロー（すべて想定通り）**:
1. Stripe決済（Apple Pay）が正常に完了
2. `crossmemo.web.app/?payment=success` への正しいリダイレクトを確認
3. 「お支払いありがとうございます！Googleアカウントでログインすると無制限で使えます」モーダル（`showPaymentSuccessModal()`）の表示を確認
4. `siro.usertest@gmail.com` でのGoogleログインを確認（初回ログインのため、Firebase Authenticationに新規ユーザーとして登録された）
5. ログイン後、ホーム画面の同期回数バッジ（`#syncQuotaBadge`）が消失したことを確認（`isPremium:true`により`isSyncLimitedUser()`がfalseになったため）
6. Firebase Console（Realtime Database、`torisetu-234c3`プロジェクト）で、該当UIDの`isPremium`フィールドが`true`になっていることを直接確認

**結論**: 決済→リダイレクト→Googleログイン→isPremium付与の一連のフローが、本番環境で正常に機能することを実証済み。

**注意点（今後同様のテストを行う際に踏まえること）**:
- テスト中、ブラウザに保存されたログイン情報により、アカウント選択の余地なく普段使いのメインGoogleアカウントへ自動ログインしてしまう場面があった
- プライベートブラウズ（シークレット）モードを使うことで、`siro.usertest@gmail.com` での明示的なログインが可能になった
- **今後同様のテストを行う際は、事前にシークレット/プライベートブラウズモードを使うと、意図しないアカウントでのログインを防げる**

## 100kin-blog（ブログサイト）

### 概要
100均アプリのランディングページ・ブログサイト。GitHub Pagesでホスティング。

- **リポジトリ**: https://github.com/kimijimasan-lgtm/100kin-blog
- **公開URL**: https://kimijimasan-lgtm.github.io/100kin-blog/
- **ローカルパス**: `F:\Claude学習\100kin-blog\`

### ファイル構成
| ファイル | 内容 |
|----------|------|
| `index.html` | ホーム画面（アプリ一覧、3カラム） |
| `app-detail.html` | PCスマホ連動メモ詳細ページ |
| `login.html` | ログイン選択画面（購入/ゲスト） |
| `設計書.md` | 全体設計・フェーズ計画 |
| `開発者ガイド.md` | 次作アプリ登録手順 |
| `save.bat` | ワンクリックでgit push |

### ボタンリンク
- **「購入してログイン」**: `https://buy.stripe.com/8x24gAe62bwQaYO07teUU00`（本番環境）
- **「ゲストで試してみる」**: `https://kimijimasan-lgtm.github.io/howto-v2/?guest=true`

### ?guest=true パラメータ
howto-v2側で `?guest=true` パラメータを検出すると、未ログイン状態なら自動的に `signInAnonymously()` を実行してゲストログインする。

（旧「次のステップ（詳細）」セクションは冒頭の「次のステップ」に統合・削除済み。Stripe関連は全て「Stripe課金」セクション参照）
