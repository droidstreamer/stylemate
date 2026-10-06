// Store screenshots and README animation, taken in a real Obsidian on "../showcase-vault/My Vault" (port 9335). `npm run build`, copy dist/
// into that vault's .obsidian/plugins/stylemate/, then `npm run showcase`. Output: ../showcase/ (1200x800 PNGs; demo.gif via scripts/make-gif.py).
process.env.VAULT ??= '../showcase-vault/My Vault'; process.env.PORT ??= '9335'
const OUT = process.env.SHOTS ??= '../showcase'
const { PORT, call, connect, ev, sleep } = await import('./drive.mjs')
import { mkdirSync, writeFileSync } from 'node:fs'
mkdirSync(`${OUT}/raw`, { recursive: true })

const NOTE = 'Projects/Garden Plan/Garden plan.md', P = `app.plugins.plugins.stylemate`
// The look shown off: warm amber headings fading to sage, small-caps H2, round checkboxes, a soft quote and callout. Dark and light colors.
const HEAD = { dark: ['#F4A261', '#E9B872', '#D4BE7A', '#B5BE84', '#97B98B', '#7FB77E'], light: ['#C2410C', '#B45309', '#A16207', '#4D7C0F', '#3F6212', '#166534'] }
const COLORS = {
  dark: { marker: '#F4A261', 'cb-color': '#7FB77E', 'cb-border': '#7FB77E', 'quote-border': '#F4A261', 'quote-bg': '#2B241E', 'quote-text': '#E9D8C4',
    'callout-bg': '#1E2A22', 'callout-title': '#7FB77E', 'callout-icon': '#7FB77E', link: '#E9B872' },
  light: { marker: '#C2410C', 'cb-color': '#3F6212', 'cb-border': '#3F6212', 'quote-border': '#C2410C', 'quote-bg': '#FBF1E6', 'quote-text': '#5B4636',
    'callout-bg': '#EEF5EA', 'callout-title': '#3F6212', 'callout-icon': '#3F6212', link: '#B45309' },
}
const LOOK = {
  'h1-size': 2.3, 'h1-weight': 800, 'h1-spacing': -0.01, 'h2-size': 1.05, 'h2-case': 'ALL CAPS', 'h2-spacing': 0.12, 'h2-weight': 700, 'h3-italic': 'yes', 'h3-size': 1.25,
  'h4-case': 'small caps', 'line-height': 1.65, 'bullet-size': 7, 'cb-radius': 50, 'cb-size': 18, 'quote-thick': 4, 'list-spacing': 0.1,
  ...Object.fromEntries(['dark', 'light'].flatMap(t => [...HEAD[t].map((c, i) => [`h${i + 1}-color@${t}`, c]), ...Object.entries(COLORS[t]).map(([k, v]) => [`${k}@${t}`, v])])),
}
const look = async (values = LOOK) => ev(`const p = ${P}; p.saveData = async () => {}; p.settings.enabled = true; p.settings.values = ${JSON.stringify(values)}; p.apply(); await new Promise(r => setTimeout(r, 400)); return 1`)

const W = 1280, H = 800
const size = (w, h, dsf) => call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dsf, mobile: false })
const grab = async (name, clip = { x: 0, y: 0, width: W, height: H }, cdp = call) => {
  const r = await cdp('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })
  writeFileSync(`${OUT}/raw/${name}.png`, Buffer.from(r.data, 'base64'))
  return `data:image/png;base64,${r.data}`
}
const rect = (sel, e = ev) => e(`const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }`)
const pad = (r, px, py = px) => ({ x: r.x - px, y: r.y - py, width: r.width + 2 * px, height: r.height + 2 * py })

// The garden note open in one tab (Reading view), the explorer showing where it lives.
const scene = async ({ theme = 'obsidian', sidebar = true, mode = 'preview', file = NOTE } = {}) => {
  await ev(`app.changeTheme(${JSON.stringify(theme)}); document.querySelectorAll('.modal-close-button').forEach(b => b.click())
    app.workspace.rightSplit.collapse(); ${sidebar ? 'app.workspace.leftSplit.expand()' : 'app.workspace.leftSplit.collapse()'}
    const fe = app.workspace.getLeavesOfType('file-explorer')[0]?.view
    if (fe) { for (const it of Object.values(fe.fileItems)) if (it.setCollapsed && !it.collapsed) await it.setCollapsed(true)
      for (const f of ['Projects', 'Projects/Garden Plan']) { const it = fe.fileItems[f]; if (it?.collapsed) await it.setCollapsed(false) } }
    const leaf = app.workspace.getLeaf(false)
    await leaf.setViewState({ type: 'markdown', state: { file: ${JSON.stringify(file)}, mode: ${JSON.stringify(mode)}, source: false } })
    for (const l of app.workspace.getLeavesOfType('markdown').concat(app.workspace.getLeavesOfType('empty'))) if (l !== leaf) l.detach()
    app.workspace.setActiveLeaf(leaf, { focus: false }); leaf.view.previewMode?.applyScroll?.(0)
    await new Promise(r => setTimeout(r, 900)); return 1`)
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 640, y: 5 }); await sleep(300) // no hover tooltips in the frames
}
const noteSel = '.workspace-leaf.mod-active .markdown-preview-sizer'
// A crop of the note from its top down to one element (by text), with a margin.
const noteClip = async (until, extra = 18, max = 2000) => ev(`const s = document.querySelector(${JSON.stringify(noteSel)}), r = s.getBoundingClientRect()
  const end = [...s.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,.callout')].find(e => e.textContent.trim().startsWith(${JSON.stringify(until)})).getBoundingClientRect()
  const top = s.querySelector('h1').getBoundingClientRect().y - 22
  return { x: r.x - 24, y: top, width: r.width + 48, height: Math.min(end.bottom - top + ${extra}, ${max}) }`)

// Settings window: its own page target. Opens StyleMate's pane at a size where the text reads.
const settings = async (w, h, open = []) => {
  await ev(`app.setting.open(); app.setting.openTabById('stylemate'); await new Promise(r => setTimeout(r, 900)); return 1`)
  const t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(x => x.type === 'page' && x.title.startsWith('Settings'))
  const s = await connect(t)
  await s.call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false }); await sleep(600)
  await s.ev(`document.querySelectorAll('.customizer details').forEach(d => d.open = false)
    let box = document
    for (const p of ${JSON.stringify(open)}) { box = [...box.querySelectorAll('details')].find(d => d.querySelector(':scope > summary').textContent.startsWith(p)); box.open = true }
    document.querySelector('.vertical-tab-content').scrollTop = 0; if (box !== document) box.scrollIntoView({ block: 'start' }); return 1`); await sleep(500)
  return s
}
const closeSettings = async s => { s.ws.close(); await ev(`app.setting.close(); return 1`); await sleep(300) }

// Composer: a full-window overlay at exactly 1200x800, one per store image (FolderMate house style).
const ACCENT = { amber: ['#7c2d12', '#F59E0B'], green: ['#14532d', '#16A34A'], pink: ['#831843', '#DB2777'], blue: ['#1e3a8a', '#3B82F6'], violet: ['#4c1d95', '#8B5CF6'] }
const compose = async (name, accent, title, sub, body) => {
  const [deep, bright] = ACCENT[accent]
  await size(1200, 800, 1); await sleep(300)
  await ev(`const o = document.body.createDiv({ cls: 'sm-showcase' }); o.setAttr('style', ${JSON.stringify(`position:fixed;inset:0;z-index:99999;overflow:hidden;font-family:var(--font-interface);color:#fff;
    background:radial-gradient(1100px 700px at 85% 110%, ${bright}55, transparent 60%),radial-gradient(900px 600px at 0% 0%, ${deep}, transparent 70%),#0f1115;`)})
    o.innerHTML = ${JSON.stringify(`
      <div style="position:absolute;left:56px;top:40px;display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;letter-spacing:.02em;opacity:.85">
        ${HEAD.dark.slice(0, 5).map(c => `<span style="width:10px;height:10px;border-radius:3px;background:${c}"></span>`).join('')}
        <span style="margin-left:4px">StyleMate</span></div>
      <div style="position:absolute;left:56px;top:84px;right:56px;font-size:40px;font-weight:700;line-height:1.15;letter-spacing:-.01em">${title}</div>
      <div style="position:absolute;left:56px;top:138px;right:56px;font-size:19px;line-height:1.45;color:#c9cdd6">${sub}</div>
      ${body}`)}; await new Promise(r => setTimeout(r, 400)); return 1`)
  const r = await call('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('frame', `${OUT}/${name}.png`)
  await ev(`document.querySelector('.sm-showcase')?.remove(); return 1`)
  await size(W, H, 2); await sleep(300)
}
const card = (src, css) => `<img src="${src}" style="position:absolute;border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08);${css}">`
const pill = (text, color, css) => `<div style="position:absolute;padding:6px 12px;border-radius:999px;font-size:14px;font-weight:600;background:${color};box-shadow:0 8px 24px rgba(0,0,0,.4);${css}">${text}</div>`
const label = (text, css) => `<div style="position:absolute;font-size:16px;font-weight:600;color:#e5e7eb;text-align:center;${css}">${text}</div>`

const only = process.argv.slice(2) // e.g. `npm run showcase -- 1 3` to redo some frames
const want = n => !only.length || only.includes(String(n))
await size(W, H, 2)

// 1. Hero: the whole app with the garden look on, StyleMate's Headings box beside it.
if (want(1)) {
  await ev(`const f = app.vault.getFileByPath('StyleMate Preview.md'); if (f) await app.vault.delete(f); return 1`) // made by frames 2 and 3; not part of "My Vault"
  await size(1000, 640, 2); await look(); await scene()
  const hero = await grab('hero', { x: 0, y: 0, width: 1000, height: 640 })
  await size(W, H, 2)
  const s = await settings(760, 1300, ['Headings', 'H2'])
  const r = await s.ev(`const d = [...document.querySelectorAll('details')].find(d => d.querySelector(':scope > summary').textContent === 'H2'), r = d.getBoundingClientRect(); return { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: Math.min(r.height, 520) + 16 }`)
  const pane = await grab('hero-settings', r, s.call)
  await closeSettings(s)
  await compose('1-hero', 'amber', 'Style Obsidian. No CSS needed.',
    'Full control, no code: H1 to H6 each get their own size, weight, font, color, indent and spacing sliders.',
    card(hero, 'left:56px;top:206px;width:860px') + card(pane, 'right:56px;top:262px;width:400px'))
}

// 2. How you use it: a slider moves, the sample note follows, in Live Preview and Reading view side by side.
if (want(2)) {
  await look()
  await ev(`for (const l of app.workspace.getLeavesOfType('markdown')) l.detach(); app.workspace.leftSplit.collapse(); app.workspace.rightSplit.collapse()
    await app.commands.executeCommandById('stylemate:open-preview'); await new Promise(r => setTimeout(r, 1200))
    for (const l of app.workspace.getLeavesOfType('empty')) l.detach(); await new Promise(r => setTimeout(r, 800)); return 1`)
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 640, y: 5 })
  const root = await rect('.workspace-split.mod-root')
  // Both panes from the top of their notes: hide the tab and view headers for this capture only.
  await ev(`document.head.createEl('style', { cls: 'sm-hide', text: '.mod-root .workspace-tab-header-container, .mod-root .view-header, .titlebar-button-container, .sidebar-toggle-button { display: none }' }); await new Promise(r => setTimeout(r, 500)); return 1`)
  const sample = await grab('sample', { x: root.x, y: root.y, width: root.width, height: 470 })
  await ev(`document.querySelectorAll('.sm-hide').forEach(e => e.remove()); return 1`)
  const s = await settings(760, 1300, ['Headings', 'H1'])
  const r = await s.ev(`const d = [...document.querySelectorAll('details')].find(d => d.querySelector(':scope > summary').textContent === 'H1'), rows = [...d.querySelectorAll(':scope > .setting-item')].slice(0, 2)
    const a = rows[0].getBoundingClientRect(), b = rows[1].getBoundingClientRect(); return { x: a.x - 10, y: a.y - 4, width: a.width + 20, height: b.bottom - a.y + 8 }`)
  const rows = await grab('h1-rows', r, s.call)
  await closeSettings(s)
  const k = 1088 / root.width
  await compose('2-live', 'green', 'Move a slider. Watch it change.',
    'Open the sample note: every control updates Live Preview and Reading view as you drag.',
    card(rows, 'left:56px;top:198px;width:460px') +
    label('Settings › StyleMate › Headings › H1', 'left:552px;width:592px;top:232px;text-align:left;font-size:18px;color:#c9cdd6') +
    label('Drag, type a number, or Shift + arrow<br>for ten steps at once.', 'left:552px;width:592px;top:268px;text-align:left;font-size:18px;line-height:1.45;font-weight:500;color:#9aa1ad') +
    card(sample, `left:56px;top:398px;width:1088px;height:${Math.round(352)}px;object-fit:cover;object-position:top`) +
    pill('Live Preview', '#16A34A', 'left:76px;top:382px') + pill('Reading view', '#16A34A', `left:${Math.round(56 + k * root.width / 2 + 20)}px;top:382px`))
}

// 3. The key idea, zoomed in: two colors make six headings (Auto palette). Pills sit level with H1 and H6.
if (want(3)) {
  await look(); await scene({ sidebar: false, file: 'Resources/Reading List/Books to read.md' })
  const hs = await ev(`return [...document.querySelectorAll('${noteSel} :is(h1,h2,h3,h4,h5,h6)')].map(h => { const r = h.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })`)
  const clip = { x: hs[0].x - 28, y: hs[0].y - 18, width: 440, height: hs[5].y + hs[5].height - hs[0].y + 36 }
  const stack = await grab('palette-headings', clip)
  const s = await settings(760, 1300, ['Headings', 'Auto palette'])
  const r = await s.ev(`const d = [...document.querySelectorAll('details')].find(d => d.querySelector(':scope > summary').textContent.startsWith('Auto palette')), rows = [...d.querySelectorAll(':scope > .setting-item')]
    const a = rows[0].getBoundingClientRect(), b = rows[3].getBoundingClientRect(); return { x: a.x - 10, y: a.y - 6, width: a.width + 20, height: b.bottom - a.y + 12 }`)
  const pal = await grab('palette-settings', r, s.call)
  await closeSettings(s)
  const top = 214, cw = 440, k = cw / clip.width, left = 1200 - 56 - cw
  const y = i => Math.round(top + (hs[i].y + hs[i].height / 2 - clip.y) * k - 16)
  await compose('3-palette', 'pink', 'Two colors. Six headings.',
    'Pick a start and an end color, and H2 to H5 blend between them. Shift the hue or saturation of all six at once.',
    card(pal, `left:56px;top:${top}px;width:560px`) + card(stack, `left:${left}px;top:${top}px;width:${cw}px`) +
    pill('← Start color', '#DB2777', `left:${left + 290}px;top:${y(0)}px`) + pill('← End color', '#475569', `left:${left + 290}px;top:${y(5)}px`))
}

// 4. Before and after, and the light theme: the same note, three ways.
if (want(4)) {
  await size(560, 1200, 2)
  const shot = async (name, values, theme) => { await look(values); await scene({ theme, sidebar: false }); return grab(name, await noteClip('Order the seed', 12, 790)) }
  const before = await shot('before', {}, 'obsidian'), after = await shot('after', LOOK, 'obsidian'), light = await shot('light', LOOK, 'moonstone')
  await size(W, H, 2); await scene()
  await compose('4-before-after', 'blue', 'Your look, light or dark.',
    'The same note before and after. Light and dark themes each keep their own colors.',
    label('Obsidian default', 'left:56px;width:340px;top:198px') + card(before, 'left:56px;top:228px;width:340px') +
    label('With StyleMate', 'left:430px;width:340px;top:198px') + card(after, 'left:430px;top:228px;width:340px') +
    label('Light theme', 'right:56px;width:340px;top:198px') + card(light, 'right:56px;top:228px;width:340px'))
}

// 5. Settings: StyleMate's pane in a narrow window so the text reads. Top rows, then the Lists group open.
if (want(5)) {
  await look(); await scene()
  const s = await settings(760, 1300, [])
  const at = t => s.ev(`const r = [...document.querySelectorAll('.vertical-tab-content .setting-item')].filter(x => x.offsetParent).find(h => h.querySelector('.setting-item-name')?.textContent.trim().startsWith(${JSON.stringify(t)})).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, bottom: r.bottom }`)
  const a = await at('Live sample note'), b = await at('Save current')
  const head = await grab('settings-top', { x: a.x - 12, y: a.y - 8, width: a.width + 24, height: b.bottom - a.y + 18 }, s.call)
  const r = await s.ev(`const find = (root, t) => [...root.querySelectorAll('details')].find(d => d.querySelector(':scope > summary').textContent === t)
    const l = find(document, 'Lists'), c = find(l, 'Checkbox lists'); l.open = true; c.open = true; l.scrollIntoView({ block: 'start' }); await new Promise(r => setTimeout(r, 300))
    const lr = l.getBoundingClientRect(), cr = c.getBoundingClientRect(); return { x: lr.x - 4, y: lr.y - 4, width: lr.width + 8, height: Math.min(cr.y + 600, cr.bottom, innerHeight) - lr.y }`)
  const rest = await grab('settings-lists', r, s.call)
  await closeSettings(s)
  await compose('5-settings', 'violet', 'Everything in one place.',
    'Save presets, export your look as a CSS snippet, and find any option from Obsidian\'s settings search.',
    card(head, 'left:56px;top:205px;width:540px') + card(rest, 'right:56px;top:205px;width:520px'))
}

// 6. README animation frames: the garden note picks up the look step by step. scripts/make-gif.py turns them into demo.gif.
if (want(6)) {
  await size(560, 1100, 2); await look({}); await scene({ sidebar: false })
  const clip = await noteClip('Build the second', 12)
  const pick = keys => Object.fromEntries(Object.entries(LOOK).filter(([k]) => keys.some(x => k.startsWith(x))))
  const steps = [[], ['h1-', 'h2-', 'h3-', 'h4-', 'h5-', 'h6-'], ['h', 'line', 'marker', 'bullet', 'list'], ['h', 'line', 'marker', 'bullet', 'list', 'cb', 'link']]
  for (const [i, keys] of steps.entries()) { await look(pick(keys)); await sleep(300); await grab(`gif-${i}`, clip) }
  await size(W, H, 2)
}

await look(); await scene()
process.exit(0)
