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
- `tiptap.bundle.js`（296KB、IIFE、`window.TipTapBundle` に export）
- ビルド元: `.tiptap-build/entry.js`（esbuild）
- エクスポート: `Editor`, `StarterKit`, `ImageExtension`, `YoutubeExtension`, `TaskList`, `TaskItem`, `TextStyleExtension`
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

**ログインフラッシュ修正済み（2026-06）**:  
`getRedirectResult()` を `onAuthStateChanged` の外で呼ぶと、セッション復元前に `null` が先発火してログイン画面が一瞬表示される問題があった。`null` ハンドラの**内部**で呼ぶよう修正。

```
起動
 └─ onAuthStateChanged
      ├─ user あり
      │   ├─ state.isAnonymous = user.isAnonymous をセット
      │   ├─ isPremium フラグを Firebase から取得
      │   ├─ categories が 0件 かつ 開発者でない → copyTemplateToUser()
      │   └─ goTo('home')
      └─ user なし
           ├─ await getRedirectResult()  ← ここで初めて呼ぶ（外で呼ばない）
           ├─ currentUser が非 null → 何もしない（再発火される）
           └─ currentUser が null → goTo('login')
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
- クリック → `showLimitModal('Googleアカウントでログインすると\nパネル・メモが無制限に使えます。\nゲストのデータはそのまま引き継がれます。')`

### アップグレードボタン（`showLimitModal` 内）の動作
- **ゲスト**: confirm「ゲストのデータをGoogleアカウントに引き継ぎます…」→ `linkWithPopup(GoogleAuthProvider)`
  - `auth/credential-already-in-use` → **データ引き継ぎ不可の警告**ダイアログ → 確認後 `signInWithCredential`
- **正規ユーザー**: `https://buy.stripe.com/YOUR_PAYMENT_LINK_ID` を開く（現在プレースホルダー）
  - ただし正規ユーザーには上限がないため、このルートに到達するケースは事実上ない

## 新規ユーザーの初期テンプレート機能

### テンプレートの構成
Firebase `templates/default` に保存されており、新規ユーザーに自動コピーされる。

| パネル | カード数 | 色 |
|--------|---------|-----|
| 解説（インディゴ）| 10枚 | `linear-gradient(135deg,#4f46e5,#6366f1)` |
| メモ（エメラルド）| 1枚（「最初のメモ」） | `linear-gradient(135deg,#059669,#10b981)` |

解説カード10枚の内容はコード定数 `TEMPLATE_EXPLANATION_CARDS`（`app.js` 内）で管理。

### 関連関数
| 関数 | 役割 |
|------|------|
| `copyTemplateToUser(uid)` | `templates/default` を読み込み、新規ユーザーのパスにコピー。テンプレート不在時は `createSampleData` にフォールバック |
| `createSampleData(uid)` | フォールバック用静的サンプル。`TEMPLATE_EXPLANATION_CARDS` 定数を使用 |
| `saveCurrentDataAsTemplate()` | 開発者専用。`TEMPLATE_EXPLANATION_CARDS` 定数から `templates/default` を生成・上書き |

### 「テンプレートを更新」モーダル（開発者専用）
- 表示条件: `firebase.auth().currentUser?.email === 'kimijimasan@gmail.com'`
- 場所: ホーム画面ヘッダー（サインアウトボタンの左隣、データベースアイコン）
- **チェックボックスはデフォルトで全チェック外し**（誤更新防止）
- **パネルが多い場合はスクロール対応**（rows コンテナに `max-height:60vh; overflow-y:auto`）

### 除外条件
- 開発者アカウント（`kimijimasan@gmail.com`）はテンプレートコピーをスキップ
- categories が既に存在するユーザーにはコピーしない

## 制限・課金

### ユーザー種別と制限（2026-06 改定）

| 種別 | パネル上限 | カード上限/パネル |
|------|-----------|----------------|
| ゲスト（匿名・`isAnonymous`）| 3つ | 6枚 |
| 正規ログイン（Google）| **無制限** | **無制限** |
| 課金済み（`isPremium: true`）| 無制限 | 無制限 |

- 制限チェックの判定条件は `!state.isPremium` から **`state.isAnonymous`** に変更
- 正規ログイン（Google）ユーザーは課金不要で完全無制限

### 制限チェックの実装箇所
- **パネル**: `showCategoryModal` の保存ボタン → `state.isAnonymous && categories >= 3` で `showLimitModal()`
- **カード**: `createArticle()` 冒頭 → `state.isAnonymous && articles >= 6` で `showLimitModal()`

### `showLimitModal(message)`
オレンジ→ピンクの「アップグレードする」ボタン + 「閉じる」ボタン。  
**Stripe 課金は未実装**（`paymentUrl = 'https://buy.stripe.com/YOUR_PAYMENT_LINK_ID'` のプレースホルダー）。  
正規ユーザーに上限がないため、Stripe経路に到達するケースは現在ない。

## UI詳細

### パネル名入力フォーム（`#catInput` / `.modal-input`）
- 文字色: `#ffffff`（白）、`font-weight: 700`（太字）
- `showCategoryModal` で使用（新規作成・編集とも同じ input）

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

### コピー＆カットボタンの間隔
`#btnBulkCopy` / `#btnBulkDelete` の `margin-right: 0.75rem`（戻す・編ボタンの間隔と統一）

### 段落書式アクションボタン（`#btnTextFormat`）
- `btnBulkDelete` の右隣に配置（紫系：`#8b5cf6`）
- 段落が選択されているとき（`para-selected` > 0）のみ表示（`updateBulkDeleteButtonState` で制御）
- タップで `#textFormatMenu` を表示（ボタン直下に位置合わせ）
- `#textFormatMenuBackdrop`（z-index: 5）でエディターコンテンツ外のクリックを拾って閉じる
  - ヘッダー（z-index: 10）はバックドロップより上なので引き続き操作可能
- **メニュー項目:**
  - `#btnApplyH1` → `tiptapEditor.chain().setTextSelection(insidePos).toggleHeading({ level: 1 }).run()`
  - `#btnApplyH2` → `tiptapEditor.chain().setTextSelection(insidePos).toggleHeading({ level: 2 }).run()`
  - `#colorPickerRow` / `#textColorPicker` → `setMark('textStyle', { color })` でテキスト色を適用
  - `#btnResetFormat` → `unsetMark('textStyle')` で文字色を除去
- 見出し適用後は `cleanupAllSwipedParagraphs` で段落選択状態をリセット
- **注意**: 見出しノード（`<h1>`/`<h2>`）はスワイプ選択の対象外（`p.para-selected` のみ対応）

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
- カード一覧→ホーム、エディター→カード一覧の両方に適用

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

## Undoボタン（#btnUndo）の動作
- **表示条件**: 編集モード中は**常に表示**
- **active/inactive**: `lastDeletedContent !== null` → 通常、`=== null` → `.inactive`（opacity 0.35）
- **`lastDeletedContent` をセットする箇所**: 画像挿入前 / 段落カット前 / YouTube削除前 / PC画像削除前

## ファイル構成
```
index.html          — エントリポイント（app.js?v=761, tiptap.bundle.js?v=3）
app.js              — アプリ全体（約4,300行）
style.css           — スタイル（v=682）
tiptap.bundle.js    — TipTapバンドル（IIFE）
manifest.json       — PWA設定（start_url/scope: /howto-v2/）
.nojekyll           — GitHub Pages Jekyll無効化
.gitignore          — .tiptap-build/node_modules/ を除外
```

## キャッシュバスティング（重要）
`index.html` の `?v=NNN` をインクリメントすること。iPhoneは古いキャッシュを長く保持する。
- `style.css?v=682`
- `tiptap.bundle.js?v=3`
- `app.js?v=761`

## テスト
- ローカルサーバー: `serve.bat`（port 8080）または `python -m http.server 8080`
- テスト用アカウント: `kimijimasan+test@gmail.com`
- 開発者アカウントの制限解除: Firebase Console で `users/{uid}/isPremium: true` を設定

## 次のステップ：Stripe課金実装

### 準備タスク
1. **問い合わせ用Gmail作成**（例: `pcsmartmemo.support@gmail.com`）
2. **メインアドレスへの転送設定**
3. **Stripeアカウント作成**（メインアドレスで登録）
4. **APIキー・価格IDの取得**

### 実装箇所
- `showLimitModal` 内の `paymentUrl` を実際の Stripe Payment Link URL に置き換える
  ```js
  const paymentUrl = 'https://buy.stripe.com/YOUR_PAYMENT_LINK_ID'; // ← ここ
  ```
- 課金完了後に Firebase の `users/{uid}/isPremium: true` を書き込む Webhook または Cloud Functions が必要

### 課金対象ユーザー
現状では正規ログイン（Google）ユーザーは無制限なので、課金メリットを設計し直す必要がある。  
例：正規ユーザーに上限を設けて（例：パネル10・カード30）、課金で無制限にするなど。
