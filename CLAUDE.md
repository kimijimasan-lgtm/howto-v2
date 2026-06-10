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

### データ保存形式
Firebase: `users/{uid}/articles/{catId}/{artId}.content` にHTML文字列

## Firebase
- `index.html` の `<script>` タグに `firebaseConfig` を直接記述（CDN compat版 v10.12.0）
- Auth: メール/パスワード
- DB: Realtime Database

## ファイル構成
```
index.html          — エントリポイント（app.js?v=621, tiptap.bundle.js?v=1）
app.js              — アプリ全体（約3,660行）
style.css           — スタイル（v=620）
tiptap.bundle.js    — TipTapバンドル（IIFE）
tiptap-bundle.js    — 旧バンドルファイル（未使用、削除検討）
tiptap-test.html    — TipTap単体テスト用ページ（本番不要）
manifest.json       — PWA設定（start_url/scope: /howto-v2/）
.nojekyll           — GitHub Pages Jekyll無効化
.gitignore          — .tiptap-build/node_modules/ を除外
```

## キャッシュバスティング（重要）
`index.html` の `?v=NNN` をインクリメントすること。iPhoneは古いキャッシュを長く保持する。
- `style.css?v=621`
- `tiptap.bundle.js?v=1`
- `app.js?v=623`

## テスト
- ローカルサーバー: `serve.bat`（port 8080）または `python -m http.server 8080`
- テスト用アカウント: `kimijimasan+test@gmail.com`

## 次のステップ
- 細かいバグ修正と機能改善
- `tiptap-bundle.js`（旧ファイル）と `tiptap-test.html` の削除検討
- ユーザー報告の不具合をひとつずつ対処
