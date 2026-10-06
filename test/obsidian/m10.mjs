// M10 live checks only (experimental tags removed, six-level box resets, bold/italic follow Text color, links to another note, visited removed).
// `npm run build` first, then `node test/obsidian/m10.mjs`.
import { call, check, done, ev, openSettings, shot, sleep } from './drive.mjs'

await ev(`const p = app.plugins.plugins.stylemate; p.saveData = async () => {}; p.settings.values = {}; p.settings.enabled = true; p.apply()
  const f = app.vault.getAbstractFileByPath('StyleMate Preview.md'); for (const l of app.workspace.getLeavesOfType('markdown')) l.detach()
  if (f) await app.vault.delete(f); return 1`) // the sample note is recreated with this build's text
await call('Page.bringToFront')
console.log('StyleMate', await ev(`return app.plugins.plugins.stylemate.manifest.version`))
const J = JSON.stringify
const retry = async f => { for (let i = 0; ; i++) try { return await f() } catch (e) { if (i > 4) throw e; await sleep(400) } }
const view = mode => `app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === '${mode}').view.containerEl`
const reading = js => retry(() => ev(`const el = ${view('preview')}.querySelector('.markdown-reading-view'); ${js}`))
const live = js => retry(() => ev(`const el = ${view('source')}.querySelector('.markdown-source-view'); ${js}`))
const goto = heading => ev(`const ls = app.workspace.getLeavesOfType('markdown'), line = ls[0].view.data.split('\\n').findIndex(l => l.startsWith(${J(heading)}))
  for (const l of ls) { if (l.view.getMode() === 'preview') l.view.previewMode.applyScroll(line); else l.view.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line: line + 12, ch: 0 } }, true) }
  await new Promise(r => setTimeout(r, 600)); return line`)
const mouse = async ([x, y]) => { await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await sleep(250) }
const away = () => mouse([5, 600])
const center = (scope, q) => scope(`const e = ${q}; e.scrollIntoView({ block: 'center' }); const r = e.getClientRects()[0]; return [r.x + r.width / 2, r.y + r.height / 2]`)
await ev(`await app.commands.executeCommandById('stylemate:open-preview'); await new Promise(r => setTimeout(r, 1500)); return 1`)

const s = await openSettings()
await s.ev(`document.querySelectorAll('.customizer details').forEach(d => d.open = true); return 1`); await sleep(300)
const desc = (path, label) => s.ev(`return __row(${J(path)}, ${J(label)}).querySelector('.setting-item-description').textContent`)
const exp = (path, label) => s.ev(`return !!__row(${J(path)}, ${J(label)}).querySelector('.customizer-exp')`)
const values = () => ev(`return app.plugins.plugins.stylemate.settings.values`)

// experimental tags
const TYPES = [['Bullet lists', 'Bullet'], ['Numbered lists', 'Number'], ['Checkbox lists', 'Box']]
const plain = [[['Text & links'], 'Text color'], [['Lists', 'Bullet lists'], 'Bullet color'], [['Lists', 'Numbered lists'], 'Number color']]
for (const [t, g] of TYPES) {
  plain.push([['Lists', t], `${g} to text gap`])
  for (const box of ['Indent steps', 'Space above', 'Space below']) for (let k = 1; k <= 6; k++) plain.push([['Lists', t, box], box === 'Indent steps' ? `Level ${k} step` : `Level ${k}`])
}
const tagged = []; for (const [p, l] of plain) if (await exp(p, l)) tagged.push(`${p.at(-1)} > ${l}`)
check(`no experimental tag on the ${plain.length} checked rows`, !tagged.length, tagged.join(', '))
check('Link to another note keeps its experimental tag', await exp(['Text & links', 'Links'], 'Link to another note'))

// box resets: set two levels in each box, press its Reset, values and CSS gone
for (const [t] of TYPES) for (const box of ['Indent steps', 'Space above', 'Space below']) {
  const P = J(['Lists', t, box])
  const lab = box === 'Indent steps' ? 'Level 2 step' : 'Level 2', lab5 = box === 'Indent steps' ? 'Level 5 step' : 'Level 5'
  await s.ev(`__slider(${P}, ${J(lab)}, 1); __slider(${P}, ${J(lab5)}, 1); return 1`)
  const before = Object.keys(await values()).length
  const btn = await s.ev(`let box = document.querySelector('.customizer'), first = true; for (const p of ${P}) { box = [...box.querySelectorAll(first ? 'details.cz-main' : ':scope > details')].find(x => x.querySelector(':scope > summary').textContent === p); first = false }
    const b = [...box.querySelectorAll(':scope > .setting-item button')].find(b => b.textContent.startsWith('Reset')); b?.click(); return b?.textContent ?? ''`)
  const after = await values(), changed = await s.ev(`return __row(${P}, ${J(lab)}).classList.contains('customizer-changed')`)
  check(`${t} > ${box}: "${btn}" clears its six levels`, before === 2 && !Object.keys(after).length && !changed, `${before} -> ${J(after)}`)
}
check('Reset clears the CSS', await ev(`return app.plugins.plugins.stylemate.css`) === '')

// bold and italic follow Text color
const T = ['Text & links']
const swatch = label => s.ev(`return getComputedStyle(__row(${J(T)}, ${J(label)}).querySelector('.cz-swatch')).backgroundColor`)
const bold = async () => [await live(`return getComputedStyle(el.querySelector('.cm-strong')).color`), await reading(`return getComputedStyle(el.querySelector('strong')).color`)]
await goto('## Text')
await s.ev(`__color(${J(T)}, 'Text color', '#ff0000'); return 1`); await sleep(300)
check('Text color red: bold shows red in both views', J(await bold()) === J(['rgb(255, 0, 0)', 'rgb(255, 0, 0)']), J(await bold()))
check('Bold color swatch shows the red it inherits', await swatch('Bold color') === 'rgb(255, 0, 0)', await swatch('Bold color'))
check('Italic color swatch shows it too', await swatch('Italic color') === 'rgb(255, 0, 0)', await swatch('Italic color'))
check('Bold description says it follows Text color', /Follows Text color \(#ff0000\)/i.test(await desc(T, 'Bold color')), await desc(T, 'Bold color'))
await s.ev(`__color(${J(T)}, 'Bold color', '#00ff00'); return 1`); await sleep(300)
check('Bold color green wins over Text color in both views', J(await bold()) === J(['rgb(0, 255, 0)', 'rgb(0, 255, 0)']), J(await bold()))
await shot('m10-01-bold')
await s.ev(`__reset(${J(T)}, 'Bold color'); return 1`); await sleep(300)
check('Bold reset: back to following (red)', J(await bold()) === J(['rgb(255, 0, 0)', 'rgb(255, 0, 0)']) && await swatch('Bold color') === 'rgb(255, 0, 0)')
await s.ev(`__reset(${J(T)}, 'Text color'); return 1`); await sleep(300)
check('Text color reset: Bold swatch follows back to the theme color', await swatch('Bold color') === await swatch('Text color'), await swatch('Bold color'))

// links: rows, same-note vs other-note colors, hover with a real mouse
const L = ['Text & links', 'Links']
const names = await s.ev(`let box = document.querySelector('.customizer'), first = true; for (const p of ${J(L)}) { box = [...box.querySelectorAll(first ? 'details.cz-main' : ':scope > details')].find(x => x.querySelector(':scope > summary').textContent === p); first = false }
  return [...box.querySelectorAll(':scope > .setting-item')].map(r => r.querySelector('.setting-item-name').textContent.replace('experimental', '').trim()).join('|')`)
check('Links box: visited rows gone, other-note rows added', names === 'Note link|Note link, hover|Link to another note|Link to another note, hover|Web link|Web link, hover', names)
check('Link to another note follows Note link', /Follows Note link \(#[0-9a-f]{6}\)/.test(await desc(L, 'Link to another note')), await desc(L, 'Link to another note'))
await s.ev(`__color(${J(L)}, 'Note link', '#0000ff'); __color(${J(L)}, 'Link to another note', '#ff0000'); __color(${J(L)}, 'Link to another note, hover', '#00ff00'); return 1`); await sleep(300)
await goto('## Links and tags'); await away()
const lp = t => `[...el.querySelectorAll('.cm-underline')].find(e => e.textContent === ${J(t)})`, rd = t => `[...el.querySelectorAll('a')].find(e => e.textContent === ${J(t)})`
const color = (scope, q) => scope(`return getComputedStyle(${q}).color`)
for (const [t, want] of [['a heading', 'rgb(0, 0, 255)'], ['this sample note by name', 'rgb(255, 0, 0)'], ['a Markdown one', 'rgb(255, 0, 0)'], ['A note that does not exist yet', 'rgb(255, 0, 0)']]) {
  check(`Live Preview: "${t}"`, await color(live, lp(t)) === want, await color(live, lp(t)))
  check(`Reading view: "${t}"`, await color(reading, rd(t)) === want, await color(reading, rd(t)))
}
await shot('m10-02-links')
await mouse(await center(live, lp('this sample note by name')))
check('Live Preview: other-note link hover (real mouse)', await color(live, lp('this sample note by name')) === 'rgb(0, 255, 0)', await color(live, lp('this sample note by name')))
await mouse(await center(reading, rd('a Markdown one')))
check('Reading view: other-note link hover (real mouse)', await color(reading, rd('a Markdown one')) === 'rgb(0, 255, 0)', await color(reading, rd('a Markdown one')))
await mouse(await center(reading, rd('a heading')))
check('Reading view: same-note link hover is not the other-note hover', await color(reading, rd('a heading')) !== 'rgb(0, 255, 0)', await color(reading, rd('a heading')))
await away()
check('no visited marking left', await ev(`return !document.querySelectorAll('.cz-vi').length && !('visited' in app.plugins.plugins.stylemate.settings)`))

await s.ev(`__row(${J(L)}, 'Note link').scrollIntoView({ block: 'start' }); return 1`); await sleep(200); await s.shot('m10-03-links-settings')
await s.ev(`__row(['Lists', 'Bullet lists', 'Space above'], 'Level 1').scrollIntoView({ block: 'start' }); return 1`); await sleep(200); await s.shot('m10-04-list-boxes')
await ev(`const p = app.plugins.plugins.stylemate; p.settings.values = {}; p.apply(); return 1`)
done()
