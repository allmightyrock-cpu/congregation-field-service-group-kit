import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';

export function mountRichNoticeEditor({ root, content }) {
  root.innerHTML = `
    <div class="editor-toolbar" role="toolbar" aria-label="광고 편집 도구">
      <button type="button" data-cmd="heading" title="제목">제목</button>
      <button type="button" data-cmd="bold" title="굵게">B</button>
      <button type="button" data-cmd="bullet" title="목록">목록</button>
      <button type="button" data-cmd="highlight" title="형광">형광</button>
      <button type="button" data-cmd="link" title="링크">링크</button>
      <button type="button" data-cmd="hr" title="구분선">구분선</button>
    </div>
    <div class="editor-surface" data-editor></div>
  `;

  const surface = root.querySelector('[data-editor]');
  const editor = new Editor({
    element: surface,
    content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      Highlight,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
      }),
      Placeholder.configure({
        placeholder: '회중 광고 내용을 입력하세요.'
      })
    ],
    editorProps: {
      attributes: {
        class: 'notice-editor-content'
      }
    },
    onSelectionUpdate: () => refreshToolbar(root, editor),
    onUpdate: () => refreshToolbar(root, editor)
  });

  root.querySelector('[data-cmd="heading"]').onclick = () => {
    editor.chain().focus().toggleHeading({ level: 2 }).run();
    refreshToolbar(root, editor);
  };
  root.querySelector('[data-cmd="bold"]').onclick = () => {
    editor.chain().focus().toggleBold().run();
    refreshToolbar(root, editor);
  };
  root.querySelector('[data-cmd="bullet"]').onclick = () => {
    editor.chain().focus().toggleBulletList().run();
    refreshToolbar(root, editor);
  };
  root.querySelector('[data-cmd="highlight"]').onclick = () => {
    editor.chain().focus().toggleHighlight().run();
    refreshToolbar(root, editor);
  };
  root.querySelector('[data-cmd="link"]').onclick = () => setLink(editor);
  root.querySelector('[data-cmd="hr"]').onclick = () => editor.chain().focus().setHorizontalRule().run();

  refreshToolbar(root, editor);

  return {
    getValue() {
      return {
        html: editor.getHTML(),
        json: editor.getJSON(),
        text: editor.getText({ blockSeparator: '\n' })
      };
    },
    destroy() {
      editor.destroy();
    }
  };
}

function setLink(editor) {
  const previous = editor.getAttributes('link').href || '';
  const url = window.prompt('연결할 주소를 입력하세요.', previous);
  if (url === null) return;
  if (!url.trim()) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
}

function refreshToolbar(root, editor) {
  const state = {
    heading: editor.isActive('heading', { level: 2 }),
    bold: editor.isActive('bold'),
    bullet: editor.isActive('bulletList'),
    highlight: editor.isActive('highlight'),
    link: editor.isActive('link')
  };
  for (const [cmd, on] of Object.entries(state)) {
    const button = root.querySelector(`[data-cmd="${cmd}"]`);
    if (button) button.classList.toggle('on', on);
  }
}
