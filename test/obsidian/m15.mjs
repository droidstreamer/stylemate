// M15 live checks: plain settings background, checkbox ticked hover color (real mouse, both views), black and white print (real Export to PDF).
// `npm run build` first, then `node test/obsidian/m15.mjs`. Needs pdftoppm and python3 with PIL.
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { call, check, done, ev, openSettings, shot, sleep, SHOTS } from './drive.mjs'

await ev(`const p = app.plugins.plugins.stylemate; p.saveData = async () => {}; p.settings.values = {}; p.settings.enabled = true; p.settings.bothThemes = true; p.apply()
  const f = app.vault.getAbstractFileByPath('StyleMate Preview.md'); for (const l of app.workspace.getLeavesOfType('markdown')) l.detach()
  if (f) await app.vault.delete(f); return 1`)
await call('Page.bringToFront')
console.log('StyleMate', await ev(`return app.plugins.plugins.stylemate.manifest.version`))
await ev(`await app.commands.executeCommandById('stylemate:open-preview'); await new Promise(r => setTimeout(r, 1500)); return 1`)
const s = await openSettings()

// --- 1. (M16 replaced the plain background with cards; m16.mjs checks them) the group headers still line up with the rows inside
const bg = await s.ev(`const l = e => e.getBoundingClientRect().left
  return { row: l([...document.querySelectorAll('.customizer .setting-item')].find(r => r.textContent.includes('Live sample'))), main: l(document.querySelector('.customizer details.cz-main > summary')) }`)
check('top rows and group headers line up', Math.abs(bg.row - bg.main) < 12, `${bg.row} ${bg.main}`)
await s.shot('m15-settings-bg')

// --- 2. ticked checkbox under a real mouse, both views
const path = ['Lists', 'Checkbox lists']
const rgb = h => `rgb(${[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ')})`
const desc = await s.ev(`return __row(${JSON.stringify(path)}, 'Ticked fill, on hover').querySelector('.setting-item-description').textContent`)
check('hover row says it follows Ticked fill', desc.includes('Follows Ticked fill'), desc)
await call('Page.bringToFront')
const hover = async mode => {
  const sel = mode === 'preview' ? '.markdown-preview-view input.task-list-item-checkbox:checked' : '.markdown-source-view input.task-list-item-checkbox:checked'
  const r = await ev(`const v = app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === '${mode}').view.containerEl
    const sc = v.querySelector('${mode === 'preview' ? '.markdown-preview-view' : '.cm-scroller'}'); let b
    for (let y = 0; y < 20 && !(b = v.querySelector('${sel}')); y++) { sc.scrollTop = y * 300; await new Promise(r => setTimeout(r, 200)) } // only what is on screen is drawn
    b.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300)); const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]`)
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 }); await sleep(150)
  const idle = await ev(`return getComputedStyle(document.elementFromPoint(${r[0]}, ${r[1]})).backgroundColor`)
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0], y: r[1] }); await sleep(300)
  const over = await ev(`const e = document.elementFromPoint(${r[0]}, ${r[1]}); return [e.matches(':hover'), getComputedStyle(e).backgroundColor]`)
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 })
  return { idle, hovered: over[0], over: over[1] }
}
await s.ev(`__color(${JSON.stringify(path)}, 'Ticked fill', '#cc3366'); return 1`); await sleep(400)
for (const [name, mode] of [['Reading view', 'preview'], ['Live Preview', 'source']]) {
  const h = await hover(mode)
  check(`${name}: ticked box keeps Ticked fill under the mouse`, h.hovered && h.idle === rgb('#cc3366') && h.over === rgb('#cc3366'), JSON.stringify(h))
}
await s.ev(`__color(${JSON.stringify(path)}, 'Ticked fill, on hover', '#3366cc'); return 1`); await sleep(400)
for (const [name, mode] of [['Reading view', 'preview'], ['Live Preview', 'source']]) {
  const h = await hover(mode)
  check(`${name}: Ticked fill, on hover shows under the mouse`, h.hovered && h.idle === rgb('#cc3366') && h.over === rgb('#3366cc'), JSON.stringify(h))
}
await s.ev(`__reset(${JSON.stringify(path)}, 'Ticked fill, on hover'); return 1`)
check('reset: hover follows Ticked fill again', !(await ev(`return 'cb-hover@dark' in app.plugins.plugins.stylemate.settings.values || 'cb-hover@light' in app.plugins.plugins.stylemate.settings.values`)))

// --- 3. black and white print: the switch, the screen unchanged, a real Export to PDF
const sw = await s.ev(`const r = __row(['Print & PDF'], 'Black and white when printing'); r.scrollIntoView({ block: 'center' }); return !!r.querySelector('.checkbox-container')`)
check('Print & PDF group has the switch', sw)
// colorful settings, so the PDF shows whether StyleMate reaches it and whether black and white wins over them
await s.ev(`__color(['Headings', 'H1'], 'Color', '#ff0000'); __color(['Text & links', 'Links'], 'Note link', '#00aa00'); __color(['Quotes & rules', 'Callouts'], 'Background', '#2244ff'); return 1`)
const pdf = async name => {
  const file = `${SHOTS}/${name}.pdf`; rmSync(file, { force: true })
  await call('Page.bringToFront')
  // test stubs: the save dialog answers with our path; the saved PDF is not opened in the system viewer
  await ev(`document.querySelectorAll('.modal-container').forEach(m => m.remove()); app.workspace.setActiveLeaf(app.workspace.getLeavesOfType('markdown')[0], { focus: true })
    const el = window.electron, r = el.remote
    const d = r.dialog; d.__orig ??= d.showSaveDialog; d.showSaveDialog = async () => ({ canceled: false, filePath: ${JSON.stringify(file)} })
    const ipc = el.ipcRenderer; ipc.__send ??= ipc.send; ipc.send = (ch, ...a) => ipc.__send.call(ipc, ch, ...(ch === 'print-to-pdf' ? [{ ...a[0], open: false }] : a))
    app.commands.executeCommandById('workspace:export-pdf'); await new Promise(r => setTimeout(r, 800))
    setTimeout(() => document.querySelector('.modal .mod-cta').click(), 50); return 1`)
  for (let i = 0; i < 60 && !existsSync(file); i++) await sleep(500)
  await sleep(1000)
  execFileSync('pdftoppm', ['-png', '-r', '60', '-f', '1', '-l', '2', file, `${SHOTS}/${name}`])
  // most colorful pixel on the first two pages: max(r,g,b) - min(r,g,b)
  return Number(execFileSync('python3', ['-c', `import glob;from PIL import Image
m=0
for f in glob.glob(${JSON.stringify(`${SHOTS}/${name}-*.png`)}):
  for p in Image.open(f).convert('RGB').get_flattened_data(): m=max(m,max(p)-min(p))
print(m)`]).toString())
}
const colorful = await pdf('m15-color')
check('PDF export carries StyleMate colors (switch off)', colorful > 100, `max color spread ${colorful}`)
const screenBefore = await ev(`return [...document.querySelectorAll('.markdown-preview-view, .markdown-preview-view *')].slice(0, 400).map(e => getComputedStyle(e).color + getComputedStyle(e).backgroundColor).join()`)
await s.ev(`__row(['Print & PDF'], 'Black and white when printing').querySelector('.checkbox-container').click(); return 1`); await sleep(400)
check('switch stores yes', await ev(`return app.plugins.plugins.stylemate.settings.values['print-bw']`) === 'yes')
const screenAfter = await ev(`return [...document.querySelectorAll('.markdown-preview-view, .markdown-preview-view *')].slice(0, 400).map(e => getComputedStyle(e).color + getComputedStyle(e).backgroundColor).join()`)
check('screen does not change', screenBefore === screenAfter && screenBefore.length > 100)
const gray = await pdf('m15-bw')
check('PDF export is black and white (switch on)', gray < 12, `max color spread ${gray}`)
check('print rules only inside @media print', await ev(`const c = app.plugins.plugins.stylemate.css; return c.includes('@media print{html body .print') && !/^html body .print/m.test(c)`))
await ev(`const d = window.electron.remote.dialog; d.showSaveDialog = d.__orig; const ipc = window.electron.ipcRenderer; ipc.send = ipc.__send; const p = app.plugins.plugins.stylemate; p.settings.values = {}; p.apply(); return 1`)
await shot('m15-notes')
done()
