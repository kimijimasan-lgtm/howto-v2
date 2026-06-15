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
- `ImageExtension` は `CustomImageExtension`（`class` 属性を per-image で保持できるよう extend 済み）

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

### ログイン画面（`renderLogin`）— シンプル化済み
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
      │   ├─ categories が 0件 かつ 開発者でない → copyTemplateToUser()
      │   └─ goTo('home')
      └─ user なし → await redirectResultPromise
           ├─ currentUser が非 null → 何もしない（再発火される）
           └─ currentUser が null → goTo('login')
```

### ゲストのサインアウト（`btnSignOut`）
- ゲスト: 「サインアウトするとゲストデータが失われます。よろしいですか？」確認 → `signOut()`
- 通常ユーザー: 「サインアウトしますか？」確認 → `signOut()`
- Google連携のオファーはサインアウト時には行わない（アップグレードボタン経由に統一）

### アップグレードボタン（`showLimitModal` 内）の動作
- **ゲスト**: 「ゲストのデータをGoogleアカウントに引き継ぎます…」確認 → `linkWithPopup(GoogleAuthProvider)`
  - `auth/credential-already-in-use` → `signInWithCredential(err.credential)` でシームレス切替
- **通常ユーザー（非課金）**: Stripe 課金ページを開く（URL は現在プレースホルダー）

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

## UI詳細

### パネル名入力フォーム（`#catInput` / `.modal-input`）
- 文字色: `#ffffff`（白）、`font-weight: 700`（太字）
- `showCategoryModal` で使用（新規作成・編集とも同じ input）

### カード一覧の並び替え
- **デフォルト**: 名前の昇順（`sortField = 'name'`, `sortDir = 'asc'`）
- 起動時に `updateSortUI()` を呼んでデフォルト状態をUIに反映

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
if (dx > 30 && dy < dx * 2) onSwipe();
```
- 水平から約63度以内の右方向ジェスチャーで「前の画面へ戻る」（一定の緩い角度で安定）
- カード一覧→ホーム、エディター→カード一覧の両方に適用

### `bindParagraphSwipeEvents`（エディター内スワイプ）
- 右フリップ（緩いルール）: `dx > 30 && !isStraightDown` → `goBack()`
- 左フリップ（厳しいルール）: `dx < -50 && dy < 40` → 段落選択

### `addPullToCreate`（真下プル → 新規カード作成）
- `onMove`: `dx > 20` で即キャンセル（右方向への動きで中断）
- `onEnd`: `dy >= 80 && dx <= 20 && |dx| < dy * 0.2`（ほぼ垂直のみ）

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
- テキスト: 常に横取りして `cleanMarkdownForPaste()` を通す
  - Markdown記法（`##`, `**`, `` ` ``, `-`, `>` 等）を除去
  - 連続する空行を最大1行に圧縮
- 罫線テーブル文字（`│`, `┼` 等が3つ以上）: `cleanAndFormatBorderLines()` で整形
  - 縦罫線（`│`, `├`, `└` 等）および後続の `─` を `\n` に変換（行ごとに分離）
  - 横罫線のみの行（3文字以上）は削除
  - 連続する空行は1行に圧縮

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
index.html          — エントリポイント（app.js?v=756, tiptap.bundle.js?v=2）
app.js              — アプリ全体（約4,000行）
style.css           — スタイル（v=679）
tiptap.bundle.js    — TipTapバンドル（IIFE）
manifest.json       — PWA設定（start_url/scope: /howto-v2/）
.nojekyll           — GitHub Pages Jekyll無効化
.gitignore          — .tiptap-build/node_modules/ を除外
```

## キャッシュバスティング（重要）
`index.html` の `?v=NNN` をインクリメントすること。iPhoneは古いキャッシュを長く保持する。
- `style.css?v=679`
- `tiptap.bundle.js?v=2`
- `app.js?v=756`

## テスト
- ローカルサーバー: `serve.bat`（port 8080）または `python -m http.server 8080`
- テスト用アカウント: `kimijimasan+test@gmail.com`
- 開発者アカウントの制限解除: Firebase Console で `users/{uid}/isPremium: true` を設定

## 次のステップ
- 解説カード10枚の内容を充実させる（`TEMPLATE_EXPLANATION_CARDS` 定数を編集 → 「テンプレートを更新」ボタンで反映）
- 残っているバグの修正を続ける
- Stripe Payment Link URL を `showLimitModal` の `paymentUrl` に設定
