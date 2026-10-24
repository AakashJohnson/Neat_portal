// TipTap schema for the product rich-text fields (replaces the contenteditable
// + document.execCommand engine of @kolkov/angular-editor, see DEV-F08).
// Built to keep the markup stored by the old editor when a field is edited:
//   - execCommand tags: <b>, <i>, <u>, <strike>, <sub>, <sup>, <font face size
//     color>, <blockquote>, <div> (Chrome's paragraph separator), <pre>;
//   - pasted Word/Docs markup: <span class lang dir role>, class/dir/lang/role/
//     align on blocks, tables with their legacy attributes;
//   - containers with only inline content (<div>, <li>, <blockquote>, <td>)
//     keep it inline instead of gaining a <p>.
// Style attributes are not modelled: the Angular sanitizer removed them from
// everything the old editor saved.
import { Extension, Mark, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { Strike } from '@tiptap/extension-strike';
import { Blockquote } from '@tiptap/extension-blockquote';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { BackgroundColor, TextStyle } from '@tiptap/extension-text-style';
import { Image } from '@tiptap/extension-image';

const BLOCK_TAGS = new Set(['ADDRESS', 'ARTICLE', 'BLOCKQUOTE', 'DIV', 'DL', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'UL']);
const hasBlockChild = (el) => [...el.children].some((c) => BLOCK_TAGS.has(c.tagName));

/** A plain HTML attribute kept as is (null = absent). */
const attr = (name) => ({
  default: null,
  parseHTML: (el) => el.getAttribute(name),
  renderHTML: (attrs) => (attrs[name] == null ? {} : { [name]: attrs[name] }),
});
const attrs = (...names) => Object.fromEntries(names.map((n) => [n, attr(n)]));
const BLOCK_ATTRS = ['class', 'dir', 'lang', 'role', 'align', 'title'];

/**
 * <tag> with only inline content → `${name}Inline` (content inline*);
 * otherwise → `${name}Block` (content block+).
 */
function containerPair(name, tag, extraAttrs = []) {
  const common = (suffix, content, blockChildren) =>
    Node.create({
      name: `${name}${suffix}`,
      group: 'block',
      content,
      defining: true,
      addAttributes: () => attrs(...BLOCK_ATTRS, ...extraAttrs),
      parseHTML: () => [{ tag, priority: 60, getAttrs: (el) => (hasBlockChild(el) === blockChildren ? null : false) }],
      renderHTML: ({ HTMLAttributes }) => [tag, HTMLAttributes, 0],
    });
  return [common('Inline', 'inline*', false), common('Block', 'block+', true)];
}

const LegacyAttributes = Extension.create({
  name: 'legacyAttributes',
  addGlobalAttributes: () => [
    { types: ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'listItem', 'pre'], attributes: attrs(...BLOCK_ATTRS) },
    { types: ['listItem', 'listItemInline'], attributes: attrs('aria-level', 'aria-setsize') },
    { types: ['bulletList'], attributes: attrs('type') },
  ],
});

/** <font face size color> — what execCommand fontName / fontSize / foreColor insert. */
const Font = Mark.create({
  name: 'font',
  excludes: '',
  addAttributes: () => attrs('face', 'size', 'color'),
  parseHTML: () => [{ tag: 'font' }],
  renderHTML: ({ HTMLAttributes }) => ['font', HTMLAttributes, 0],
});

/** <span> carrying class / lang / dir / role (pasted Word/Docs markup). */
const LegacySpan = Mark.create({
  name: 'legacySpan',
  excludes: '',
  addAttributes: () => attrs('class', 'lang', 'dir', 'role'),
  parseHTML: () => [{ tag: 'span', getAttrs: (el) => (['class', 'lang', 'dir', 'role'].some((a) => el.hasAttribute(a)) ? null : false) }],
  renderHTML: ({ HTMLAttributes }) => ['span', HTMLAttributes, 0],
});

/** formatBlock 'pre' inserts a bare <pre> (not <pre><code>). */
const Pre = Node.create({
  name: 'pre',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML: () => [{ tag: 'pre', preserveWhitespace: 'full' }],
  renderHTML: ({ HTMLAttributes }) => ['pre', HTMLAttributes, 0],
});

const [DivInline, DivBlock] = containerPair('div', 'div');
const [BlockquoteInline] = containerPair('blockquote', 'blockquote');
const [ListItemInline] = containerPair('listItem', 'li');

const Table = Node.create({
  name: 'table',
  group: 'block',
  content: 'colgroup? tableSection+',
  isolating: true,
  addAttributes: () => attrs('border', 'cellpadding', 'cellspacing', 'width', 'class'),
  parseHTML: () => [{ tag: 'table' }],
  renderHTML: ({ HTMLAttributes }) => ['table', HTMLAttributes, 0],
});
const Colgroup = Node.create({
  name: 'colgroup',
  content: 'col*',
  parseHTML: () => [{ tag: 'colgroup' }],
  renderHTML: () => ['colgroup', 0],
});
const Col = Node.create({
  name: 'col',
  atom: true,
  addAttributes: () => attrs('width', 'span'),
  parseHTML: () => [{ tag: 'col' }],
  renderHTML: ({ HTMLAttributes }) => ['col', HTMLAttributes],
});
const TableSection = Node.create({
  name: 'tableSection',
  content: 'tableRow+',
  addAttributes: () => ({ tag: { default: 'tbody', rendered: false, parseHTML: (el) => el.tagName.toLowerCase() } }),
  parseHTML: () => [{ tag: 'thead' }, { tag: 'tbody' }, { tag: 'tfoot' }],
  renderHTML: ({ node, HTMLAttributes }) => [node.attrs.tag, HTMLAttributes, 0],
});
const TableRow = Node.create({
  name: 'tableRow',
  content: '(tableCellInline | tableCellBlock)+',
  addAttributes: () => attrs('height', 'class'),
  parseHTML: () => [{ tag: 'tr' }],
  renderHTML: ({ HTMLAttributes }) => ['tr', HTMLAttributes, 0],
});
const cell = (suffix, content, blockChildren) =>
  Node.create({
    name: `tableCell${suffix}`,
    content,
    isolating: true,
    addAttributes: () => ({
      tag: { default: 'td', rendered: false, parseHTML: (el) => el.tagName.toLowerCase() },
      ...attrs('width', 'valign', 'nowrap', 'rowspan', 'colspan', 'height', 'class', 'scope'),
    }),
    parseHTML: () => ['td', 'th'].map((tag) => ({ tag, getAttrs: (el) => (hasBlockChild(el) === blockChildren ? null : false) })),
    renderHTML: ({ node, HTMLAttributes }) => [node.attrs.tag, HTMLAttributes, 0],
  });

export const legacyExtensions = [
  StarterKit.configure({
    bold: false,
    italic: false,
    strike: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    codeBlock: false,
    trailingNode: false,
    link: { openOnClick: false, autolink: false, linkOnPaste: false, HTMLAttributes: { target: null, rel: null, class: null } },
  }),
  Bold.extend({ renderHTML: ({ HTMLAttributes }) => ['b', HTMLAttributes, 0] }),
  Italic.extend({ renderHTML: ({ HTMLAttributes }) => ['i', HTMLAttributes, 0] }),
  Strike.extend({ renderHTML: ({ HTMLAttributes }) => ['strike', HTMLAttributes, 0] }),
  Blockquote.extend({ content: 'block+' }),
  BulletList.extend({ content: '(listItem | listItemInline)+' }),
  OrderedList.extend({ content: '(listItem | listItemInline)+' }),
  ListItem.extend({ content: 'block+' }),
  ListItemInline,
  BlockquoteInline,
  DivInline,
  DivBlock,
  Pre,
  Table,
  Colgroup,
  Col,
  TableSection,
  TableRow,
  cell('Inline', 'inline*', false),
  cell('Block', 'block+', true),
  Subscript,
  Superscript,
  TextAlign.configure({ types: ['paragraph', 'heading', 'divInline', 'pre'] }),
  TextStyle,
  BackgroundColor,
  Font,
  LegacySpan,
  Image.configure({ inline: true, allowBase64: true }),
  LegacyAttributes,
];
