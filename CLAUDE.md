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
index.html          — エントリポイント（app.js?v=844, style.css?v=705, tiptap.bundle.js?v=5）
app.js              — アプリ全体（約5,800行）
style.css           — スタイル
tiptap.bundle.js    — TipTapバンドル（IIFE）
manifest.json       — PWA設定（start_url/scope: /howto-v2/）
.nojekyll           — GitHub Pages Jekyll無効化
.gitignore          — .tiptap-build/node_modules/ を除外
```

## キャッシュバスティング（重要）
`index.html` の `?v=NNN` をインクリメントすること。iPhoneは古いキャッシュを長く保持する。
- `style.css?v=705`
- `tiptap.bundle.js?v=5`
- `app.js?v=844`

## テスト
- ローカルサーバー: `serve.bat`（port 8080）または `python -m http.server 8080`
- テスト用アカウント: `kimijimasan+test@gmail.com`
- 開発者アカウントの制限解除: Firebase Console で `users/{uid}/isPremium: true` を設定

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
- **YouTube削除ボタンを画像と同じ方式に統一（作業中）**: 編集モード時のみ表示、CSSクラス`.yt-del-btn-static`で制御。実装済みだが動作確認が必要

## 次のステップ

1. **YouTube削除ボタンの動作確認** - 編集モードで表示されるか実機確認
2. **Stripeを本番環境に切り替える** - 本番用Payment Link作成・URL差し替え
3. **100kin-blogにスクリーンショット追加** - 絵文字プレースホルダーを実際の画像に差し替え
4. **決済完了後のGoogleログイン促進モーダル実装** - `?payment=success`で戻った際のモーダル表示

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

### 現在の設定値（テスト用）
- **Payment Link URL**: `https://buy.stripe.com/test_5kQ28s9Q2ccj0pt9Kr7Re01`
- **価格ID**: `price_1TkgClJHIlRyZ2PYuHomfChN`（100円）
- **決済完了後URL**: `https://kimijimasan-lgtm.github.io/howto-v2/?payment=success`
- **テスト決済**: 動作確認済み（2026-06-21）

### フロー（実装完了 2026-06-22）
1. ブログ（100kin-blog）の「購入してログイン」ボタンをタップ
2. Stripe Payment Linkページで決済
3. 決済完了後、`?payment=success` でアプリに戻る
4. 「お支払いありがとうございます！Googleアカウントでログインすると無制限で使えます」モーダル表示
5. Googleログイン完了 → `isPremium: true` 設定 → ホーム画面へ遷移

### 関連関数
- `showLimitModal()`: 制限モーダル表示
- `startStripePayment()`: Payment Linkページに遷移
- `showPaymentSuccessModal()`: 決済成功後のモーダル（Googleログイン促す）

### 本番移行時の変更点
- `STRIPE_PAYMENT_LINK` を本番用Payment Link URLに変更（`https://buy.stripe.com/live_...`）
- Stripeダッシュボードで本番用Payment Linkを作成
- 100kin-blogの購入ボタンURLも本番用に差し替え

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
- **「購入してログイン」**: `https://buy.stripe.com/test_5kQ28s9Q2ccj0pt9Kr7Re01`（テスト環境）
- **「ゲストで試してみる」**: `https://kimijimasan-lgtm.github.io/howto-v2/?guest=true`

### ?guest=true パラメータ
howto-v2側で `?guest=true` パラメータを検出すると、未ログイン状態なら自動的に `signInAnonymously()` を実行してゲストログインする。

## 次のステップ

### 1. カラーパレット整理の確認
- 実機でパネル色選択を開いて30色が正しく表示されるか確認

### 2. Stripeを本番環境に切り替える
- 本番用Stripeアカウントで価格・Payment Linkを作成
- howto-v2の `STRIPE_PAYMENT_LINK` を本番用URLに差し替え
- 100kin-blogの購入ボタンURLも本番用に差し替え

### 3. スクリーンショット追加
- 100kin-blogの絵文字プレースホルダーを実際のスクリーンショット画像に差し替え
