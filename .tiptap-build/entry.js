export { Editor } from '@tiptap/core';
export { default as StarterKit } from '@tiptap/starter-kit';
export { default as YoutubeExtension } from '@tiptap/extension-youtube';
export { default as TaskList } from '@tiptap/extension-task-list';
export { default as TaskItem } from '@tiptap/extension-task-item';
export { default as UnderlineExtension } from '@tiptap/extension-underline';

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

// 画像ごとに class 属性を保持できるよう拡張
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
});

export { CustomImageExtension as ImageExtension };
