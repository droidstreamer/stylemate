// Focused check: "Text color (reading and editing notes)" in Live Preview and Reading view, and that chrome is untouched.
import { check, done, ev, openSettings, shot, sleep } from './drive.mjs'
await ev(`const p = app.plugins.plugins.stylemate; p.saveData = async () => {}; p.settings.values = {}; p.apply(); await app.commands.executeCommandById('stylemate:open-preview'); await new Promise(r => setTimeout(r, 1200)); return 1`)
const s = await openSettings()
const view = (mode, js) => ev(`const el = app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === '${mode}').view.containerEl; ${js}`)
const probe = async mode => view(mode, `const q = ${mode === 'source'} ? ['.cm-line:not(.HyperMD-header):not(.HyperMD-list-line)', '.HyperMD-list-line', '.cm-strong', '.cm-em'] : ['p', 'li', 'strong', 'em']
  return q.map(x => { const e = el.querySelector(x); return x + '=' + (e ? getComputedStyle(e).color : 'missing') }).join(' | ')`)
const chrome = () => ev(`return ['.nav-file-title', '.workspace-tab-header-inner-title', '.status-bar-item', '.view-header-title'].map(x => getComputedStyle(document.querySelector(x)).color).join()`)
const before = { c: await chrome(), e: await probe('source'), r: await probe('preview') }
console.log('before  editing:', before.e, '\nbefore  reading:', before.r)
await s.ev(`__color(['Text & links'], 'Text color (reading', '#00ffff'); return 1`); await sleep(400)
const after = { c: await chrome(), e: await probe('source'), r: await probe('preview') }
console.log('after   editing:', after.e, '\nafter   reading:', after.r)
const cyan = 'rgb(0, 255, 255)'
check('editing: normal lines are cyan', after.e.includes(`.cm-line:not(.HyperMD-header):not(.HyperMD-list-line)=${cyan}`))
check('editing: list lines are cyan', after.e.includes(`.HyperMD-list-line=${cyan}`))
check('reading: paragraphs and list items are cyan', after.r.includes(`p=${cyan}`) && after.r.includes(`li=${cyan}`))
check('menus, tabs, status bar unchanged', after.c === before.c, `${before.c} -> ${after.c}`)
await shot('10-textcolor-notes'); await s.shot('10-textcolor-settings')
await s.ev(`__reset(['Text & links'], 'Text color (reading'); return 1`); await sleep(300)
check('reset restores both views', (await probe('source')) === before.e && (await probe('preview')) === before.r)
done()
