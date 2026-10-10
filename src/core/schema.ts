// Every setting the plugin offers. Adding a setting = adding a line here.
// `vars` are Obsidian CSS variables (preferred, stable across updates); `rule` is selector CSS for gaps.
export type Kind = 'num' | 'color' | 'text' | 'select' | 'toggle' // toggle: an icon button, stored 'yes' / 'no'
export type Def = {
  id: string
  label: string
  group: string
  sub?: string
  kind: Kind
  vars?: string[]
  rule?: (v: string) => [selector: string, declarations: string][]
  unit?: string
  min?: number
  max?: number
  hi?: number // highest value the number box accepts (default: twice max); the slider stops at max
  step?: number
  options?: string[]
  scope?: string // selector the variable is set on (default: the whole app), so a setting can stay inside notes
  fonts?: boolean // text box suggests the fonts installed on this computer
  fallback?: string // shown as the default when no variable can be read
  tip?: string // description under the setting's name: what it does
  icon?: string // Lucide icon shown before the name
  sec?: string // section heading inside its box (Color, Shape, Spacing...); 'Indent steps' is a small collapsible box
  probe?: [selector: string, property: string] // no variable to read: the value is read from this part of a sample callout (main.ts), so the swatch starts at the theme's own color
  follows?: string // id of the All lists setting this one overrides for its own list type; unset = follows it
}

type Opt = Partial<Def>
const num = (group: string, id: string, label: string, v: string, unit: string, min: number, max: number, step: number, o: Opt = {}): Def =>
  ({ group, id, label, kind: 'num', vars: [v], unit, min, max, step, ...o })
const color = (group: string, id: string, label: string, v: string, o: Opt = {}): Def => ({ group, id, label, kind: 'color', vars: [v], ...o })
const select = (group: string, id: string, label: string, v: string, options: string[], o: Opt = {}): Def => ({ group, id, label, kind: 'select', vars: [v], options, ...o })
const text = (group: string, id: string, label: string, v: string[], o: Opt = {}): Def => ({ group, id, label, kind: 'text', vars: v, ...o })
const NOTES = '.markdown-source-view.mod-cm6, .markdown-preview-view'

export const GROUPS = ['Page', 'Text & links', 'Headings', 'Lists', 'Quotes & rules', 'Editor'] as const

const P = 'Page', T = 'Text & links', H = 'Headings', L = 'Lists', Q = 'Quotes & rules', E = 'Editor'
const MD = '.markdown-source-view.mod-cm6 .cm-content, .markdown-preview-view'

export const hSel = (n: number) => `.markdown-preview-view h${n}, .markdown-source-view.mod-cm6 .HyperMD-header-${n}`
// Letter case: [text-transform, font-variant-caps].
export const CASES: Record<string, [string, string]> = {
  'normal': ['none', 'normal'], 'ALL CAPS': ['uppercase', 'normal'], 'lowercase': ['lowercase', 'normal'], 'Capitalize Each Word': ['capitalize', 'normal'],
  'small caps': ['none', 'small-caps'], 'all small caps': ['none', 'all-small-caps'],
}
const headings = (n: number): Def[] => {
  const s = `H${n}`
  return [
    num(H, `h${n}-size`, 'Size', `--h${n}-size`, 'em', 0.5, 5, 0.05, { sub: s, icon: 'a-large-small', tip: `How big H${n} is, in em (1 = body text size).` }),
    num(H, `h${n}-weight`, 'Weight', `--h${n}-weight`, '', 100, 900, 100, { hi: 1000, sub: s, icon: 'bold', tip: 'How thick the letters are: 400 is normal, 700 is bold. Only steps the font has will show.' }),
    color(H, `h${n}-color`, 'Color', `--h${n}-color`, { sub: s, icon: 'palette', tip: `Text color of H${n} in this theme.` }),
    text(H, `h${n}-font`, 'Font', [`--h${n}-font`], { sub: s, fallback: 'inherit', fonts: true, icon: 'type', tip: `Font for H${n} only. Start typing to pick from the fonts on this computer; empty = the note font.` }),
    num(H, `h${n}-lh`, 'Line height', `--h${n}-line-height`, '', 0.8, 3, 0.05, { sub: s, icon: 'move-vertical', tip: `Space between the lines of H${n}, for H${n} only. You only see it when a heading is long enough to wrap onto a second line (a multiple of the font size).` }),
    { group: H, sub: s, id: `h${n}-above`, label: 'Space above', kind: 'num', unit: 'em', min: 0, max: 3, step: 0.1, fallback: '0.8', icon: 'arrow-up-to-line', tip: `Empty space above H${n}, separating it from the text before.`,
      rule: v => [[`.markdown-preview-view div:has(> h${n})`, `margin-top:${v}`], [`.markdown-source-view.mod-cm6 .HyperMD-header-${n}`, `padding-top:${v} !important`]] },
    { group: H, sub: s, id: `h${n}-below`, label: 'Space below', kind: 'num', unit: 'em', min: 0, max: 3, step: 0.1, fallback: '0', icon: 'arrow-down-to-line', tip: `Empty space between H${n} and the text under it.`,
      rule: v => [[`.markdown-preview-view h${n}`, `margin-bottom:${v}`], [`.markdown-source-view.mod-cm6 .HyperMD-header-${n}`, `padding-bottom:${v} !important`]] },
    { group: H, sub: s, id: `h${n}-shift`, label: 'Shift left/right', kind: 'num', unit: 'px', min: -80, max: 80, step: 2, fallback: '0', icon: 'move-horizontal', tip: `Moves H${n} sideways: negative pulls it left into the margin, positive indents it.`,
      rule: v => [[`.markdown-preview-view :not(.callout-content) > h${n}, .markdown-source-view.mod-cm6 .HyperMD-header-${n}`, `position:relative;left:${v}`]] },
    { group: H, sub: s, id: `h${n}-spacing`, label: 'Letter spacing', kind: 'num', unit: 'em', min: -0.1, max: 0.5, step: 0.01, fallback: '0', icon: 'arrow-left-right', tip: 'Space between the letters. Negative packs them tighter, positive spreads them out.',
      rule: v => [[hSel(n), `letter-spacing:${v}`]] },
    // The style strip: letter case, italic and underline share one row (settingsTab).
    { group: H, sub: s, id: `h${n}-case`, label: 'Letter case', kind: 'select', options: Object.keys(CASES), fallback: 'normal', icon: 'case-sensitive',
      tip: 'How the heading is capitalized, whatever you typed: ALL CAPS, lowercase, Capitalize Each Word, small caps (capitals as typed, small capitals for the rest) or all small caps.',
      rule: v => { const [t, c] = CASES[v] ?? CASES.normal; return [[hSel(n), `text-transform:${t};font-variant-caps:${c}`]] } },
    { group: H, sub: s, id: `h${n}-italic`, label: 'Italic', kind: 'toggle', fallback: 'no', icon: 'italic', tip: `Slanted (italic) H${n}.`,
      rule: v => [[hSel(n), `font-style:${v === 'yes' ? 'italic' : 'normal'}`]] },
    { group: H, sub: s, id: `h${n}-underline`, label: 'Underline', kind: 'toggle', fallback: 'no', icon: 'underline', tip: `A line under H${n}.`,
      rule: v => [[hSel(n), `text-decoration:${v === 'yes' ? 'underline' : 'none'}`]] },
  ]
}

// Per-level indent steps: how far level k sits from level k-1, for bullet, numbered and checkbox lists. Each only sets `--cz-<t>step-<k>`;
// css.ts turns the steps into the Live Preview and Reading view rules (the sums need every step at once). An unset step follows All lists' Indent per level.
export const INDENT_TYPES = [
  { t: 'b', name: 'Bullet lists', native: 36 },
  { t: 'n', name: 'Numbered lists', native: 36 },
  { t: 'c', name: 'Checkbox lists', native: 36 },
] as const
const stepDef = (type: (typeof INDENT_TYPES)[number], k: number): Def =>
  ({ group: L, sub: type.name, sec: 'Indent steps', id: `${type.t}step-${k}`, label: `Level ${k} step`, kind: 'num', vars: [`--cz-${type.t}step-${k}`], unit: 'px', min: 0, max: 120, step: 2, fallback: String(type.native),
    follows: 'list-indent', icon: 'arrow-right-to-line', tip: `How far a level-${k + 1} item sits in from a level-${k} item.` })

// Gap between a list marker and its text. The text stays where it is (lined up with the rest of the note) and the marker moves out
// (positive) or in (negative). Live Preview: a negative start margin pulls the marker left and an equal end margin keeps the text in place.
// Reading view: bullets float and checkboxes hang left by a margin, so that margin grows; numbers are native markers that take no margin,
// so they are redrawn as a counter beside the item.
const LPL = '.markdown-source-view.mod-cm6 .HyperMD-list-line', RDV = '.markdown-preview-view'
// Lines (Live Preview) and lists (Reading view) of each type: b bullet, n numbered, c checkbox. [line selector, marker width px].
export const LINE: Record<string, [string, number]> = { b: [':not(.HyperMD-task-line):has(.cm-formatting-list-ul)', 20], n: [':has(.cm-formatting-list-ol)', 28], c: ['.HyperMD-task-line', 30] }
export const LIST: Record<string, string> = { b: 'ul:not(.contains-task-list)', n: 'ol', c: 'ul.contains-task-list' }

// Space above / below the items at one level of one list type. Obsidian pads every item with All lists' Space between items
// (--list-spacing) above and below; this replaces that padding for the chosen level only. Level 1 is the top level.
const space = (type: (typeof INDENT_TYPES)[number], k: number, side: 'above' | 'below'): Def => {
  const lists = [...Array<string>(k - 1).fill(':is(ul,ol)'), LIST[type.t]].map((x, i) => i ? x : `${x}:not(li *)`).join(' > li > ')
  return { group: L, sub: type.name, sec: `Space ${side}`, id: `${type.t}${side}-${k}`, label: `Level ${k}`, kind: 'num', unit: 'em', min: 0, max: 2, step: 0.025,
    follows: 'list-spacing', icon: side === 'above' ? 'arrow-up-to-line' : 'arrow-down-to-line', tip: `Space ${side} each level-${k} item${k === 1 ? ' (the top level)' : ''}.`,
    rule: v => [[`${LPL}-${k}${LINE[type.t][0]}, ${RDV} ${lists} > li`, `padding-${side === 'above' ? 'top' : 'bottom'}:${v} !important`]] }
}
const spaces = (type: (typeof INDENT_TYPES)[number]) => (['above', 'below'] as const).flatMap(side => [1, 2, 3, 4, 5, 6].map(k => space(type, k, side)))
const gap = (sub: string, id: string, label: string, tip: string, rule: (v: string) => [string, string][]): Def =>
  ({ group: L, sub, sec: 'Spacing', id, label, kind: 'num', unit: 'px', min: -6, max: 40, step: 1, fallback: '0', icon: 'arrow-left-right', tip, rule })

// Links to another note (not to a heading or block in this one). Reading view: the link's target doesn't start with #. Live Preview:
// otherLinks.ts marks them with the class cz-other. Unset, they follow Note link (--link-color). Not hovered leaves hovering to the hover color.
const other = (id: string, label: string, hover: boolean, lead: string): Def => {
  const h = hover ? ':hover' : ':not(:hover)', lp = `.markdown-source-view.mod-cm6 .cz-other${h}`
  return { group: T, sub: 'Links', id, label, kind: 'color', follows: lead,
    rule: c => [[`.markdown-preview-view a.internal-link:not([data-href^="#"])${h}, ${lp}, ${lp} *`, `color:${c} !important`]] }
}

export const DEFS: Def[] = [
  // Page
  num(P, 'line-width', 'Line width', '--file-line-width', 'px', 400, 1600, 10),
  num(P, 'font-size', 'Text size', '--font-text-size', 'px', 10, 32, 1),
  num(P, 'line-height', 'Line height', '--line-height-normal', '', 0.9, 3, 0.05),
  num(P, 'p-spacing', 'Paragraph spacing', '--p-spacing', 'rem', 0, 3, 0.05),
  { group: P, id: 'body-font', label: 'Note font', kind: 'text', fallback: 'e.g. Inter', fonts: true, rule: v => [[MD, `font-family:${v} !important`]] },
  // Text & links
  // Notes only (menus, tabs and sidebars are out of scope). The variable colors Reading view; the `color` rule is needed for Live Preview.
  // Headings keep their own color (else the app's text color): Obsidian leaves --hN-color unset, so headings would inherit the note color.
  // --cz-app-text is read on <body>, outside the notes, so it still holds the theme's text color.
  { group: T, id: 'note-color', label: 'Text color', kind: 'color', vars: ['--text-normal'],
    rule: v => [[NOTES, `--text-normal:${v} !important`], [MD, `color:${v} !important`], ['', '--cz-app-text:var(--text-normal)'],
      ...[1, 2, 3, 4, 5, 6].map(n => [hSel(n), `color:var(--h${n}-color,var(--cz-app-text)) !important`] as [string, string]),
      ['.inline-title', 'color:var(--inline-title-color,var(--h1-color,var(--cz-app-text))) !important']] },
  // Bold and italic inherit the text color until set (Obsidian's --bold-color is `inherit`), so their swatches show it.
  color(T, 'bold-color', 'Bold color', '--bold-color', { follows: 'note-color' }),
  num(T, 'bold-weight', 'Bold strength', '--bold-modifier', '', 0, 600, 100),
  color(T, 'italic-color', 'Italic color', '--italic-color', { follows: 'note-color' }),
  color(T, 'highlight', 'Highlight background', '--text-highlight-bg'),
  color(T, 'link', 'Note link', '--link-color', { sub: 'Links' }),
  color(T, 'link-hover', 'Note link, hover', '--link-color-hover', { sub: 'Links' }),
  other('link-other', 'Link to another note', false, 'link'),
  other('link-other-hover', 'Link to another note, hover', true, 'link-hover'),
  color(T, 'link-ext', 'Web link', '--link-external-color', { sub: 'Links' }),
  color(T, 'link-ext-hover', 'Web link, hover', '--link-external-color-hover', { sub: 'Links' }),
  color(T, 'tag', 'Tag text', '--tag-color', { sub: 'Tags' }),
  color(T, 'tag-bg', 'Tag background', '--tag-background', { sub: 'Tags' }),
  // Headings
  text(H, 'all-font', 'Font for all headings', ['--h1-font', '--h2-font', '--h3-font', '--h4-font', '--h5-font', '--h6-font'], { fallback: 'e.g. Josefin Sans', fonts: true }),
  color(H, 'heading-mark', 'Color of the # marks', '--heading-formatting'),
  ...[1, 2, 3, 4, 5, 6].flatMap(headings),
  // Lists: All lists sets what every list type follows; Bullet, Numbered and Checkbox lists hold everything for that type.
  color(L, 'marker', 'Marker color', '--list-marker-color', { sub: 'All lists', sec: 'Color' }),
  num(L, 'list-indent', 'Indent per level', '--list-indent', 'em', 0.5, 6, 0.25, { sub: 'All lists', sec: 'Spacing' }),
  num(L, 'list-spacing', 'Space between items', '--list-spacing', 'em', 0, 2, 0.025, { sub: 'All lists', sec: 'Spacing' }),
  num(L, 'guide-width', 'Thickness', '--indentation-guide-width', 'px', 0, 8, 0.5, { sub: 'All lists', sec: 'Indent guide lines', scope: NOTES }),
  color(L, 'guide-color', 'Color', '--indentation-guide-color', { sub: 'All lists', sec: 'Indent guide lines', scope: NOTES }),
  num(L, 'guide-width-active', 'Thickness, list you are in', '--indentation-guide-width-active', 'px', 0, 8, 0.5, { sub: 'All lists', sec: 'Indent guide lines', scope: NOTES }),
  color(L, 'guide-active', 'Color, list you are in', '--indentation-guide-color-active', { sub: 'All lists', sec: 'Indent guide lines', scope: NOTES }),
  // Bullet lists
  { group: L, sub: 'Bullet lists', sec: 'Color', id: 'bullet-color', label: 'Bullet color', kind: 'color', fallback: '#888888', follows: 'marker',
    // a variable on the bullet, not a color: Obsidian's own hover and folded rules must still win over it
    rule: v => [['ul > li:not(.is-collapsed)::marker', `color:${v} !important`], ['.list-bullet, .cm-formatting-list-ul', `--list-marker-color:${v} !important`]] },
  // Obsidian only shows the hover color while the mouse is on the fold arrow (and leaf items have none); this also shows it while the mouse
  // is anywhere on the item's own line (not on its nested items).
  { group: L, sub: 'Bullet lists', sec: 'Color', id: 'marker-hover', label: 'On hover', kind: 'color', vars: ['--list-marker-color-hover'],
    rule: v => [['', `--list-marker-color-hover:${v} !important`],
      [`${RDV} li:hover:not(:has(li:hover)) > .list-bullet::after, ${LPL}:hover .list-bullet::after`, `background-color:${v} !important`]] },
  color(L, 'marker-collapsed', 'When folded', '--list-marker-color-collapsed', { sub: 'Bullet lists', sec: 'Color' }),
  num(L, 'bullet-size', 'Size', '--list-bullet-size', 'px', 2, 14, 1, { sub: 'Bullet lists', sec: 'Shape' }),
  num(L, 'bullet-radius', 'Corner radius', '--list-bullet-radius', '%', 0, 50, 5, { hi: 50, sub: 'Bullet lists', sec: 'Shape' }),
  gap('Bullet lists', 'gap-bullet', 'Bullet to text gap', 'Space between a bullet and its text. More moves the bullet out to the left; less pulls it toward the text. The text stays put.', v => [
    [`${LPL}:not(.HyperMD-task-line) .cm-formatting-list-ul`, `margin-inline-start:calc(-1 * ${v});margin-inline-end:${v}`],
    [`${RDV} ul > li:not(.task-list-item) > .list-bullet`, `margin-inline-start:calc(-0.8em - ${v})`]]),
  ...[1, 2, 3, 4, 5, 6].map(k => stepDef(INDENT_TYPES[0], k)),
  ...spaces(INDENT_TYPES[0]),
  // Numbered lists
  { group: L, sub: 'Numbered lists', sec: 'Color', id: 'number-color', label: 'Number color', kind: 'color', fallback: '#888888', follows: 'marker',
    rule: v => [['ol > li::marker, .cm-formatting-list-ol', `color:${v} !important`], ['', `--cz-number-color:${v}`]] }, // the variable colors the redrawn numbers (Number to text gap)
  gap('Numbered lists', 'gap-number', 'Number to text gap', 'Space between a list number and its text. More moves the number out to the left; less pulls it toward the text. The text stays put.', v => [
    [`${LPL} .cm-formatting-list-ol`, `margin-inline-start:calc(-1 * ${v});margin-inline-end:${v}`],
    [`${RDV} ol > li:not(.task-list-item)`, 'list-style-type:none'],
    [`${RDV} ol > li:not(.task-list-item)::before`, `content:counter(list-item) ".";position:absolute;inset-inline-end:calc(100% + 0.3em + ${v});color:var(--cz-number-color,var(--list-marker-color));font-variant-numeric:tabular-nums`]]),
  ...[1, 2, 3, 4, 5, 6].map(k => stepDef(INDENT_TYPES[1], k)),
  ...spaces(INDENT_TYPES[1]),
  // Checkbox lists
  // Obsidian fills a ticked box with --checkbox-color-hover under the mouse (and while clicking): Ticked fill sets both, so hover matches until set.
  { group: L, sub: 'Checkbox lists', sec: 'Color', id: 'cb-color', label: 'Ticked fill', kind: 'color', vars: ['--checkbox-color', '--checkbox-color-hover'] },
  color(L, 'cb-hover', 'Ticked fill, on hover', '--checkbox-color-hover', { sub: 'Checkbox lists', sec: 'Color', follows: 'cb-color' }),
  color(L, 'cb-border', 'Empty box border', '--checkbox-border-color', { sub: 'Checkbox lists', sec: 'Color' }),
  color(L, 'cb-marker', 'Tick mark', '--checkbox-marker-color', { sub: 'Checkbox lists', sec: 'Color' }),
  num(L, 'cb-size', 'Size', '--checkbox-size', 'px', 10, 32, 1, { sub: 'Checkbox lists', sec: 'Shape' }),
  num(L, 'cb-radius', 'Corner radius', '--checkbox-radius', '%', 0, 50, 5, { hi: 50, sub: 'Checkbox lists', sec: 'Shape' }),
  gap('Checkbox lists', 'gap-checkbox', 'Box to text gap', 'Space between a checkbox and its text. More moves the box out to the left; less pulls it toward the text. The text stays put.', v => [
    [`${LPL}.HyperMD-task-line .task-list-label`, `margin-inline-start:calc(-0.25em - ${v});margin-inline-end:${v}`],
    [`${RDV} li.task-list-item > .task-list-item-checkbox, ${RDV} li.task-list-item > p > .task-list-item-checkbox`, `margin-inline-start:calc(var(--checkbox-size) * -1.5 - ${v});margin-inline-end:calc(0.6em + ${v})`]]),
  ...[1, 2, 3, 4, 5, 6].map(k => stepDef(INDENT_TYPES[2], k)),
  ...spaces(INDENT_TYPES[2]),
  color(L, 'cb-done', 'Text color', '--checklist-done-color', { sub: 'Checkbox lists', sec: 'Done tasks' }),
  select(L, 'cb-deco', 'Crossed out', '--checklist-done-decoration', ['line-through', 'none'], { sub: 'Checkbox lists', sec: 'Done tasks' }),
  // Quotes & rules
  color(Q, 'quote-border', 'Quote bar color', '--blockquote-border-color'),
  num(Q, 'quote-thick', 'Quote bar thickness', '--blockquote-border-thickness', 'px', 1, 10, 1),
  color(Q, 'quote-text', 'Quote text color', '--blockquote-color'),
  color(Q, 'quote-bg', 'Quote background', '--blockquote-background-color'),
  color(Q, 'hr-color', 'Horizontal rule color', '--hr-color'),
  num(Q, 'hr-thick', 'Horizontal rule thickness', '--hr-thickness', 'px', 0, 8, 1),
  // Callouts: one color for every callout type (Obsidian tints each type from --callout-color; these replace the tint). The title rule also
  // sets --callout-title-color so Obsidian's own title rule can't win. The icon is an <svg> with its own color, so it has its own setting.
  // Per-type colors are not offered. `probe` makes the swatch start at what the theme draws now.
  { group: Q, sub: 'Callouts', id: 'callout-bg', label: 'Background', kind: 'color', icon: 'paint-bucket', tip: 'Background of every callout box, whatever its type.', probe: ['.callout', 'background-color'],
    rule: v => [['.callout', `background-color:${v} !important`]] },
  { group: Q, sub: 'Callouts', id: 'callout-title', label: 'Title color', kind: 'color', icon: 'palette', tip: 'Color of a callout\'s title.', probe: ['.callout-title-inner', 'color'],
    rule: v => [['.callout', `--callout-title-color:${v}`], ['.callout-title, .callout-title-inner', `color:${v} !important`]] },
  { group: Q, sub: 'Callouts', id: 'callout-icon', label: 'Icon color', kind: 'color', icon: 'pencil', tip: 'Color of the small picture before a callout\'s title.', probe: ['.callout-icon svg', 'color'],
    rule: v => [['.callout-icon, .callout-icon .svg-icon', `color:${v} !important`]] },
  { group: Q, sub: 'Callouts', id: 'callout-text', label: 'Text color', kind: 'color', icon: 'type', tip: 'Color of the text inside a callout, under its title.', probe: ['.callout-content', 'color'],
    rule: v => [['.callout-content', `color:${v} !important`]] },
  // Editor
  color(E, 'caret', 'Cursor color', '--caret-color'),
  { group: E, id: 'active-line', label: 'Highlight the cursor line', kind: 'color', fallback: '#4a8fc0',
    rule: v => [['.cm-active.cm-line', `background-color:color-mix(in srgb,${v} 15%,transparent) !important`]] },
]

// Description and icon for every other setting (headings, gaps and indent steps carry their own).
const TIPS: Record<string, [icon: string, tip: string]> = {
  'line-width': ['ruler', 'Maximum width of the text column. Works when Settings > Editor > Readable line length is on.'],
  'font-size': ['a-large-small', 'Size of the normal note text.'],
  'line-height': ['move-vertical', 'Space between lines of normal text, as a multiple of the text size (1.5 = one and a half lines).'],
  'p-spacing': ['pilcrow', 'Extra space between paragraphs.'],
  'body-font': ['type', 'Font for the note text. Start typing to pick from the fonts on this computer.'],
  'note-color': ['palette', 'Color of normal text inside notes, in Live Preview and Reading view. Headings, menus and sidebars keep their color.'],
  'bold-color': ['bold', 'Color of **bold** text.'],
  'bold-weight': ['bold', 'How much heavier bold text is than normal text (added to the normal weight).'],
  'italic-color': ['italic', 'Color of *italic* text.'],
  'highlight': ['highlighter', 'Background color behind ==highlighted== text.'],
  'link': ['link', 'Color of [[links]] to notes and to headings in this note.'],
  'link-hover': ['link', 'Note link color while the mouse is over it.'],
  'link-other': ['file-symlink', 'Color of links that open a different note (not a heading in this one). Obsidian fades links to notes that do not exist yet.'],
  'link-other-hover': ['file-symlink', 'Color of a link to another note while the mouse is over it.'],
  'link-ext': ['globe', 'Color of links to web pages.'],
  'link-ext-hover': ['globe', 'Web link color while the mouse is over it.'],
  'tag': ['tag', 'Text color of #tags.'],
  'tag-bg': ['tag', 'Background color of #tags.'],
  'all-font': ['type', 'One font for all headings (H1-H6). A font set inside H1-H6 wins over this one.'],
  'heading-mark': ['hash', 'Color of the # signs in front of a heading, seen while editing it.'],
  'marker': ['palette', 'Color of bullets and list numbers. Bullet color and Number color below can override it.'],
  'list-indent': ['arrow-right-to-line', 'How far each nested list level is pushed in. The Indent steps of each list type follow it unless you change them.'],
  'list-spacing': ['move-vertical', 'Space above and below every list item. Space above / Space below in each list type can change it per level.'],
  'guide-width': ['grip-vertical', 'Thickness of the vertical lines that join nested list items (in notes only).'],
  'guide-color': ['grip-vertical', 'Color of the vertical lines that join nested list items (in notes only).'],
  'guide-width-active': ['grip-vertical', 'Thickness of the guide line for the list the cursor is in.'],
  'guide-active': ['grip-vertical', 'Color of the guide line for the list the cursor is in.'],
  'bullet-color': ['palette', 'Color of bullets only.'],
  'number-color': ['palette', 'Color of list numbers only.'],
  'marker-hover': ['mouse-pointer', 'Bullet color while the mouse is over the item or its fold arrow.'],
  'marker-collapsed': ['chevron-right', 'Bullet color when the item is folded (its children hidden).'],
  'bullet-size': ['circle', 'Size of the bullet dot.'],
  'bullet-radius': ['square', 'Bullet shape: 50 = round, 0 = square.'],
  'cb-color': ['square-check', 'Fill color of a ticked checkbox.'],
  'cb-hover': ['mouse-pointer', 'Fill color of a ticked checkbox while the mouse is over it or you click it.'],
  'cb-border': ['square', 'Outline color of an empty checkbox.'],
  'cb-marker': ['check', 'Color of the tick mark inside a ticked checkbox.'],
  'cb-size': ['a-large-small', 'Size of the checkbox.'],
  'cb-radius': ['square', 'Checkbox shape: 50 = round, 0 = square corners.'],
  'cb-done': ['palette', 'Text color of a finished task.'],
  'cb-deco': ['strikethrough', 'Whether finished tasks are crossed out.'],
  'quote-border': ['quote', 'Color of the bar on the left of a > quote.'],
  'quote-thick': ['quote', 'Width of the bar on the left of a > quote.'],
  'quote-text': ['quote', 'Text color inside a > quote.'],
  'quote-bg': ['paint-bucket', 'Background color behind a > quote.'],
  'hr-color': ['minus', 'Color of the --- divider line.'],
  'hr-thick': ['minus', 'Thickness of the --- divider line.'],
  'caret': ['text-cursor', 'Color of the blinking text cursor.'],
  'active-line': ['highlighter', 'Faint highlight behind the line the cursor is on.'],
}
for (const d of DEFS) { const t = TIPS[d.id]; if (t) { d.icon ??= t[0]; d.tip ??= t[1] } }
