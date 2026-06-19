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

起動時は常に最初にローディング画面（`.auth-init-loading`）を表示し、`authStateReady()` の解決 → `onAuthStateChanged` 登録・確定値での発火 → `goTo('home')` / `goTo('login')` の順で遷移する（`index.html` の `#app` は空のまま、`DOMContentLoaded` 内で初めてローディングHTMLを挿入するため、静的HTML由来のログイン画面フラッシュは存在しない）。signOut等の起動後のライブな状態変化は `onAuthStateChanged` がそのまま即時処理する（起動時点で既に確定済みのため、ここでも推測は不要）。

```
起動
 └─ #app に読み込み中…スピナーを表示
 └─ await firebase.auth().authStateReady()  ← 永続化セッション復元の完全確定を待つ（タイマー推測なし）
 └─ onAuthStateChanged を登録（この時点で currentUser は確定済み）
      ├─ user あり
      │   ├─ state.isAnonymous = user.isAnonymous をセット
      │   ├─ isPremium フラグを Firebase から取得
      │   ├─ categories が 0件 かつ 開発者でない → copyTemplateToUser()
      │   └─ goTo('home')
      └─ user なし
           ├─ await getRedirectResult()  ← ここで初めて呼ぶ（外で呼ばない）
           ├─ currentUser が非 null → 何もしない（redirect成功、再発火されたuser分岐が処理済み）
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
- **メニューUI**: H1・地の文・H2 + 区切り線 + **文字色パレット（17色実装完了）** + **実行ボタン**
  - **選択→実行方式（2026-06改修）**: H1/H2/地の文・文字色のボタンは押しても即時反映されない。タップで「選択中」状態（紫ハイライト/アウトライン）になるだけで、実際の適用は `#btnApplyExecute`（メニュー最下部の「実行」ボタン）を押した時点でまとめて反映される
    - 同じボタンをもう一度押すと選択解除（`_pendingHeadingChoice = null` / `_pendingColorChoice = undefined`）
    - メニューを開閉するたびに `_pendingHeadingChoice` / `_pendingColorChoice` はリセットされる
    - 実行時は見出し変換 → 文字色適用の順で処理。見出し変換でノード（p→h1等）のDOMが置き換わりPM位置情報が失われるため、色適用用のテキスト範囲は見出し変換前に確保しておく（`toggleHeading`/`setParagraph`はノードサイズを変えないため、保存したposは変換後も有効）
  - `#btnApplyH1` → 選択トグル（実行時に `toggleHeading({ level: 1 })`） ← 選択中の要素が全部H1のときメニュー初期表示で紫ハイライト
  - `#btnApplyH2` → 選択トグル（実行時に `toggleHeading({ level: 2 })`） ← 選択中の要素が全部H2のときメニュー初期表示で紫ハイライト
  - `#btnApplyParagraph` → 選択トグル（実行時に `setParagraph()` で見出しを解除し通常テキストに戻す）
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
`applyCardLockUI()` で編集系ボタン（`btnModeToggle`, `btnDel`, `btnTextFormat`, `btnPaste`, `btnPasteCancel`, `btnAttach`, `btnUndo`, `btnBulkCopy`, `btnBulkDelete`）を `display:none` で非表示化。判定が非同期（Firebaseキャッシュ/読み取り）のため、確定後に `refreshYoutubeDeleteButtons('view')` / `refreshParaSortable('view')` を再実行し、確定前に注入されてしまったハンドルを確実に除去する。

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
index.html          — エントリポイント（app.js?v=782, style.css?v=686, tiptap.bundle.js?v=3）
app.js              — アプリ全体（約5,500行）
style.css           — スタイル
tiptap.bundle.js    — TipTapバンドル（IIFE）
manifest.json       — PWA設定（start_url/scope: /howto-v2/）
.nojekyll           — GitHub Pages Jekyll無効化
.gitignore          — .tiptap-build/node_modules/ を除外
```

## キャッシュバスティング（重要）
`index.html` の `?v=NNN` をインクリメントすること。iPhoneは古いキャッシュを長く保持する。
- `style.css?v=690`
- `tiptap.bundle.js?v=3`
- `app.js?v=790`

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
