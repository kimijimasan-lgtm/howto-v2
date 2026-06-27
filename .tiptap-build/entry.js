export { Editor } from '@tiptap/core';
export { default as StarterKit } from '@tiptap/starter-kit';
import Youtube from '@tiptap/extension-youtube';
export { default as TaskList } from '@tiptap/extension-task-list';
export { default as TaskItem } from '@tiptap/extension-task-item';
export { default as UnderlineExtension } from '@tiptap/extension-underline';

// YouTube削除ボタン付きNodeViewを持つ拡張
const CustomYoutubeExtension = Youtube.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      // コンテナ（div）を作成
      const container = document.createElement('div');
      container.className = 'yt-node-view';
      container.setAttribute('data-youtube-video', '');
      container.style.position = 'relative';

      // iframe要素
      const iframe = document.createElement('iframe');
      iframe.src = node.attrs.src;
      iframe.width = node.attrs.width || 640;
      iframe.height = node.attrs.height || 480;
      iframe.allowFullscreen = true;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.style.border = '0';
      iframe.style.width = '100%';
      iframe.style.aspectRatio = '16/9';
      iframe.style.borderRadius = '12px';
      container.appendChild(iframe);

      // 削除ボタン（常にDOMに存在、CSSで表示/非表示を制御）
      const delBtn = document.createElement('button');
      delBtn.className = 'yt-del-btn-static';
      delBtn.type = 'button';
      delBtn.contentEditable = 'false';
      delBtn.title = 'YouTube動画を削除';
      delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';

      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editor.isEditable) return;
        if (confirm('このYouTube動画を削除しますか？')) {
          // Undo用にHTMLを保存（グローバル変数経由）
          if (typeof window !== 'undefined' && window._setLastDeletedContent) {
            window._setLastDeletedContent(editor.getHTML());
          }
          const pos = typeof getPos === 'function' ? getPos() : null;
          if (pos !== null) {
            editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
          }
          if (typeof window !== 'undefined' && window._showToast) {
            window._showToast('YouTube動画を削除しました');
          }
        }
      });

      container.appendChild(delBtn);

      return {
        dom: container,
        contentDOM: null,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'youtube') return false;
          iframe.src = updatedNode.attrs.src;
          if (updatedNode.attrs.width) iframe.width = updatedNode.attrs.width;
          if (updatedNode.attrs.height) iframe.height = updatedNode.attrs.height;
          return true;
        },
        destroy: () => {
          // クリーンアップ（必要に応じて）
        },
      };
    };
  },
});

export { CustomYoutubeExtension as YoutubeExtension };

import { TextStyle } from '@tiptap/extension-text-style';

// 文字色（color）属性付きTextStyle
const ColorTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML: element => element.style.color || null,
        renderHTML: attributes => {
          if (!attributes.color) return {};
          return { style: `color: ${attributes.color}` };
        },
      },
    };
  },
});

export { ColorTextStyle as TextStyleExtension };

import ImageExtension from '@tiptap/extension-image';

// 画像ごとに class 属性を保持し、削除ボタン付きNodeViewを持つ拡張
const CustomImageExtension = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: element => {
          const cls = element.getAttribute('class') || '';
          // HTMLAttributes が 'inserted-img' を付与するので、ここでは除去して保存
          const extra = cls.split(' ').filter(c => c !== 'inserted-img').join(' ');
          return extra || null;
        },
        renderHTML: attributes => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },

  // NodeViewを使って画像と削除ボタンをセットでレンダリング
  addNodeView() {
    return ({ node, editor, getPos }) => {
      // コンテナ（span）を作成
      const container = document.createElement('span');
      container.className = 'img-node-view';
      container.style.position = 'relative';
      container.style.display = 'inline-block';

      // 画像要素
      const img = document.createElement('img');
      img.src = node.attrs.src;
      if (node.attrs.alt) img.alt = node.attrs.alt;
      if (node.attrs.title) img.title = node.attrs.title;
      // クラス属性（portrait-img, landscape-img等）
      const classes = ['inserted-img'];
      if (node.attrs.class) classes.push(node.attrs.class);
      img.className = classes.join(' ');
      container.appendChild(img);

      // 削除ボタン（常にDOMに存在、CSSで表示/非表示を制御）
      const delBtn = document.createElement('button');
      delBtn.className = 'img-del-btn-static';
      delBtn.type = 'button';
      delBtn.contentEditable = 'false';
      delBtn.title = '画像を削除';
      delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';

      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editor.isEditable) return;
        if (confirm('この画像を削除しますか？')) {
          // Undo用にHTMLを保存（グローバル変数経由）
          if (typeof window !== 'undefined' && window._setLastDeletedContent) {
            window._setLastDeletedContent(editor.getHTML());
          }
          const pos = typeof getPos === 'function' ? getPos() : null;
          if (pos !== null) {
            editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
          }
          if (typeof window !== 'undefined' && window._showToast) {
            window._showToast('画像を削除しました');
          }
        }
      });

      container.appendChild(delBtn);

      return {
        dom: container,
        contentDOM: null,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'image') return false;
          img.src = updatedNode.attrs.src;
          if (updatedNode.attrs.alt) img.alt = updatedNode.attrs.alt;
          if (updatedNode.attrs.title) img.title = updatedNode.attrs.title;
          const newClasses = ['inserted-img'];
          if (updatedNode.attrs.class) newClasses.push(updatedNode.attrs.class);
          img.className = newClasses.join(' ');
          return true;
        },
        destroy: () => {
          // クリーンアップ（必要に応じて）
        },
      };
    };
  },
});

export { CustomImageExtension as ImageExtension };
