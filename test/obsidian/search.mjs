// 1.0.1 publishing: StyleMate's settings show up in Obsidian's settings search (declarative render rows, group aliases).
// `npm run build` first, then `node test/obsidian/search.mjs`.
import { check, done, ev, openSettings, sleep } from './drive.mjs'

console.log('StyleMate', await ev(`return app.plugins.plugins.stylemate.manifest.version`))
const s = await openSettings()
check('every main group is drawn', await s.ev(`return [...document.querySelectorAll('.customizer details.cz-main > summary')].map(x => x.textContent).join('|')`) === 'Page|Text & links|Headings|Lists|Quotes & rules|Editor|Print & PDF')
const search = async q => {
  await s.ev(`const i = document.querySelector('.vertical-tab-header input[type=search], .vertical-tab-header input'); i.focus(); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1`)
  await sleep(600)
  return s.ev(`return document.querySelector('.vertical-tab-header').innerText`)
}
for (const [q, want] of [['Open sample note', 'Live sample note'], ['Line height', 'Headings'], ['Callouts', 'Quotes & rules'], ['Preset', 'Presets']]) {
  const out = await search(q)
  check(`search "${q}" finds StyleMate's ${want}`, out.includes('StyleMate') && out.includes(want), out.slice(0, 160).replace(/\n/g, ' | '))
}
await s.shot('search')
await s.ev(`const i = document.querySelector('.vertical-tab-header input'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); return 1`)
// Presets: Load refreshes the rows on the page (no full redraw any more)
await ev(`const p = app.plugins.plugins.stylemate; p.saveData = async () => {}; p.settings.values = {}; p.apply(); return 1`)
await s.ev(`const r = __row(['Headings', 'H1'], 'Size'), b = r.querySelector('input.cz-num'); b.value = '3'; b.dispatchEvent(new Event('change')); return 1`); await sleep(200)
await s.ev(`const r = [...document.querySelectorAll('.customizer .cz-host > .setting-item')].find(x => x.textContent.startsWith('Save current')), t = r.querySelector('input'); t.value = 'Big'; t.dispatchEvent(new Event('input', { bubbles: true })); r.querySelector('button').click(); return 1`); await sleep(300)
await s.ev(`const r = __row(['Headings', 'H1'], 'Size'), b = r.querySelector('input.cz-num'); b.value = '1'; b.dispatchEvent(new Event('change')); return 1`); await sleep(200)
await s.ev(`const r = [...document.querySelectorAll('.customizer .cz-host > .setting-item')].find(x => x.textContent.startsWith('Presets')); r.querySelector('select').dispatchEvent(new Event('change')); [...r.querySelectorAll('button')].find(b => b.textContent === 'Load').click(); return 1`); await sleep(400)
check('Load preset updates the row on the page', await s.ev(`return __row(['Headings', 'H1'], 'Size').querySelector('input.cz-num').value`) === '3')
check('the preset dropdown still lists it', await s.ev(`return [...[...document.querySelectorAll('.customizer .cz-host > .setting-item')].find(x => x.textContent.startsWith('Presets')).querySelector('select').options].map(o => o.value).join()`) === 'Big')
await ev(`const p = app.plugins.plugins.stylemate; p.settings.presets = {}; p.settings.values = {}; p.apply(); return 1`)
done()
