import { DEFS, hSel, INDENT_TYPES, LINE, LIST, type Def } from './schema'

export type Theme = 'light' | 'dark'
export type Values = Record<string, string | number>

// Colors are stored per theme ("h1-color@dark"); everything else once.
export const vkey = (d: Def, theme: Theme) => (d.kind === 'color' ? `${d.id}@${theme}` : d.id)

const clean = (s: string) => s.replace(/[{};<>]/g, '')
// Splits a selector list on the commas outside brackets, so :is(ul,ol) stays whole.
const sel = (themes: Theme[], s: string) => themes.flatMap(t => (s ? s.split(/,(?![^(]*\))/) : ['']).map(p => `body.theme-${t} ${p.trim()}`.trim())).join(',')

// Per-level indents. Live Preview: a level-(k+1) line has an indent span as wide as steps 1..k together, and a hanging indent (padding and
// negative text-indent) of that plus the marker width. Reading view: each nested <li> is pushed in by its own level's step.
// ponytail: marker widths are fixed (a numbered list past item 9 wraps one digit off); Obsidian's guide lines keep their native spacing.
const LP = '.markdown-source-view.mod-cm6 .HyperMD-list-line-', RD = '.markdown-preview-view '
const both = (s: string) => `body.theme-light ${s},body.theme-dark ${s}` // not sel(): these selectors hold commas (:is(ul,ol))
function indentCss(values: Values): string[] {
  const out: string[] = []
  for (const { t, native } of INDENT_TYPES) {
    if (![1, 2, 3, 4, 5, 6].some(k => values[`${t}step-${k}`] !== undefined)) continue // only touch the list types the user changed
    // an unset step follows All lists' Indent per level
    const step = (k: number) => `var(--cz-${t}step-${k},var(--list-indent,${native}px))`, [line, base] = LINE[t]
    for (let k = 1; k <= 6; k++) {
      const sum = Array.from({ length: k }, (_, i) => step(i + 1)).join(' + ')
      out.push(`${both(`${LP}${k + 1}${line} .cm-hmd-list-indent`)}{width:calc(${sum}) !important;display:inline-block !important}`)
      out.push(`${both(`${LP}${k + 1}${line}`)}{padding-inline-start:calc(${sum} + ${base}px) !important;text-indent:calc(-1 * (${sum} + ${base}px)) !important}`)
      const chain = [':is(ul,ol):not(li *)', ...Array<string>(k - 1).fill(':is(ul,ol)'), LIST[t]].join(' > li > ') // top-level list, then k-1 nested ones, then this type's
      out.push(`${both(`${RD}${chain} > li`)}{margin-inline-start:${step(k)} !important}`)
    }
  }
  return out
}

// PDF mode: the note on screen, and the copy Export to PDF prints (`body > .print .markdown-preview-view`), in black, white and grays
// (grays from the user's COLOR_BW_ReadingView snippet). `html body` outranks StyleMate's own `body.theme-x` rules. No filter on text:
// Chromium would print it as an image.
const NOTE = ':is(.markdown-preview-view,.markdown-source-view)', PR = `html body ${NOTE}`, g = (l: number) => `hsl(0,0%,${l}%)`
const PDF: [string, string][] = [
  [`html body .print, ${PR}`, 'background-color:#fff !important'],
  [`${PR}, ${PR} *`, `color:${g(10)} !important;border-color:${g(40)} !important;--list-marker-color:${g(10)} !important;--list-marker-color-hover:${g(10)} !important;--list-marker-color-collapsed:${g(10)} !important;--checkbox-color:${g(10)} !important;--checkbox-color-hover:${g(10)} !important;--checkbox-border-color:${g(40)} !important;--checkbox-marker-color:#fff !important;--indentation-guide-color:${g(70)} !important;--hr-color:${g(40)} !important`],
  [`${PR} *`, 'background-color:transparent !important'],
  [`${PR} li::marker`, `color:${g(10)} !important`],
  [`${PR} strong`, `color:${g(5)} !important`],
  ...[5, 15, 25, 35, 45, 45].map((l, i): [string, string] => [`${PR} h${i + 1}, ${PR} .HyperMD-header-${i + 1}, ${PR} .HyperMD-header-${i + 1} *`, `color:${g(l)} !important`]),
  [`${PR} a, ${PR} .cm-link, ${PR} .cm-url`, `color:${g(20)} !important;text-decoration:underline !important`],
  [`${PR} pre, ${PR} code`, `background-color:${g(80)} !important;color:${g(0)} !important`],
  [`${PR} pre code`, 'background-color:transparent !important'],
  [`${PR} blockquote, ${PR} .callout`, `background-color:${g(87)} !important;border:none !important;border-inline-start:4px solid ${g(40)} !important`],
  [`${PR} .callout-title, ${PR} .callout-title *`, `color:${g(10)} !important`],
  [`${PR} .tag`, `background-color:${g(84)} !important`],
  [`${PR} mark`, `background-color:${g(80)} !important`],
  [`${PR} input[type=checkbox]:checked`, `background-color:${g(10)} !important`],
  [`${PR} img, ${PR} svg, ${PR} canvas, ${PR} video, ${PR} iframe`, 'filter:grayscale(1) !important'], // images and icons
]
// Settings that push text sideways: left out in PDF mode, so a heading shifted into the margin or a deep indent is not cut off on the page.
const SIDEWAYS = /^h[1-6]-shift$|^list-indent$|^(?:\w+)?step-[1-6]$/

// Only what the user changed becomes CSS. `body.theme-x` beats the theme's own variables.
export function buildCss(values: Values, defs: Def[] = DEFS, base = 16, pdf = false): string {
  if (pdf) values = Object.fromEntries(Object.entries(values).filter(([k]) => !SIDEWAYS.test(k)))
  const out: string[] = []
  const emit = (d: Def, raw: string | number, themes: Theme[]) => {
    const v = d.kind === 'num' ? `${parseFloat(String(raw))}${d.unit ?? ''}` : clean(String(raw))
    const parts = d.rule ? d.rule(v) : [[d.scope ?? '', d.vars!.map(x => `${x}:${v} !important`).join(';')] as [string, string]] // !important: Obsidian sets some (text size) inline on <body>
    for (const [s, decl] of parts) out.push(`${sel(themes, s)}{${decl}}`)
  }
  for (const d of defs) {
    if (d.kind !== 'color') {
      const v = values[d.id]
      if (v !== undefined && v !== '') emit(d, v, ['light', 'dark'])
      continue
    }
    for (const t of ['light', 'dark'] as const) {
      const v = values[vkey(d, t)]
      if (v !== undefined && v !== '') emit(d, v, [t])
    }
  }
  // Text size scales em-sized headings with it; headings keep their size at the text size Obsidian had (`base` px; em x ratio), so only body text changes.
  if (values['font-size'] !== undefined && values['font-size'] !== '') for (let n = 1; n <= 6; n++) out.push(`${sel(['light', 'dark'], hSel(n))}{font-size:calc(var(--h${n}-size) * ${base / parseFloat(String(values['font-size']))}) !important}`)
  if (pdf) for (const [s, d] of PDF) out.push(`${s}{${d}}`)
  return [...out, ...indentCss(values)].join('\n')
}

// The same CSS as a snippet file: one declaration per line, with a header saying where it came from.
export function exportCss(values: Values): string {
  const pretty = (r: string, pad = '') => {
    const i = r.lastIndexOf('{'), decls = r.slice(i + 1, -1).split(';').filter(Boolean).map(x => `${pad}  ${x.trim()};`)
    return `${pad}${r.slice(0, i)} {\n${decls.join('\n')}\n${pad}}`
  }
  const rules = buildCss(values).split('\n').filter(Boolean).map(r => pretty(r))
  return `/* StyleMate settings, exported ${new Date().toISOString().slice(0, 10)}.\n   Use as an Obsidian CSS snippet (Settings > Appearance > CSS snippets) or share it. Colors are scoped to the theme they were set in. */\n${rules.join('\n\n')}\n`
}
