// M13 live checks: callout colors (Live Preview and Reading view), Tab from number box to number box. `npm run build` first, then `node test/obsidian/m13.mjs`.
import { call, check, done, ev, openSettings, sleep } from './drive.mjs'

await ev(`const p = app.plugins.plugins.stylemate; p.saveData = async () => {}; p.settings.values = {}; p.settings.enabled = true; p.settings.bothThemes = false; p.apply()
  const f = app.vault.getAbstractFileByPath('StyleMate Preview.md'); for (const l of app.workspace.getLeavesOfType('markdown')) l.detach()
  if (f) await app.vault.delete(f); return 1`)
await call('Page.bringToFront')
console.log('StyleMate', await ev(`return app.plugins.plugins.stylemate.manifest.version`))
const retry = async f => { for (let i = 0; ; i++) try { return await f() } catch (e) { if (i > 4) throw e; await sleep(400) } }
const view = mode => `app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === '${mode}').view.containerEl`
const reading = js => retry(() => ev(`const el = ${view('preview')}.querySelector('.markdown-preview-view'); ${js}`))
const live = js => retry(() => ev(`const el = ${view('source')}.querySelector('.markdown-source-view'); ${js}`))
await ev(`await app.commands.executeCommandById('stylemate:open-preview'); await new Promise(r => setTimeout(r, 1500)); return 1`)
const s = await openSettings()

// --- callout rows
const path = ['Quotes & rules', 'Callouts']
const names = await s.ev(`const r = [...__row(${JSON.stringify(path)}, 'Background').parentElement.querySelectorAll(':scope > .setting-item .setting-item-name')]; return r.map(x => x.textContent)`)
check('Callouts box has four rows', names.length === 4 && names[0].startsWith('Background') && names[1].startsWith('Title') && names[2].startsWith('Icon') && names[3].startsWith('Text'), names.join(' | '))
const theme = await ev(`return document.body.classList.contains('theme-dark') ? 'dark' : 'light'`)
// Swatches start at what the theme draws: with nothing set, each setting's current value matches the callout on screen.
await ev(`const l = app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === 'source'); const sc = l.view.containerEl.querySelector('.cm-scroller'); sc.scrollTop = sc.scrollHeight; return 1`); await sleep(800)
const rows = await live(`const c = el.querySelector('.callout'), cs = e => getComputedStyle(e)
  return { title: cs(c.querySelector('.callout-title-inner')).color, icon: cs(c.querySelector('.callout-icon svg')).color, text: cs(c.querySelector('.callout-content')).color }`)
const cur = await s.ev(`const g = l => [...document.querySelectorAll('.customizer .setting-item')].find(r => r.querySelector('.setting-item-name')?.textContent.startsWith(l)); return ['Title color','Icon color','Text color'].map(l => getComputedStyle(g(l).querySelector('.cz-swatch')).backgroundColor)`)
const asRgb = c => c.replace(/rgba?\(|\)/g, '').split(',').slice(0, 3).map(x => +x.trim()).join(',')
check('swatches start at the theme colors (title, icon, text)', [rows.title, rows.icon, rows.text].every((c, i) => asRgb(c) === asRgb(cur[i])), `${asRgb(rows.title)} ${asRgb(rows.icon)} ${asRgb(rows.text)} vs ${cur.map(asRgb).join(' ')}`)
const COLORS = { Background: '#223344', 'Title color': '#ff0066', 'Icon color': '#ffaa00', 'Text color': '#00cc88' }
for (const [label, hex] of Object.entries(COLORS)) await s.ev(`__color(${JSON.stringify(path)}, ${JSON.stringify(label)}, '${hex}'); return 1`)
await sleep(500)
const rgb = h => `rgb(${[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ')})`
const probe = `const c = el.querySelector('.callout'); const t = c.querySelector('.callout-title'), i = c.querySelector('.callout-icon svg'), b = c.querySelector('.callout-content')
  return [getComputedStyle(c).backgroundColor, getComputedStyle(t).color, getComputedStyle(i).color, getComputedStyle(b).color]`
for (const [name, run] of [['Reading view', reading], ['Live Preview', live]]) {
  // Reading view draws only what is on screen: scroll the callout in first
  await ev(`const l = app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === '${name === 'Reading view' ? 'preview' : 'source'}'); const sc = l.view.containerEl.querySelector('${name === 'Reading view' ? '.markdown-preview-view' : '.cm-scroller'}'); sc.scrollTop = sc.scrollHeight; return 1`); await sleep(800)
  const [bg, title, icon, text] = await run(probe)
  check(`${name}: callout background`, bg === rgb(COLORS.Background), bg)
  check(`${name}: callout title color`, title === rgb(COLORS['Title color']), title)
  check(`${name}: callout icon color`, icon === rgb(COLORS['Icon color']), icon)
  check(`${name}: callout text color`, text === rgb(COLORS['Text color']), text)
}
await s.ev(`__row(${JSON.stringify(path)}, 'Background').scrollIntoView({ block: 'center' }); return 1`); await sleep(300)
await s.shot('m13-callout-settings')
await call('Page.bringToFront'); await sleep(500)
await (await import('./drive.mjs')).shot('m13-callout-notes')
// reset arrow brings each back
for (const label of Object.keys(COLORS)) await s.ev(`__reset(${JSON.stringify(path)}, ${JSON.stringify(label)}); return 1`)
await sleep(300)
check('reset clears all four callout settings', await ev(`const v = app.plugins.plugins.stylemate.settings.values; return Object.keys(v).filter(k => k.startsWith('callout')).length`) === 0)

// --- Tab order: a real Tab key press, from one number box to the next
const key = (type, k, code, vk) => s.call('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk })
await s.call('Page.bringToFront')
await s.ev(`document.querySelectorAll('.customizer details').forEach(d => d.open = false); const d = [...document.querySelectorAll('.customizer details.cz-main')].find(x => x.textContent.startsWith('Page')); d.open = true; return 1`); await sleep(300)
const boxLabel = () => s.ev(`const e = document.activeElement; return e?.getAttribute('aria-label') ?? (e?.tagName + ' ' + e?.className + ' ' + (e?.querySelector?.('.setting-item-name')?.textContent || '') + ' tabindex=' + e?.getAttribute('tabindex'))`)
await s.ev(`document.querySelector('.customizer input.cz-num').focus(); return 1`)
const seen = [await boxLabel()]
for (let i = 0; i < 3; i++) { await key('keyDown', 'Tab', 'Tab', 9); await key('keyUp', 'Tab', 'Tab', 9); await sleep(150); seen.push(await boxLabel()) }
console.log(seen.join('  >  '))
check('Tab goes box to box on the Page rows', seen.slice(0, 4).every(x => /value$/.test(x)) && new Set(seen).size === 4, seen.join(' > '))
await s.ev(`const e = document.activeElement; e.blur(); return 1`)
await s.shot('m13-tab')
await ev(`const p = app.plugins.plugins.stylemate; p.settings.values = {}; p.apply(); return 1`)
done()
