// M11 live checks only (no experimental tags left, Text size leaves headings alone). `npm run build` first, then `node test/obsidian/m11.mjs`.
import { call, check, done, ev, openSettings, sleep } from './drive.mjs'

await ev(`const p = app.plugins.plugins.stylemate; p.saveData = async () => {}; p.settings.values = {}; p.settings.enabled = true; p.apply()
  const f = app.vault.getAbstractFileByPath('StyleMate Preview.md'); for (const l of app.workspace.getLeavesOfType('markdown')) l.detach()
  if (f) await app.vault.delete(f); return 1`)
await call('Page.bringToFront')
console.log('StyleMate', await ev(`return app.plugins.plugins.stylemate.manifest.version`))
const retry = async f => { for (let i = 0; ; i++) try { return await f() } catch (e) { if (i > 4) throw e; await sleep(400) } }
const view = mode => `app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === '${mode}').view.containerEl`
const reading = js => retry(() => ev(`const el = ${view('preview')}.querySelector('.markdown-reading-view'); ${js}`))
const live = js => retry(() => ev(`const el = ${view('source')}.querySelector('.markdown-source-view'); ${js}`))
await ev(`await app.commands.executeCommandById('stylemate:open-preview'); await new Promise(r => setTimeout(r, 1500)); return 1`)

const s = await openSettings()
await s.ev(`document.querySelectorAll('.customizer details').forEach(d => d.open = true); return 1`); await sleep(300)
check('no experimental tag in Preferences', await s.ev(`return document.querySelectorAll('.customizer-exp').length`) === 0)

const sizes = async () => [
  await reading(`const h = el.querySelector('h2'), p = el.querySelector('p'); return [parseFloat(getComputedStyle(h).fontSize), parseFloat(getComputedStyle(p).fontSize)]`),
  await live(`const h = el.querySelector('.HyperMD-header-2'), p = el.querySelector('.cm-line:not([class*=HyperMD-header])'); return [parseFloat(getComputedStyle(h).fontSize), parseFloat(getComputedStyle(p).fontSize)]`)]
const before = await sizes()
await ev(`const p = app.plugins.plugins.stylemate; p.settings.values['font-size'] = 24; p.apply(); await new Promise(r => setTimeout(r, 400)); return 1`)
const after = await sizes()
console.log(JSON.stringify(before), JSON.stringify(after))
for (const [i, v] of ['Reading view', 'Live Preview'].entries()) {
  check(`${v}: Text size 24 makes body text bigger`, after[i][1] > before[i][1], `${before[i][1]} -> ${after[i][1]}`)
  check(`${v}: H2 stays the same size`, Math.abs(after[i][0] - before[i][0]) < 0.5, `${before[i][0]} -> ${after[i][0]}`)
}
await ev(`const p = app.plugins.plugins.stylemate; p.settings.values = {}; p.apply(); return 1`)
done()
