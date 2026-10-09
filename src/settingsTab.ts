import { App, PluginSettingTab, Setting, setIcon, setTooltip, type SettingDefinition, type SettingDefinitionItem, type SliderComponent, type TextComponent, type DropdownComponent, type ToggleComponent } from 'obsidian'
import { addColorPicker, addTrackSlider } from './colorPicker'
import { COFFEE_BUTTON, COFFEE_URL } from './coffeeButton'
import { DEFS, GROUPS, type Def } from './core/schema'
import type StyleMate from './main'
import { openPreview } from './preview'
import { contrast, gradient, shiftColors } from './core/palette'
import { hexToHsl } from './core/color'

// "rgb(12, 34, 56)" or any CSS color -> "#0c2238" for the color picker; '' when there is no color to show (transparent, or unreadable).
// A see-through color (Obsidian's guide lines are 12% white or black) shows as it looks on the note background, not as its solid base:
// a 1-pixel canvas paints the background, then the color over it.
function toHex(css: string): string {
  if (/^#[0-9a-f]{6}$/i.test(css)) return css
  const el = document.body.createSpan(); el.setCssStyles({ color: css, backgroundColor: 'var(--background-primary)' })
  const { color, backgroundColor } = getComputedStyle(el); el.remove()
  const ctx = createEl('canvas', { attr: { width: 1, height: 1 } }).getContext('2d', { willReadFrequently: true })
  if (!ctx) return ''
  const px = (...fills: string[]) => { ctx.clearRect(0, 0, 1, 1); for (const f of fills) { ctx.fillStyle = f; ctx.fillRect(0, 0, 1, 1) } return ctx.getImageData(0, 0, 1, 1).data }
  if (!px(color)[3]) return ''
  return '#' + [...px(backgroundColor, color).slice(0, 3)].map(n => n.toString(16).padStart(2, '0')).join('')
}

// A length the slider can show: "2.25em" -> 2.25; a calc() (Obsidian's default list indent is "calc(0.5625em * 4)") is measured in `unit`.
function toNum(css: string, unit = ''): number {
  const n = Number(css.replace(unit, ''))
  if (css && !isNaN(n)) return n
  if (!/^calc\(/.test(css)) return parseFloat(css)
  const el = document.body.createDiv(); el.setCssStyles({ position: 'absolute', width: css })
  const st = getComputedStyle(el), px = parseFloat(st.width), fs = parseFloat(st.fontSize); el.remove()
  return unit === 'em' ? px / fs : unit === 'rem' ? px / parseFloat(getComputedStyle(document.documentElement).fontSize) : px
}

// Palette sliders: [name, description, min, max, icon].
const PAL: [string, string, number, number, string][] = [
  ['Hue', 'All headings (H1-H6): turns their colors around the color wheel together (degrees).', -180, 180, 'rainbow'],
  ['Saturation', 'All headings (H1-H6): makes their colors more vivid (right) or grayer (left).', -50, 50, 'droplet'],
  ['Value', 'All headings (H1-H6): makes their colors lighter (right) or darker (left).', -30, 30, 'sun'],
  ['Contrast', 'All headings (H1-H6): spreads the start and end colors further apart (right) or brings all six closer together (left).', -50, 50, 'contrast']]
// A heading's letter case, italic and underline share one row: the case dropdown, then two icon toggles.
const STRIP = /^h\d-(case|italic|underline)$/
// Sections drawn as small collapsible boxes inside a list type's box (the rest are plain headings).
const BOXED = new Set(['Indent steps', 'Space above', 'Space below'])

// Lucide icon before a setting's name, as on every row.
function icon(s: Setting, name: string) { const i = createSpan({ cls: 'cz-icon' }); setIcon(i, name); s.nameEl.prepend(i); return s }

export class StyleMateTab extends PluginSettingTab {
  private open = new Set<string>(['Headings', 'Text & linksLinks', 'Text & linksTags'])
  private pick = '' // the preset chosen in the dropdown (kept across redraws)
  private syncs = new Map<string, (() => void)[]>() // group -> refreshers
  private follow = new Map<string, (() => void)[]>() // All lists setting id -> refreshers of the rows that follow it

  constructor(app: App, private plugin: StyleMate) {
    super(app, plugin)
    this.containerEl.addClass('customizer')
    // Obsidian's settings window takes Tab for itself and steps row by row (box, row, box, row...). Keep it away so Tab is the browser's: box to box.
    this.containerEl.addEventListener('keydown', e => { if (e.key === 'Tab') e.stopPropagation() })
  }

  // Declarative settings (Obsidian 1.13+), so Obsidian's settings search finds StyleMate. Every row is a `render` row built as before;
  // each group's row carries the names of all its settings as search aliases.
  // ponytail: search lands on the group (Headings, Lists...), not the single setting inside its collapsible box.
  getSettingDefinitions(): SettingDefinitionItem[] {
    this.syncs.clear(); this.follow.clear()
    const { plugin } = this
    const top = (name: string, ic: string, desc: string, build: (s: Setting) => unknown): SettingDefinition =>
      ({ name, desc, render: s => { icon(s.setName(name).setDesc(desc), ic); build(s) } })
    // Cards (user, 2026-10-09): About in its own card; the top settings each a card inside one larger card; each main group one larger
    // fold-out card with its rows and boxes as cards inside, and its Reset button on the big card itself.
    return [
      { type: 'group', cls: 'cz-about-group', items: [{ name: 'StyleMate', searchable: false, render: s => this.header(s) }] },
      { type: 'group', cls: 'cz-cards', items: [
      top('Live sample note', 'file-text', 'Opens a sample note (Live Preview and Reading view side by side). Every control below changes it as you move it.',
        s => s.addButton(b => b.setButtonText('Open sample note').setCta().onClick(() => void openPreview(this.app)))),
      top('Enable StyleMate', 'power', 'Off shows Obsidian as it was; your settings are kept.',
        s => s.addToggle(t => t.setValue(plugin.settings.enabled).onChange(v => { plugin.settings.enabled = v; plugin.apply(); plugin.save() }))),
      top('Color changes apply to', 'sun-moon', 'Light and dark themes keep separate colors.',
        s => s.addDropdown(d => d.addOptions({ current: 'Current theme only', both: 'Light and dark' }).setValue(plugin.settings.bothThemes ? 'both' : 'current')
          .onChange(v => { plugin.settings.bothThemes = v === 'both'; plugin.save() }))),
      top('Reset everything', 'rotate-ccw', 'Removes every change. Obsidian goes back to its defaults.',
        s => s.addButton(b => b.setButtonText('Reset all').setDestructive().onClick(() => { plugin.settings.values = {}; plugin.apply(); plugin.save(); this.resync() }))),
      top('Export as CSS', 'download', 'Your changes as a CSS snippet: save it to this vault\'s snippets folder (turn it on under Appearance > CSS snippets), or copy it to share.',
        s => s.addButton(b => b.setButtonText('Save snippet').onClick(() => void plugin.exportSnippet()))
          .addButton(b => b.setButtonText('Copy CSS').onClick(() => void plugin.copyCss(b.buttonEl.win)))),
      { name: 'Presets', aliases: ['save preset', 'load preset'], render: s => this.presets(s) }] },
      ...GROUPS.map((g): SettingDefinitionItem => ({ type: 'group', cls: 'cz-cards', items: [{ name: g, aliases: [...new Set(DEFS.filter(d => d.group === g).flatMap(d => [d.label, d.sub ?? '']).filter(Boolean))],
        render: s => { s.settingEl.empty(); s.settingEl.addClass('cz-host'); this.group(s.settingEl, g) } }] })),
    ]
  }

  private resync() { this.syncs.forEach(a => a.forEach(f => f())) }

  // About block, same layout as LevelMate, FolderMate and MindmapMate: name, version and author, what it does, tip line, coffee button.
  private header(s: Setting) {
    const el = s.settingEl
    el.empty(); el.addClass('cz-host')
    const { version, author } = this.plugin.manifest
    const about = el.createDiv({ cls: 'customizer-about' })
    about.createDiv({ cls: 'customizer-about-name', text: 'StyleMate' })
    about.createDiv({ cls: 'customizer-about-title', text: `v${version} · by ${author}` })
    about.createEl('p', { text: "Set Obsidian's look in Preferences instead of CSS: headings, text, page width, lists, checkboxes and quotes. Every control changes a sample note live, in Live Preview and Reading view." })
    about.createDiv({ cls: 'customizer-about-tip', text: 'If you enjoy this plugin, please consider a small tip, I would greatly appreciate it!' })
    const footer = about.createDiv({ cls: 'customizer-about-footer' })
    footer.createSpan({ text: 'Made with care' })
    const coffee = footer.createEl('a', { cls: 'customizer-coffee', href: COFFEE_URL, attr: { target: '_blank', rel: 'noopener', 'aria-label': 'Buy me a coffee' } })
    coffee.createEl('img', { attr: { src: COFFEE_BUTTON, alt: 'Buy me a coffee' } })
  }

  // One main group (PAGE, HEADINGS, LISTS...) as a collapsible box with its sub-boxes and rows.
  private group(host: HTMLElement, g: string) {
    const { plugin } = this
    const box = this.details(host, g, g)
    box.addClass('cz-main')
    const subs = new Map<string, HTMLElement>()
    if (g === 'Headings') {
      const pal = this.palette(box)
      box.addEventListener('toggle', () => { if (box.open) pal.open = true }) // the Auto palette is open whenever Headings is
    }
    for (const d of DEFS.filter(x => x.group === g)) {
      let parent: HTMLElement = box
      if (d.sub) {
        if (!subs.has(d.sub)) subs.set(d.sub, this.details(box, g + d.sub, d.sub))
        parent = subs.get(d.sub)!
        // Sections inside a box: a small heading (Color, Shape, Spacing...), or a collapsible box for the six indent steps.
        if (d.sec) {
          const key = d.sub + d.sec
          if (!subs.has(key)) subs.set(key, BOXED.has(d.sec) ? this.details(parent, g + key, d.sec) : parent.createDiv({ cls: 'cz-sec', text: d.sec }) && parent)
          parent = subs.get(key)!
        }
        if (g === 'Headings' && /^H[2-6]$/.test(d.sub) && !parent.querySelector('.cz-inherit')) {
          const n = Number(d.sub[1])
          icon(new Setting(parent).setName(`Inherit from H${n - 1}`).setDesc(`Copies H${n - 1}'s space above, space below, shift and line height here. Change them after if you like.`), 'copy')
            .addButton(b => { b.setButtonText(`Copy from H${n - 1}`).onClick(() => { plugin.inherit(n - 1, n); this.syncs.get('Headings')?.forEach(f => f()) }); b.buttonEl.addClass('cz-inherit') })
        }
      }
      if (STRIP.test(d.id) && !d.id.endsWith('-case')) continue // drawn in the case row's strip
      this.row(parent, STRIP.test(d.id) ? DEFS.filter(x => x.sub === d.sub && STRIP.test(x.id)) : [d], g)
    }
    // A reset button at the foot of each six-level box (Indent steps, Space above, Space below).
    for (const [key, el] of subs) {
      const sec = [...BOXED].find(b => key.endsWith(b))
      if (!sec) continue
      const defs = DEFS.filter(x => x.group === g && x.sub! + x.sec === key)
      new Setting(el).setName('').setClass('cz-reset-row').addButton(b => b.setButtonText(`Reset ${sec.toLowerCase()}`).onClick(() => { defs.forEach(x => plugin.clear(x)); this.syncs.get(g)?.forEach(f => f()) }))
    }
    new Setting(box).setName('').setClass('cz-reset-row').addButton(b => b.setButtonText(`Reset ${g}`).onClick(() => {
      if (g === 'Headings') plugin.clearPalette() // else the heading colors would go back to the palette
      DEFS.filter(x => x.group === g).forEach(x => plugin.clear(x)); this.syncs.get(g)?.forEach(f => f())
    }))
  }

  // Installed font names for the font boxes (Chromium's Local Font Access); empty if the computer won't say.
  private static fonts?: Promise<string[]>
  private async fontList(host: HTMLElement): Promise<string> {
    StyleMateTab.fonts ??= (async () => {
      try {
        const all = await (window as unknown as { queryLocalFonts(): Promise<{ family: string }[]> }).queryLocalFonts()
        return [...new Set(all.map(f => f.family))].sort((a, b) => a.localeCompare(b))
      } catch { return [] }
    })()
    const dl = host.createEl('datalist', { attr: { id: `cz-fonts-${Math.random().toString(36).slice(2)}` } })
    for (const f of await StyleMateTab.fonts) dl.createEl('option', { value: f })
    return dl.id
  }

  // Saved presets: pick one to load or delete, or save the current settings under a name. Redraws only its own row.
  private presets(row: Setting) {
    const { plugin } = this
    const host = row.settingEl
    host.empty(); host.addClass('cz-host')
    const redraw = () => this.presets(row)
    const names = Object.keys(plugin.settings.presets).sort()
    if (!names.includes(this.pick)) this.pick = names[0] ?? ''
    let name = ''
    icon(new Setting(host).setName('Presets'), 'bookmark').setDesc(names.length ? 'Load or delete a saved preset. Loading replaces your current settings.' : 'No presets saved yet.')
      .addDropdown(d => { d.addOptions(Object.fromEntries(names.map(n => [n, n]))).onChange(v => { this.pick = v }); if (this.pick) d.setValue(this.pick) })
      .addButton(b => b.setButtonText('Load').setDisabled(!names.length).onClick(() => { plugin.loadPreset(this.pick); this.resync(); redraw() }))
      .addButton(b => b.setButtonText('Delete').setDestructive().setDisabled(!names.length).onClick(() => { plugin.deletePreset(this.pick); redraw() }))
    icon(new Setting(host).setName('Save current settings as a preset'), 'save').setDesc('Using an existing name replaces that preset.')
      .addText(t => t.setPlaceholder('Preset name').onChange(v => { name = v.trim() }))
      .addButton(b => b.setButtonText('Save').onClick(() => { if (name) { plugin.savePreset(name); this.pick = name; redraw() } }))
  }

  // Auto palette: pick the H1 (start) and H6 (end) colors; H2-H5 blend between them. Sliders then shift (hue, saturation, value) or widen (contrast) the whole gradient.
  private palette(box: HTMLElement): HTMLDetailsElement {
    const { plugin } = this
    const el = this.details(box, 'Headings palette', 'Auto palette (all headings, H1-H6)')
    const defs = [1, 2, 3, 4, 5, 6].map(n => DEFS.find(d => d.id === `h${n}-color`)!)
    let start = toHex(plugin.current(defs[0])) || '#808080', end = toHex(plugin.current(defs[5])) || '#808080'
    const off = [0, 0, 0, 0] // hue, saturation, value, contrast
    const sliders: ReturnType<typeof addTrackSlider>[] = []
    const swatches: { set(hex: string): void }[] = []
    const rainbow = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map(d => `hsl(${d} 100% 50%)`).join(', ')})`
    // Each track shows what dragging it does to the start color (contrast: the six colors as they are now).
    const paintTracks = () => {
      const [h, sat, l] = hexToHsl(start)
      sliders[1].setBackground(`linear-gradient(to right, hsl(${h} 0% ${l}%), hsl(${h} 100% ${l}%))`)
      sliders[2].setBackground(`linear-gradient(to right, hsl(${h} ${sat}% 0%), hsl(${h} ${sat}% 50%), hsl(${h} ${sat}% 100%))`)
      sliders[3].setBackground(`linear-gradient(to right, ${shiftColors(contrast(gradient(start, end), off[3]), off[0], off[1], off[2]).join(', ')})`)
    }
    const write = () => {
      plugin.setPalette(shiftColors(contrast(gradient(start, end), off[3]), off[0], off[1], off[2]))
      paintTracks(); this.syncs.get('Headings')?.forEach(f => f())
    }

    const ends: [string, string, (h: string) => void][] = [['Start color', 'The color applied to main headings (H1).', h => { start = h }],
      ['End color', 'The color applied to the smallest headings (H6). H2-H5 blend between the start and end colors.', h => { end = h }]]
    ends.forEach(([name, desc, set], i) => {
      const s = icon(new Setting(el).setName(name).setDesc(desc), 'pipette')
      const c = addColorPicker(s, h => { set(h); write() })
      c.set(i ? end : start); swatches.push(c)
    })
    PAL.forEach(([name, desc, min, max, ic], i) => {
      const s = icon(new Setting(el).setName(name).setDesc(desc), ic)
      sliders.push(addTrackSlider(s, min, max, 1, v => { off[i] = v; write() }, i ? '' : rainbow))
      s.addExtraButton(b => b.setIcon('rotate-ccw').setTooltip('Back to 0').onClick(() => { sliders[i].set(0); off[i] = 0; write() }))
    })
    icon(new Setting(el).setName('Apply to all headings').setDesc('Sets H1-H6 to the palette colors again, undoing any heading color changed by hand. A single heading\'s reset arrow also goes back to its palette color.'), 'paintbrush')
      .addButton(b => b.setButtonText('Apply palette').onClick(write))
    paintTracks()
    // "Reset Headings" / "Reset all" clear the heading colors: bring the sliders and swatches back with them.
    ;(this.syncs.get('Headings') ?? this.syncs.set('Headings', []).get('Headings')!).push(() => {
      if (defs.some(d => plugin.has(d))) return
      off.fill(0); sliders.forEach(c => c.set(0))
      start = toHex(plugin.current(defs[0])) || '#808080'; end = toHex(plugin.current(defs[5])) || '#808080'
      swatches[0].set(start); swatches[1].set(end); paintTracks()
    })
    return el
  }

  private details(parent: HTMLElement, key: string, title: string): HTMLDetailsElement {
    const el = parent.createEl('details', { cls: 'customizer-group' })
    el.open = this.open.has(key)
    el.createEl('summary', { text: title })
    el.addEventListener('toggle', () => { if (el.open) this.open.add(key); else this.open.delete(key) })
    return el
  }

  // One setting row; several defs (the heading style strip) share a row, a changed-bar and one reset arrow.
  private row(parent: HTMLElement, defs: Def[], group: string) {
    const { plugin } = this
    const d0 = defs[0], strip = defs.length > 1
    const s = new Setting(parent).setName(strip ? 'Style' : d0.kind === 'num' && d0.unit ? `${d0.label} (${d0.unit})` : d0.label) // the number box beside the slider shows the value
    if (d0.icon) icon(s, d0.icon)
    const text = strip ? 'Letter case (dropdown), italic and underline (the two buttons) for this heading.' : d0.tip ?? ''
    // A row that follows another setting (All lists, Text color, Note link) says so, and shows that value until it is changed here.
    const lead = d0.follows ? DEFS.find(x => x.id === d0.follows) : undefined
    const leadValue = () => {
      const v = plugin.current(lead!)
      if (lead!.kind === 'color') return toHex(v)
      if (d0.unit === lead!.unit) return String(toNum(v, d0.unit))
      return String(Math.round(toNum(v, lead!.unit) * (parseFloat(getComputedStyle(document.body).getPropertyValue('--font-text-size')) || 16))) // em -> px
    }
    const by = lead && (lead.sub && lead.sub !== d0.sub ? lead.sub : lead.label), list = lead?.sub === 'All lists'
    const describe = () => s.setDesc(!lead ? text : plugin.has(d0) ? (list ? `${text} Overrides All lists for ${d0.sub!.toLowerCase()}.` : text)
      : `${text} Follows ${by} (${lead.kind === 'color' ? leadValue() || 'default' : `${Math.round(toNum(plugin.current(lead), lead.unit) * 1000) / 1000} ${lead.unit}`}).`)
    if (strip) s.controlEl.addClass('cz-strip')
    const mark = () => { s.settingEl.toggleClass('customizer-changed', defs.some(d => plugin.has(d))); describe() }
    let quiet = false // setValue on a control can fire onChange; that must not count as a user edit
    const syncs = defs.map(d => {
      const change = (v: string | number) => { if (quiet) return; plugin.set(d, v); mark(); this.follow.get(d.id)?.forEach(f => f()) }
      if (d.kind === 'num') {
        // Slider for sweeping, number box for exact values (it may go past the slider's ends). Shift+arrow moves either by ten steps.
        const lo = d.min! < 0 ? d.min! * 2 : d.min!, hi = d.hi ?? d.max! * 2, st = d.step!
        const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
        let c!: SliderComponent
        const box = s.controlEl.createEl('input', { type: 'number', cls: 'cz-num', attr: { min: String(lo), max: String(hi), step: String(st), 'aria-label': `${d.label} value` } })
        let parking = false // c.setValue fires onChange when the value moves; that must not overwrite what was typed
        const park = (v: number) => { parking = true; c.setValue(clamp(v, d.min!, d.max!)); parking = false }
        const onSlide = (v: number) => { if (parking) return; box.value = String(v); change(v) }
        s.addSlider(x => { c = x.setLimits(d.min!, d.max!, st).onChange(onSlide) })
        c.sliderEl.addEventListener('input', () => onSlide(c.getValue())) // live while dragging, not only on release
        s.controlEl.appendChild(box) // after the slider
        c.sliderEl.tabIndex = -1 // Tab goes from number box to number box; the slider is for the mouse (Shift+arrow still works once clicked)
        box.addEventListener('input', () => { const v = parseFloat(box.value); if (isFinite(v) && v >= lo && v <= hi) { park(v); change(v) } })
        box.addEventListener('change', () => { const v = clamp(parseFloat(box.value), lo, hi); if (isFinite(v)) { box.value = String(v); park(v); change(v) } else box.value = String(toNum(plugin.current(d), d.unit)) })
        const bump = (el: HTMLInputElement, a: number, b: number, set: (v: number) => void) => el.addEventListener('keydown', e => {
          const dir = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0
          if (!e.shiftKey || !dir) return
          e.preventDefault()
          set(Number(clamp((parseFloat(el.value) || 0) + dir * 10 * st, a, b).toFixed(6)))
        })
        bump(c.sliderEl, d.min!, d.max!, v => { park(v); onSlide(v) })
        bump(box, lo, hi, v => { box.value = String(v); park(v); change(v) })
        return (v: string) => { const n = toNum(v, d.unit); park(n); box.value = String(Math.round(n * 1e6) / 1e6) }
      }
      if (d.kind === 'color') {
        const c = addColorPicker(s, change)
        return (v: string) => c.set(toHex(v)) // '' (transparent) shows as "no color", not black
      }
      if (d.kind === 'text') {
        let c!: TextComponent
        s.addText(x => { c = x.setPlaceholder(d.fallback ?? '').onChange(change) })
        if (d.fonts) void this.fontList(s.controlEl).then(id => c.inputEl.setAttr('list', id))
        return (v: string) => { c.setValue(plugin.has(d) ? v : '') }
      }
      if (d.kind === 'toggle' && !strip) { // a row of its own: Obsidian's switch
        let t!: ToggleComponent
        s.addToggle(x => { t = x.onChange(v => change(v ? 'yes' : 'no')) })
        return (v: string) => { t.setValue(v === 'yes') }
      }
      if (d.kind === 'toggle') {
        const b = s.controlEl.createEl('button', { cls: 'cz-toggle', attr: { 'aria-label': d.label } })
        setIcon(b, d.icon!); setTooltip(b, d.label) // also its aria-label
        const show = (v: string) => { b.toggleClass('is-active', v === 'yes'); b.setAttr('aria-pressed', String(v === 'yes')) }
        b.addEventListener('click', () => { const v = b.hasClass('is-active') ? 'no' : 'yes'; change(v); show(v) })
        return show
      }
      let c!: DropdownComponent
      s.addDropdown(x => { c = x.onChange(change) })
      if (strip) c.selectEl.setAttr('aria-label', d.label)
      return (v: string) => { if (!d.options!.includes(v)) d.options!.push(v); c.selectEl.empty(); c.addOptions(Object.fromEntries(d.options!.map(o => [o, o]))).setValue(v) }
    })
    s.addExtraButton(b => { b.setIcon('rotate-ccw').setTooltip(lead ? `Follow ${by} again` : 'Reset to default')
      .onClick(() => { defs.forEach(d => plugin.clear(d)); refresh(); defs.forEach(d => this.follow.get(d.id)?.forEach(f => f())) })
      b.extraSettingsEl.tabIndex = -1 }) // not a Tab stop either, so Tab runs from box to box
    const refresh = () => { quiet = true; defs.forEach((d, i) => syncs[i](lead && !plugin.has(d) ? leadValue() : plugin.current(d))); quiet = false; mark() }
    refresh()
    ;(this.syncs.get(group) ?? this.syncs.set(group, []).get(group)!).push(refresh)
    if (lead) (this.follow.get(lead.id) ?? this.follow.set(lead.id, []).get(lead.id)!).push(refresh)
  }
}
