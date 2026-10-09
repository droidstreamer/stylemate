import { Notice, Plugin, debounce } from 'obsidian'
import { buildCss, exportCss, vkey, type Theme, type Values } from './core/css'
import { type Def } from './core/schema'
import { openPreview } from './preview'
import { StyleMateTab } from './settingsTab'
import { otherLinks } from './otherLinks'

type Settings = { enabled: boolean; bothThemes: boolean; values: Values; presets: Record<string, Values> }

export default class StyleMate extends Plugin {
  settings: Settings = { enabled: true, bothThemes: false, values: {}, presets: {} }
  sheet = new CSSStyleSheet()
  css = '' // the generated CSS, as last applied

  async onload() {
    this.settings = { ...this.settings, ...((await this.loadData()) as Partial<Settings> | null) }
    delete (this.settings as { visited?: unknown }).visited // visited links were removed in 0.10
    // A constructed stylesheet, not a <style> element (the community review forbids those). It sits after every theme and snippet sheet.
    // ponytail: main window only; add popout windows if anyone asks (workspace 'window-open').
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.sheet]
    this.apply()
    // File > Export to PDF prints from a hidden window it opens with window.open, and copies only <style> and <link> sheets into it:
    // hand that window a copy of StyleMate's sheet too, so the PDF (and Black and white when printing) gets StyleMate's look.
    const open = window.open.bind(window)
    window.open = (...args: Parameters<Window['open']>) => {
      const w = open(...args)
      try {
        if (w) { const sh = new (w as unknown as { CSSStyleSheet: typeof CSSStyleSheet }).CSSStyleSheet(); sh.replaceSync(this.css); w.document.adoptedStyleSheets = [...w.document.adoptedStyleSheets, sh] }
      } catch { /* another origin */ }
      return w
    }
    this.register(() => { window.open = open })
    this.registerEditorExtension(otherLinks)
    this.addSettingTab(new StyleMateTab(this.app, this))
    this.addCommand({ id: 'open-preview', name: 'Open sample note', callback: () => void openPreview(this.app) })
    this.addCommand({ id: 'toggle', name: 'Turn customizations on/off', callback: () => { this.settings.enabled = !this.settings.enabled; this.apply(); this.save() } })
  }

  onunload() { document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== this.sheet) }

  save = debounce(() => void this.saveData(this.settings), 400, true)
  apply() { this.sheet.replaceSync(this.css = this.settings.enabled ? buildCss(this.settings.values, undefined, parseFloat(document.body.style.getPropertyValue('--font-text-size')) || 16) : '') }

  theme = (): Theme => (document.body.classList.contains('theme-dark') ? 'dark' : 'light')
  has = (d: Def) => (d.kind === 'color' ? (['light', 'dark'] as const).some(t => this.settings.values[vkey(d, t)] !== undefined) : this.settings.values[d.id] !== undefined)

  set(d: Def, v: string | number) {
    const themes: Theme[] = d.kind !== 'color' ? ['light'] : this.settings.bothThemes ? ['light', 'dark'] : [this.theme()]
    for (const t of themes) {
      if (v === '') delete this.settings.values[vkey(d, t)]
      else this.settings.values[vkey(d, t)] = v
    }
    this.apply(); this.save()
  }

  // Heading inheritance: H<to> takes H<from>'s spacing, shift and line height (an unset source clears the target).
  inherit(from: number, to: number) {
    for (const k of ['above', 'below', 'shift', 'lh']) {
      const v = this.settings.values[`h${from}-${k}`]
      if (v === undefined) delete this.settings.values[`h${to}-${k}`]; else this.settings.values[`h${to}-${k}`] = v
    }
    this.apply(); this.save()
  }

  // Presets: a named copy of every changed setting.
  savePreset(name: string) { this.settings.presets[name] = { ...this.settings.values }; this.save() }
  loadPreset(name: string) { this.settings.values = { ...this.settings.presets[name] }; this.apply(); this.save() }
  deletePreset(name: string) { delete this.settings.presets[name]; this.save() }

  // Export: the changes as a CSS snippet file in this vault's snippets folder, or on the clipboard.
  async exportSnippet() {
    const css = exportCss(this.settings.values), dir = `${this.app.vault.configDir}/snippets`, path = `${dir}/stylemate.css`
    if (!(await this.app.vault.adapter.exists(dir))) await this.app.vault.adapter.mkdir(dir)
    await this.app.vault.adapter.write(path, css)
    new Notice(`Saved ${path}. Turn it on under Settings > Appearance > CSS snippets.`)
  }
  async copyCss(win: Window) { await win.navigator.clipboard.writeText(exportCss(this.settings.values)); new Notice('CSS copied.') } // win: the window with focus (Preferences is its own window)

  // Reset: back to the default, or for a heading color to its Auto palette color when that theme has a palette.
  clear(d: Def) {
    const n = /^h([1-6])-color$/.exec(d.id)?.[1]
    for (const t of ['light', 'dark'] as const) {
      const pal = n && String(this.settings.values[`palette@${t}`] ?? '').split(',')[+n - 1]
      if (pal) this.settings.values[vkey(d, t)] = pal; else delete this.settings.values[vkey(d, t)]
    }
    this.apply(); this.save()
  }

  // The Auto palette's six heading colors (H1-H6) for the current theme, kept so a heading color's reset can return to them.
  setPalette(colors: string[]) {
    this.settings.values[`palette@${this.theme()}`] = colors.join(',')
    colors.forEach((c, i) => { this.settings.values[`h${i + 1}-color@${this.theme()}`] = c })
    this.apply(); this.save()
  }
  clearPalette() { delete this.settings.values['palette@light']; delete this.settings.values['palette@dark'] }

  // What a sample callout shows for one of its parts (the theme's own callout colors, which no variable on <body> holds).
  private probe(selector: string, prop: string): string {
    const box = document.body.createDiv({ attr: { style: 'position:absolute;visibility:hidden' } })
    const c = box.createDiv({ cls: 'callout', attr: { 'data-callout': 'note' } }), t = c.createDiv({ cls: 'callout-title' })
    const svg = t.createDiv({ cls: 'callout-icon' }).createSvg('svg', { cls: 'svg-icon' })
    t.createDiv({ cls: 'callout-title-inner', text: 'x' }); c.createDiv({ cls: 'callout-content', text: 'x' })
    const el = box.querySelector(selector) ?? svg, v = getComputedStyle(el).getPropertyValue(prop); box.remove()
    return v
  }

  // The value in effect now: the user's override, else what Obsidian/the theme gives (read with StyleMate switched off for an instant).
  current(d: Def): string {
    const own = this.settings.values[vkey(d, this.theme())]
    if (own !== undefined) return String(own)
    this.sheet.disabled = true
    const raw = d.vars ? getComputedStyle(document.body).getPropertyValue(d.vars[0]).trim() : d.probe ? this.probe(...d.probe) : ''
    this.sheet.disabled = false
    return raw || d.fallback || ''
  }
}
