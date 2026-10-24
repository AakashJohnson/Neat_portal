'use client';
// Port of <angular-editor> (@kolkov/angular-editor 1.1.2, default config) used
// as a reactive-form control in the company product form. Same DOM, toolbar,
// classes and styles (public/legacy/angular-editor.css); the editing engine is
// TipTap instead of contenteditable + document.execCommand (DEV-F08), with the
// schema in legacyExtensions.js.
// Behaviour kept from the original:
//   - writeValue() (form → editor) never emits; only edits do, and they emit
//     the Angular-sanitized HTML ('' for an empty editor);
//   - placeholder toggling with the original's showPlaceholder logic;
//   - one AngularEditorService for every editor (saved selection / text);
//   - toolbar state from document.queryCommandState/Value and ids
//     "<button>-<id>" looked up with getElementById (id '' → the first editor's
//     toolbar on the page, as in the original);
//   - "HTML Code" switches the area to an editable <pre><code> source view.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import AeSelect from '@/components/editor/AeSelect';
import { legacyExtensions } from '@/components/editor/legacyExtensions';
import { ngSanitizeHtml } from '@/lib/ngSanitize';

const CONFIG_PLACEHOLDER = 'Enter text here...';
const UPLOAD_URL = 'v1/image';
const FONTS = ['Arial', 'Times New Roman', 'Calibri', 'Comic Sans MS'].map((n) => ({ label: n, value: n }));
const HEADINGS = [
  ['Heading 1', 'h1'],
  ['Heading 2', 'h2'],
  ['Heading 3', 'h3'],
  ['Heading 4', 'h4'],
  ['Heading 5', 'h5'],
  ['Heading 6', 'h6'],
  ['Heading 7', 'h7'],
  ['Paragraph', 'p'],
  ['Predefined', 'pre'],
  ['Standard', 'div'],
  ['default', 'default'],
].map(([label, value]) => ({ label, value }));
const FONT_SIZES = ['1', '2', '3', '4', '5', '6', '7'].map((v) => ({ label: v, value: v }));
const BUTTONS = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'indent', 'outdent', 'insertUnorderedList', 'insertOrderedList', 'link'];
const SELECT = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'PRE', 'DIV'];
const TAG_MAP = { BLOCKQUOTE: 'indent', A: 'link' };

// ---- AngularEditorService (providedIn: 'root': shared by all editors)
const service = {
  savedSelection: null,
  selectedText: undefined,
  listeners: new Set(),
  saveSelection() {
    const sel = document.getSelection?.();
    if (sel && sel.getRangeAt && sel.rangeCount) {
      service.savedSelection = sel.getRangeAt(0);
      service.selectedText = sel.toString();
      service.listeners.forEach((l) => l());
    }
  },
  subscribe(l) {
    service.listeners.add(l);
    return () => service.listeners.delete(l);
  },
};
const later = (fn, timeout = 100) => setTimeout(fn, timeout);

const sanitizeEmitted = (html) => {
  const out = ngSanitizeHtml(html);
  return out === '<br>' ? '' : out;
};

function Button({ name, title, icon, onClick, disabled }) {
  return (
    <button id={name ? `${name}-` : undefined} type="button" title={title} className="angular-editor-button" onClick={onClick} disabled={disabled} tabIndex="-1">
      {icon}
    </button>
  );
}
const fa = (cls) => <i className={`fa ${cls}`}></i>;

export default function AngularEditor({ value, onChange, onBlur, placeholder = '' }) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [showPlaceholder, setShowPlaceholderState] = useState(false);
  const showPlaceholderRef = useRef(false);
  const [linkSelected, setLinkSelected] = useState(false);
  const [block, setBlock] = useState('default');
  const [fontName, setFontNameState] = useState('Times New Roman');
  const [fontSize, setFontSizeState] = useState('3');
  const selectedText = useSyncExternalStore(service.subscribe, () => service.selectedText, () => undefined);
  const focused = useRef(false);
  const lastEmitted = useRef(undefined);
  const lastWritten = useRef(undefined);
  const textAreaRef = useRef(null);
  const sourceRef = useRef(null);
  const fgInput = useRef(null);
  const bgInput = useRef(null);
  const fileInput = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const togglePlaceholder = (current) => {
    showPlaceholderRef.current = !current;
    setShowPlaceholderState(!current);
  };

  const emit = (html) => {
    const v = sanitizeEmitted(html);
    lastEmitted.current = v;
    onChangeRef.current?.(v);
    if (!html !== showPlaceholderRef.current) togglePlaceholder(showPlaceholderRef.current);
  };

  const editor = useEditor({
    extensions: legacyExtensions,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'angular-editor-textarea', spellcheck: 'true', translate: 'yes', style: 'height: auto; min-height: 0px;' },
    },
    // onContentChange(): innerHTML, '' when empty.
    onUpdate: ({ editor: e }) => emit(e.isEmpty ? '' : e.getHTML()),
  });

  // writeValue(): form value → editor, without emitting.
  useEffect(() => {
    if (!editor || value === lastEmitted.current || value === lastWritten.current) return;
    lastWritten.current = value;
    if ((!value || value === '<br>' || value === '') !== showPlaceholderRef.current) togglePlaceholder(showPlaceholderRef.current);
    editor.commands.setContent(value === undefined || value === null || value === '<br>' ? '' : value, { emitUpdate: false });
  }, [editor, value]);

  const textArea = () => (htmlMode ? textAreaRef.current : editor?.view.dom);

  // exec(): toolbar state from the document's command state and the selection's ancestors.
  const exec = () => {
    for (const name of BUTTONS) {
      const el = document.getElementById(`${name}-`);
      el?.classList.toggle('active', document.queryCommandState(name));
    }
    const sel = document.getSelection?.();
    if (sel) later(service.saveSelection);
    const els = [];
    for (let a = sel?.focusNode; a && a.id !== 'editor'; a = a.parentNode) els.unshift(a);
    setLinkSelected(els.findIndex((x) => x.nodeName === 'A') > -1);
    const found = SELECT.map((y) => els.find((x) => x.nodeName === y)).find(Boolean);
    setBlock(found ? found.nodeName.toLowerCase() : 'default');
    for (const [tag, name] of Object.entries(TAG_MAP)) {
      document.getElementById(`${name}-`)?.classList.toggle('active', els.some((x) => x.nodeName === tag));
    }
    setFontSizeState(document.queryCommandValue('FontSize'));
    setFontNameState(document.queryCommandValue('FontName').replace(/"/g, ''));
  };

  const focus = () => {
    if (!htmlMode) editor?.commands.focus();
    else {
      sourceRef.current?.focus();
      focused.current = true;
    }
  };

  const toggleEditorMode = () => {
    if (!htmlMode) {
      const source = editor.view.dom.innerHTML;
      setHtmlMode(true);
      later(() => {
        if (sourceRef.current) {
          sourceRef.current.textContent = source;
          sourceRef.current.focus();
        }
      }, 0);
    } else {
      const text = textAreaRef.current?.innerText ?? '';
      setHtmlMode(false);
      editor.commands.setContent(text, { emitUpdate: false });
      emit(editor.isEmpty ? '' : editor.getHTML());
      later(() => editor.commands.focus(), 0);
    }
  };

  /** executeCommand(command) of AngularEditorComponent + AngularEditorService. */
  const executeCommand = (command) => {
    if (!editor) return;
    if (command === 'toggleEditorMode') return toggleEditorMode();
    focus();
    if (command === '') return;
    const chain = editor.chain().focus();
    const inList = editor.isActive('listItem') || editor.isActive('listItemInline');
    const run = {
      default: () => (editor.isActive('heading') || editor.isActive('pre') ? chain.setParagraph() : chain),
      h1: () => chain.setHeading({ level: 1 }),
      h2: () => chain.setHeading({ level: 2 }),
      h3: () => chain.setHeading({ level: 3 }),
      h4: () => chain.setHeading({ level: 4 }),
      h5: () => chain.setHeading({ level: 5 }),
      h6: () => chain.setHeading({ level: 6 }),
      p: () => chain.setParagraph(),
      pre: () => chain.setNode('pre'),
      undo: () => chain.undo(),
      redo: () => chain.redo(),
      bold: () => chain.toggleBold(),
      italic: () => chain.toggleItalic(),
      underline: () => chain.toggleUnderline(),
      strikeThrough: () => chain.toggleStrike(),
      subscript: () => chain.toggleSubscript(),
      superscript: () => chain.toggleSuperscript(),
      justifyLeft: () => chain.setTextAlign('left'),
      justifyCenter: () => chain.setTextAlign('center'),
      justifyRight: () => chain.setTextAlign('right'),
      justifyFull: () => chain.setTextAlign('justify'),
      indent: () => (inList ? chain.sinkListItem('listItem') : chain.wrapIn('blockquote')),
      outdent: () => (inList ? chain.liftListItem('listItem') : chain.lift('blockquote')),
      insertUnorderedList: () => chain.toggleBulletList(),
      insertOrderedList: () => chain.toggleOrderedList(),
      insertHorizontalRule: () => chain.setHorizontalRule(),
      // removeFormat leaves links in place.
      removeFormat: () => Object.keys(editor.schema.marks).filter((m) => m !== 'link').reduce((c, m) => c.unsetMark(m), chain),
      unlink: () => chain.unsetLink(),
    }[command];
    // 'h7' / 'div' are passed to execCommand as command names: no-ops.
    if (run) run().run();
    exec();
  };

  const insertUrl = () => {
    let url = 'https://';
    const selection = service.savedSelection;
    const parent = selection?.commonAncestorContainer.parentElement;
    if (parent?.nodeName === 'A' && parent.href !== '') url = parent.href;
    url = prompt('Insert URL link', url);
    if (url && url !== '' && url !== 'https://') {
      if (!url.includes('http')) editor.chain().focus().setLink({ href: url }).run();
      else editor.chain().focus().insertContent(`<a href="${url}" target="_blank">${service.selectedText}</a>`).run();
    }
  };

  const insertVideo = async () => {
    executeCommand('');
    const url = prompt('Insert Video link', 'https://');
    if (!url || url === '' || url === 'https://') return;
    if (url.match('www.youtube.com')) {
      const id = url.split('v=')[1];
      editor
        .chain()
        .focus()
        .insertContent(
          `<div><img src="https://img.icons8.com/color/96/000000/youtube-play.png"/><a href='${url}' target='_blank'><img src="https://img.youtube.com/vi/${id}/0.jpg" alt="click to watch"/></a></div>`,
        )
        .run();
    }
    if (url.match('vimeo.com')) {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${url}`);
      if (res.ok) {
        const data = await res.json();
        editor.chain().focus().insertContent(`<div><a href='${url}' target='_blank'><img src="${data.thumbnail_url_with_play_button}" alt="${data.title}"/></a></div>`).run();
      }
    }
  };

  const insertColor = (color, where) => {
    if (service.savedSelection) {
      const chain = editor.chain().focus();
      (where === 'textColor' ? chain.setMark('font', { color }) : chain.setBackgroundColor(color)).run();
    }
    executeCommand('');
  };

  const onFileChanged = async (event) => {
    const file = event.target.files[0];
    if (!file?.type.includes('image/')) return;
    // config.uploadUrl ('v1/image', relative to <base href="/">) is set, so the image is POSTed there.
    const uploadData = new FormData();
    uploadData.append('file', file, file.name);
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: uploadData });
    if (!res.ok) return;
    const body = await res.json();
    editor.chain().focus().setImage({ src: body.imageUrl }).run();
    if (fileInput.current) fileInput.current.value = '';
  };

  const onTextAreaFocus = (e) => {
    if (focused.current) {
      e.stopPropagation();
      return;
    }
    focused.current = true;
  };
  const onTextAreaBlur = (e) => {
    later(service.saveSelection);
    onBlur?.();
    if (e.relatedTarget !== null) {
      const parent = e.relatedTarget.parentElement;
      if (!parent.classList.contains('angular-editor-toolbar-set') && !parent.classList.contains('ae-picker')) focused.current = false;
    }
  };
  const areaHandlers = {
    onFocus: onTextAreaFocus,
    onBlur: onTextAreaBlur,
    onClick: exec,
    onKeyUp: exec,
    onMouseOut: () => service.saveSelection(),
  };

  return (
    <angular-editor tabIndex="-1" onFocus={(e) => e.target === e.currentTarget && focus()}>
      <div className="angular-editor" style={{ width: 'auto', minWidth: '0px' }}>
        <angular-editor-toolbar>
          <div className="angular-editor-toolbar">
            <div className="angular-editor-toolbar-set">
              <Button title="Undo" icon={fa('fa-undo')} onClick={() => executeCommand('undo')} />
              <Button title="Redo" icon={fa('fa-repeat')} onClick={() => executeCommand('redo')} />
            </div>
            <div className="angular-editor-toolbar-set">
              <Button name="bold" title="Bold" icon={fa('fa-bold')} disabled={htmlMode} onClick={() => executeCommand('bold')} />
              <Button name="italic" title="Italic" icon={fa('fa-italic')} disabled={htmlMode} onClick={() => executeCommand('italic')} />
              <Button name="underline" title="Underline" icon={fa('fa-underline')} disabled={htmlMode} onClick={() => executeCommand('underline')} />
              <Button name="strikeThrough" title="Strikethrough" icon={fa('fa-strikethrough')} disabled={htmlMode} onClick={() => executeCommand('strikeThrough')} />
              <Button name="subscript" title="Subscript" icon={fa('fa-subscript')} disabled={htmlMode} onClick={() => executeCommand('subscript')} />
              <Button name="superscript" title="Superscript" icon={fa('fa-superscript')} disabled={htmlMode} onClick={() => executeCommand('superscript')} />
            </div>
            <div className="angular-editor-toolbar-set">
              <Button name="justifyLeft" title="Justify Left" icon={fa('fa-align-left')} disabled={htmlMode} onClick={() => executeCommand('justifyLeft')} />
              <Button name="justifyCenter" title="Justify Center" icon={fa('fa-align-center')} disabled={htmlMode} onClick={() => executeCommand('justifyCenter')} />
              <Button name="justifyRight" title="Justify Right" icon={fa('fa-align-right')} disabled={htmlMode} onClick={() => executeCommand('justifyRight')} />
              <Button name="justifyFull" title="Justify Full" icon={fa('fa-align-justify')} disabled={htmlMode} onClick={() => executeCommand('justifyFull')} />
            </div>
            <div className="angular-editor-toolbar-set">
              <Button name="indent" title="Indent" icon={fa('fa-indent')} disabled={htmlMode} onClick={() => executeCommand('indent')} />
              <Button name="outdent" title="Outdent" icon={fa('fa-outdent')} disabled={htmlMode} onClick={() => executeCommand('outdent')} />
            </div>
            <div className="angular-editor-toolbar-set">
              <Button name="insertUnorderedList" title="Unordered List" icon={fa('fa-list-ul')} disabled={htmlMode} onClick={() => executeCommand('insertUnorderedList')} />
              <Button name="insertOrderedList" title="Ordered List" icon={fa('fa-list-ol')} disabled={htmlMode} onClick={() => executeCommand('insertOrderedList')} />
            </div>
            <div className="angular-editor-toolbar-set">
              <AeSelect
                className="select-heading"
                options={HEADINGS}
                value={block}
                disabled={htmlMode}
                onSelect={(v) => {
                  setBlock(v);
                  executeCommand(v);
                }}
              />
            </div>
            <div className="angular-editor-toolbar-set">
              <AeSelect
                className="select-font"
                options={FONTS}
                value={fontName}
                disabled={htmlMode}
                onSelect={(v) => {
                  setFontNameState(v);
                  editor?.chain().focus().setMark('font', { face: v }).run();
                  executeCommand('');
                }}
              />
            </div>
            <div className="angular-editor-toolbar-set">
              <AeSelect
                className="select-font-size"
                options={FONT_SIZES}
                value={fontSize}
                disabled={htmlMode}
                onSelect={(v) => {
                  setFontSizeState(v);
                  editor?.chain().focus().setMark('font', { size: v }).run();
                  executeCommand('');
                }}
              />
            </div>
            <div className="angular-editor-toolbar-set">
              <input ref={fgInput} style={{ display: 'none' }} type="color" onChange={(e) => insertColor(e.target.value, 'textColor')} />
              <button id="foregroundColorPicker-" type="button" className="angular-editor-button" onClick={() => fgInput.current.click()} title="Text Color" disabled={htmlMode} tabIndex="-1">
                <span className="color-label foreground">{fa('fa-font')}</span>
              </button>
              <input ref={bgInput} style={{ display: 'none' }} type="color" onChange={(e) => insertColor(e.target.value, 'backgroundColor')} />
              <button id="backgroundColorPicker-" type="button" className="angular-editor-button" onClick={() => bgInput.current.click()} title="Background Color" disabled={htmlMode} tabIndex="-1">
                <span className="color-label background">{fa('fa-font')}</span>
              </button>
            </div>
            <div className="angular-editor-toolbar-set">
              <Button name="link" title="Insert Link" icon={fa('fa-link')} disabled={htmlMode || !selectedText} onClick={insertUrl} />
              <Button name="unlink" title="Unlink" icon={fa('fa-chain-broken')} disabled={htmlMode || !linkSelected} onClick={() => executeCommand('unlink')} />
              <input ref={fileInput} style={{ display: 'none' }} accept="image/*" type="file" onChange={onFileChanged} />
              <Button name="insertImage" title="Insert Image" icon={fa('fa-image')} disabled={htmlMode} onClick={() => fileInput.current.click()} />
              <Button name="insertVideo" title="Insert Video" icon={fa('fa-video-camera')} disabled={htmlMode} onClick={insertVideo} />
              <Button name="insertHorizontalRule" title="Horizontal Line" icon={fa('fa-minus')} disabled={htmlMode} onClick={() => executeCommand('insertHorizontalRule')} />
            </div>
            <div className="angular-editor-toolbar-set">
              <Button name="clearFormatting" title="Clear Formatting" icon={fa('fa-remove')} disabled={htmlMode} onClick={() => executeCommand('removeFormat')} />
            </div>
            <div className="angular-editor-toolbar-set">
              <button id="toggleEditorMode-" type="button" title="HTML Code" className={`angular-editor-button${htmlMode ? ' active' : ''}`} onClick={() => executeCommand('toggleEditorMode')} tabIndex="-1">
                {fa('fa-code')}
              </button>
            </div>
          </div>
        </angular-editor-toolbar>
        <div className={`angular-editor-wrapper${showPlaceholder ? ' show-placeholder' : ''}`} {...(htmlMode ? {} : areaHandlers)}>
          {htmlMode ? (
            <div
              ref={textAreaRef}
              className="angular-editor-textarea"
              contentEditable={false}
              spellCheck="true"
              translate="yes"
              style={{ height: 'auto', minHeight: '0px' }}
              onInput={() => emit(textArea()?.innerText ?? '')}
            >
              <pre style={{ margin: 0, outline: 'none' }}>
                <code
                  ref={sourceRef}
                  id="sourceText"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', outline: 'none', margin: 0, backgroundColor: '#fff5b9' }}
                  onFocus={onTextAreaFocus}
                  onBlur={onTextAreaBlur}
                />
              </pre>
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
          <span className="angular-editor-placeholder">{placeholder || CONFIG_PLACEHOLDER}</span>
        </div>
      </div>
    </angular-editor>
  );
}
