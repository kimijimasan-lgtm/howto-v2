# howto-v2 プロジェクト状態

## アプリ概要
PCスマホ連動メモ — Firebase Realtime Database を使ったカテゴリ別記事管理PWA。  
GitHub Pages でホスティング: `https://kimijimasan-lgtm.github.io/howto-v2/`

## 画面構成
- **home** (`renderHome`) — カテゴリ一覧
- **category** (`renderCategory`) — カテゴリ内カード一覧
- **editor** (`renderEditor`) — 記事エディター（TipTap）

## TipTap 移行（完了）

### バンドル
- `tiptap.bundle.js`（294KB、IIFE、`window.TipTapBundle` に export）
- ビルド元: `.tiptap-build/entry.js`（esbuild）
- エクスポート: `Editor`, `StarterKit`, `ImageExtension`, `YoutubeExtension`, `TaskList`, `TaskItem`

### 初期化（`renderEditor` 内）
```js
const { Editor: TiptapEditor, StarterKit, ImageExtension, ... } = window.TipTapBundle;
tiptapEditor = new TiptapEditor({
  element: document.getElementById('edContent'),
  extensions: [
    StarterKit,
    ImageExtension.configure({ allowBase64: true, inline: true, HTMLAttributes: { class: 'inserted-img' } }),
    YoutubeExtension.configure({ controls: true, nocookie: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
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
| `handleImageForTipTap(file)` | 画像圧縮(800px/JPEG0.75)→`chain().setImage()`で挿入 |
| `getCleanEditorHTML(editor)` | `tiptapEditor.getHTML()` を返す |
| `saveEditorContentDirectly()` | Firebase に即時保存 |
| `isEditorEmpty()` | `tiptapEditor.isEmpty` を返す |
| `initializeNativeParagraphActions(pm)` | ProseMirror domにスワイプ・SortableJS等をバインド |
| `forceSaveEditorContent()` | 保存後 `tiptapEditor.destroy()` |

### DOM構造
```
#edContent.editor-content
  └── .ProseMirror  ← tiptapEditor.view.dom（ここにバインド）
        └── <p>, <img>, ...
```

### モード切替
- `setEditorMode('edit')` → `tiptapEditor.setEditable(true)`
- `setEditorMode('view')` → `tiptapEditor.setEditable(false)` + `blur()`
- モード切替UIは右下固定の小ボタン（`position: fixed; bottom: 1.5rem; right: 1rem; 50×50px`）
  - 閲覧モード：「閲」（青）、編集モード：「編」（赤）
  - `#btnModeToggle` の `textContent` を切り替えるだけ（span不使用）
- **Undoボタン**（`#btnUndo`）を編集モード時のみ表示（`setEditorMode` 内で `display` 切替）

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

### データ保存形式
Firebase: `users/{uid}/articles/{catId}/{artId}.content` にHTML文字列

## Firebase
- `index.html` の `<script>` タグに `firebaseConfig` を直接記述（CDN compat版 v10.12.0）
- Auth: **Googleログイン** + **匿名認証（ゲスト）**（メール/パスワード認証は廃止）
- DB: Realtime Database

## 認証フロー

### ログイン画面（`renderLogin`）
- 「Googleでログイン」ボタン（メイン・白背景）
- 「ゲストとして試す」ボタン（サブ・半透明）→ `firebase.auth().signInAnonymously()`
- メール/パスワード認証は削除済み

### 起動シーケンス（`onAuthStateChanged`）
```
起動
 ├─ getRedirectResult() を先行実行（Promise保持）
 └─ onAuthStateChanged
      ├─ user あり
      │   ├─ isPremium フラグを Firebase から取得
      │   ├─ categories が 0件 → createSampleData() でサンプル2カテゴリ作成
      │   └─ goTo('home')
      └─ user なし → await redirectResultPromise
           ├─ currentUser が非 null → 何もしない（再発火される）
           └─ currentUser が null → goTo('login')
```

### ゲストのサインアウト（`btnSignOut`）
ゲスト (`user.isAnonymous`) がサインアウトを押すと：
1. `confirm` で「Googleと連携」or「サインアウト」を選択
2. OK → `currentUser.linkWithPopup(provider)` でデータ保持のまま連携
3. `auth/credential-already-in-use` → `signInWithCredential(err.credential)` で既存アカウントへシームレス切替
4. キャンセル → 2段確認後に `signOut()`

## 新規ユーザーの初期状態（`createSampleData`）
`onAuthStateChanged` でカテゴリが0件の場合のみ実行。
- カテゴリ「使い方」（インディゴ）+ 操作説明カード
- カテゴリ「メモ」（エメラルド）+ 空カード

## 制限・課金

### ユーザー種別と制限
| 種別 | カテゴリ上限 | カード上限/カテゴリ |
|------|------------|------------------|
| ゲスト（匿名）| 3つ | 10枚 |
| Google（非課金）| 3つ | 10枚 |
| 課金済み（`isPremium: true`）| 無制限 | 無制限 |
| 開発者（Firebase で `isPremium: true` 設定）| 無制限 | 無制限 |

### 制限チェックの実装箇所
- **カテゴリ**: `showCategoryModal` の保存ボタン → `categories` 件数 >= 3 で `showLimitModal()`
- **カード**: `createArticle()` 冒頭（async）→ `articles/{catId}` 件数 >= 10 で `showLimitModal()`
- 判定条件: `if (!state.isPremium)`

### `showLimitModal(message)`
オレンジ→ピンクの「アップグレードする」ボタン + 「閉じる」ボタン。  
Stripe URL は `'https://buy.stripe.com/YOUR_PAYMENT_LINK_ID'` プレースホルダー（後で差し替え）。

## スワイプジェスチャー（カテゴリ画面）

### `addSwipeBack`（右スワイプ → ホームへ）
```js
const isStraightDown = dy >= 80 && dx < dy * 0.2;
if (dx > 30 && !isStraightDown) onSwipe();
```
- 右方向30px超 かつ 真下（垂直から11度以内）でなければホームへ戻る
- 右斜め下のスワイプも「ホームへ」として判定

### `addPullToCreate`（真下プル → 新規カード作成）
- `onMove`: `dx > 20` で即キャンセル（右方向への動きで中断）
- `onEnd`: `dy >= 80 && dx <= 20 && |dx| < dy * 0.3`（ほぼ垂直のみ）

## ホーム画面の全文検索（`showSearchModal`）
- 右下の虫眼鏡FAB（`#btnSearchFab`）で起動
- Firebase から全カテゴリ・全カードを並列取得 (`Promise.all`)
- `htmlToLines(content)` でHTML→テキスト行配列変換
- 結果クリック → `state.pendingScrollToParagraph` / `state.pendingSearchKeyword` をセット → エディターで3秒点滅（`blinkSearchKeyword`）

## stripTrailingEmptyP の実装
```js
function stripTrailingEmptyP(html) {
  const stripped = html.replace(/(<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>)+$/, '');
  return stripped || '<p></p>';
}
```
- 末尾の空段落（`<br>`バリアント含む）を除去
- `getCleanEditorHTML()` / `forceSaveEditorContent()` / `setContent`後の後処理で使用

## Undoボタン（#btnUndo）の動作
- **表示条件**: 編集モード中は**常に表示**
- **active/inactive**: `lastDeletedContent !== null` → 通常、`=== null` → `.inactive`（opacity 0.35）
- **`lastDeletedContent` をセットする箇所**: 画像挿入前 / 段落カット前 / YouTube削除前 / PC画像削除前

## ファイル構成
```
index.html          — エントリポイント（app.js?v=742, tiptap.bundle.js?v=1）
app.js              — アプリ全体（約3,900行）
style.css           — スタイル（v=675）
tiptap.bundle.js    — TipTapバンドル（IIFE）
manifest.json       — PWA設定（start_url/scope: /howto-v2/）
.nojekyll           — GitHub Pages Jekyll無効化
.gitignore          — .tiptap-build/node_modules/ を除外
```

## キャッシュバスティング（重要）
`index.html` の `?v=NNN` をインクリメントすること。iPhoneは古いキャッシュを長く保持する。
- `style.css?v=675`
- `tiptap.bundle.js?v=1`
- `app.js?v=742`

## テスト
- ローカルサーバー: `serve.bat`（port 8080）または `python -m http.server 8080`
- テスト用アカウント: `kimijimasan+test@gmail.com`
- 開発者アカウントの制限解除: Firebase Console で `users/{uid}/isPremium: true` を設定

## 次のステップ
- Stripe Payment Link URL を `showLimitModal` の `paymentUrl` に設定
- Firebase Console で Anonymous Auth を有効化（ゲストログインに必要）
