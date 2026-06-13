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
- Auth: メール/パスワード
- DB: Realtime Database

## ファイル構成
```
index.html          — エントリポイント（app.js?v=725, tiptap.bundle.js?v=1）
app.js              — アプリ全体（約3,700行）
style.css           — スタイル（v=666）
tiptap.bundle.js    — TipTapバンドル（IIFE）
manifest.json       — PWA設定（start_url/scope: /howto-v2/）
.nojekyll           — GitHub Pages Jekyll無効化
.gitignore          — .tiptap-build/node_modules/ を除外
```

## キャッシュバスティング（重要）
`index.html` の `?v=NNN` をインクリメントすること。iPhoneは古いキャッシュを長く保持する。
- `style.css?v=666`
- `tiptap.bundle.js?v=1`
- `app.js?v=725`

## テスト
- ローカルサーバー: `serve.bat`（port 8080）または `python -m http.server 8080`
- テスト用アカウント: `kimijimasan+test@gmail.com`

## 実装済みの変更（直近）
- 右下の閲覧/編集切替ボタンを「閲」「編」テキストUIに変更済み
- Undoボタンを編集モードに追加済み（`#btnUndo`）
- カテゴリ画面のカード一覧から「+」ボタンを削除済み
- コピー/カット後キャンセルボタンを緑地白文字✕に変更済み（btnPasteCancel）
- カット後にbtnAttach・btnDelを非表示にする処理を追加済み（updatePasteButtonState）
- 画像のみの段落ドラッグハンドルを上部（top:8px）に配置変更
- iPhoneのIME確定後幽霊Enterによる余分な改行を抑止（compositionJustEndedをhandleKeyDownで使用）
- 画像後の空段落でBackspace時に空段落のみ削除・画像を保持するよう修正
- エクスポートモーダルUI改善（ボーダー付き選択リスト、フルワイドDLボタン）
- 移動先モーダルUI改善（ティールグラジェントヘッダー、ボーダー付きリスト）
- 画面下部カット改善（`Math.max(initialVVH, vvh)` でアドレスバー隠れ時も正確に高さ確保）
- YouTube横回転時の自動フルスクリーン（`requestFullscreen()` + overlay方式、`webkitFullscreenchange`対応）
- カード最下部画像でカードを開くたびに空行が増える問題を修正（`stripTrailingEmptyP` 3層防衛）
  - 保存パスで除去 / `setContent`後に除去 / `onUpdate`（閲覧モードのみ）で`tr.delete`除去
- YouTubeの下に画像を貼るとRangeErrorになる問題を修正（`splitBlock()`を`tr.insert(tr.doc.content.size, ...)`に置換）
- 画像最下部でEnterによる改行ができない問題を修正（`onUpdate`の末尾空段落除去を閲覧モード限定に変更）
- Undoボタンのテキストを「1つ前の状態に戻しますか？」に変更
- PC画像削除（ホバーボタン）時にもUndoボタンが表示されるよう修正（`lastDeletedContent`スナップショット追加）

## Undoボタン（#btnUndo）の動作
- **表示条件**: 編集モードかつ `lastDeletedContent !== null` の時のみ表示
- **自動非表示**: 表示から10秒後にタイマーで非表示（`undoAutoHideTimer`）
- **`lastDeletedContent` をセットする箇所**:
  - 画像挿入前（`fileInput.onchange`）
  - 段落カット前（カットボタン `btnBulkDelete`）
  - YouTube削除前（`refreshYoutubeDeleteButtons` の `btn.onclick`）
  - PC画像削除前（`setupImageDeleteButtons` の `btn.onclick`）← 今回追加
- **閲覧モードでの削除**: `lastDeletedContent`はセットされるが、編集モードに切替えた時に`setEditorMode`内の`updateUndoButtonVisibility()`で表示される

## stripTrailingEmptyP の実装
```js
function stripTrailingEmptyP(html) {
  const stripped = html.replace(/(<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>)+$/, '');
  return stripped || '<p></p>';
}
```
- 末尾の空段落（`<br>`バリアント含む）を除去
- 全除去されても最低限 `<p></p>` を返す
- `getCleanEditorHTML()` / `forceSaveEditorContent()` / `setContent`後の後処理で使用

## 実装済み（追加分）
- カード一覧ソートボタンのコントラスト改善（sort-bar/sort-btn CSS）
- Undoボタンの挙動修正（updateUndoButtonVisibility、10秒自動非表示）
- PCのカード新規作成「+」FABボタン復活（pointer: fine 判定で表示制御）
- YouTube動画があるカードの右端にサムネイル表示（extractYoutubeId + img.youtube.com/vi/）
- iPhoneでYouTube横画面全画面表示（orientationchange → requestFullscreen() + overlay方式）

## 次のステップ
（現在の主要タスクはすべて対応済み）
