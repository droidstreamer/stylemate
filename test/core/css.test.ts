import { describe, expect, it } from 'vitest'
import { buildCss } from '../../src/core/css'
import { hexToHsl, hslToHex } from '../../src/core/color'
import { DEFS } from '../../src/core/schema'

describe('buildCss', () => {
  it('is empty when nothing changed', () => expect(buildCss({})).toBe(''))
  it("Text size keeps headings at the original size", () => expect(buildCss({ "font-size": 32 }, undefined, 16)).toContain("font-size:calc(var(--h1-size) * 0.5) !important"))
  it('adds the unit and scopes a variable to both themes', () =>
    expect(buildCss({ 'h1-size': 3 })).toBe('body.theme-light,body.theme-dark{--h1-size:3em !important}'))
  it('scopes colors to their own theme', () => {
    const css = buildCss({ 'h1-color@dark': '#ff0000' })
    expect(css).toBe('body.theme-dark{--h1-color:#ff0000 !important}')
  })
  it('one font sets all six heading fonts', () =>
    expect(buildCss({ 'all-font': 'Inter' })).toContain('--h1-font:Inter !important;--h2-font:Inter'))
  it('selector rules get the theme prefix on every selector', () => {
    const css = buildCss({ 'h2-shift': -20 })
    expect(css).toContain('body.theme-light .markdown-preview-view :not(.callout-content) > h2,body.theme-light .markdown-source-view.mod-cm6 .HyperMD-header-2')
    expect(css).toContain('left:-20px')
  })
  it('strips characters that could break out of the rule', () =>
    expect(buildCss({ 'all-font': 'Inter;}body{display:none' })).not.toMatch(/[;}]body/))
  it('a scoped setting stays inside notes', () =>
    expect(buildCss({ 'guide-width': 3 })).toBe('body.theme-light .markdown-source-view.mod-cm6,body.theme-light .markdown-preview-view,body.theme-dark .markdown-source-view.mod-cm6,body.theme-dark .markdown-preview-view{--indentation-guide-width:3px !important}'))
  it('per-level list spacing keeps :is(ul,ol) whole and prefixes each selector', () => {
    const css = buildCss({ 'nabove-2': 0.5 })
    expect(css).toBe('body.theme-light .markdown-source-view.mod-cm6 .HyperMD-list-line-2:has(.cm-formatting-list-ol),body.theme-light .markdown-preview-view :is(ul,ol):not(li *) > li > ol > li,'
      + 'body.theme-dark .markdown-source-view.mod-cm6 .HyperMD-list-line-2:has(.cm-formatting-list-ol),body.theme-dark .markdown-preview-view :is(ul,ol):not(li *) > li > ol > li{padding-top:0.5em !important}')
  })
  it('percent sliders add the unit', () => expect(buildCss({ 'cb-radius': 25 })).toContain('--checkbox-radius:25% !important'))
  it('ids are unique', () => expect(new Set(DEFS.map(d => d.id)).size).toBe(DEFS.length))
  it('every def has vars or a rule, and numbers have limits', () => {
    for (const d of DEFS) {
      expect(d.vars || d.rule, d.id).toBeTruthy()
      if (d.kind === 'num') expect([d.min, d.max, d.step].every(x => typeof x === 'number'), d.id).toBe(true)
    }
  })
})

describe('color', () => {
  it('hex and hsl round trip', () => { for (const h of ['#FF0000', '#00FF00', '#808080']) expect(hslToHex(...hexToHsl(h))).toBe(h) })
})

import { exportCss } from '../../src/core/css'
describe('per-level indents', () => {
  it('nothing is emitted until a step is set', () => expect(buildCss({ 'cb-size': 20 })).not.toContain('cz-'))
  it('a step sets its variable and the Live Preview and Reading rules for that list type only', () => {
    const css = buildCss({ 'bstep-2': 50 })
    expect(css).toContain('--cz-bstep-2:50px !important')
    expect(css).toContain('.HyperMD-list-line-3:not(.HyperMD-task-line):has(.cm-formatting-list-ul) .cm-hmd-list-indent{width:calc(var(--cz-bstep-1,var(--list-indent,36px)) + var(--cz-bstep-2,var(--list-indent,36px))) !important')
    expect(css).toContain('padding-inline-start:calc(var(--cz-bstep-1,var(--list-indent,36px)) + var(--cz-bstep-2,var(--list-indent,36px)) + 20px)')
    expect(css).toContain(':is(ul,ol):not(li *) > li > :is(ul,ol) > li > ul:not(.contains-task-list) > li,body.theme-dark')
    expect(css).not.toContain('cz-nstep'); expect(css).not.toContain('cz-cstep-1,')
  })
  it('numbered and checkbox lists get their own selectors and marker widths', () => {
    expect(buildCss({ 'nstep-1': 40 })).toContain(':has(.cm-formatting-list-ol)')
    expect(buildCss({ 'nstep-1': 40 })).toContain('+ 28px)')
    expect(buildCss({ 'cstep-1': 40 })).toContain('.HyperMD-list-line-2.HyperMD-task-line{padding-inline-start:calc(var(--cz-cstep-1,var(--list-indent,36px)) + 30px)')
  })
  it('theme prefix is kept intact around selectors that contain commas', () => {
    for (const r of buildCss({ 'bstep-1': 40 }).split('\n').slice(1)) expect(r).toMatch(/^body\.theme-light .*,body\.theme-dark .*\{/)
  })
})
describe('exportCss', () => {
  it('has a header and no rules when nothing changed', () => { const c = exportCss({}); expect(c).toMatch(/^\/\* StyleMate settings, exported \d{4}-\d\d-\d\d/); expect(c).not.toContain('{') })
  it('writes one declaration per line', () => {
    const c = exportCss({ 'h1-size': 3, 'h1-color@dark': '#ff0000' })
    expect(c).toContain('body.theme-light,body.theme-dark {\n  --h1-size:3em !important;\n}')
    expect(c).toContain('body.theme-dark {\n  --h1-color:#ff0000 !important;\n}')
  })
  it('keeps a multi-declaration rule intact', () => expect(exportCss({ 'h1-underline': 'yes' })).not.toContain(';;'))
})

describe('M6: tooltips, case, gaps', () => {
  it('every setting has a tooltip', () => expect(DEFS.filter(d => !d.tip).map(d => d.id)).toEqual([]))
  it('numbering style is gone', () => expect(DEFS.some(d => d.id === 'numbered-style')).toBe(false))
  it('a stored Sentence case (removed in M8) falls back to normal', () => expect(buildCss({ 'h2-case': 'Sentence case' })).toContain('text-transform:none'))
  it('all small caps uses font-variant-caps', () => expect(buildCss({ 'h1-case': 'all small caps' })).toContain('font-variant-caps:all-small-caps'))
  it('a gap moves the marker out and keeps the text in place (Live Preview)', () =>
    expect(buildCss({ 'gap-bullet': 10 })).toContain('margin-inline-start:calc(-1 * 10px);margin-inline-end:10px'))
})

describe('M8: descriptions, icons, list groups', () => {
  it('every setting has an icon', () => expect(DEFS.filter(d => !d.icon).map(d => d.id)).toEqual([]))
  it('side margins, sentence case and checkbox status colors are gone', () => {
    expect(DEFS.filter(d => d.id === 'margins' || d.id === 'cb-margin' || d.id.startsWith('task-')).map(d => d.id)).toEqual([])
    expect(DEFS.some(d => d.options?.includes('Sentence case'))).toBe(false)
  })
  it('old stored values for removed settings make no CSS', () => expect(buildCss({ margins: 50, 'task-important@light': '#ff0000', 'cb-margin': 4 })).toBe(''))
  it('list settings live in the four list boxes', () => expect([...new Set(DEFS.filter(d => d.group === 'Lists').map(d => d.sub))]).toEqual(['All lists', 'Bullet lists', 'Numbered lists', 'Checkbox lists']))
  it('callout colors set the box, the title, the icon and the text', () => {
    const css = buildCss({ 'callout-bg@dark': '#112233', 'callout-title@dark': '#0066ff', 'callout-icon@dark': '#ffaa00', 'callout-text@dark': '#888888' })
    expect(css).toContain('body.theme-dark .callout{background-color:#112233 !important}')
    expect(css).toContain('body.theme-dark .callout{--callout-title-color:#0066ff}')
    expect(css).toContain('body.theme-dark .callout-title,body.theme-dark .callout-title-inner{color:#0066ff !important}')
    expect(css).toContain('body.theme-dark .callout-icon,body.theme-dark .callout-icon .svg-icon{color:#ffaa00 !important}')
    expect(css).toContain('body.theme-dark .callout-content{color:#888888 !important}')
  })
})

describe('print and checkbox hover', () => {
  it('black and white only when on, and only for print', () => {
    expect(buildCss({ 'print-bw': 'no' })).toBe('')
    const lines = buildCss({ 'print-bw': 'yes' }).split('\n')
    expect(lines.length).toBeGreaterThan(10)
    expect(lines.every(l => l.startsWith('@media print{html body .print'))).toBe(true)
  })
  it('exports the print rules as a readable @media block', () => {
    const css = exportCss({ 'print-bw': 'yes' })
    expect(css).toContain('@media print {\n  html body .print .markdown-preview-view h1 {\n    color:hsl(0,0%,5%) !important;\n  }\n}')
  })
  it('Ticked fill sets the hover fill too; its own hover setting wins', () => {
    expect(buildCss({ 'cb-color@dark': '#cc3366' })).toBe('body.theme-dark{--checkbox-color:#cc3366 !important;--checkbox-color-hover:#cc3366 !important}')
    const css = buildCss({ 'cb-color@dark': '#cc3366', 'cb-hover@dark': '#3366cc' })
    expect(css.indexOf('--checkbox-color-hover:#3366cc')).toBeGreaterThan(css.indexOf('--checkbox-color-hover:#cc3366'))
  })
})
