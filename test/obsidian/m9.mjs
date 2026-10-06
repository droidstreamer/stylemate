// M9 live checks only (link/tag removals, visited note links, palette reset, guide swatches, bullet hover/folded, per-level spacing).
// `npm run build` first, then `node test/obsidian/m9.mjs`.
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
const center = (scope, q) => scope(`const e = ${q}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`)
await ev(`await app.commands.executeCommandById('stylemate:open-preview'); await new Promise(r => setTimeout(r, 1500)); return 1`)

const s = await openSettings()
await s.ev(`document.querySelectorAll('.customizer details').forEach(d => d.open = true); return 1`); await sleep(300)
const desc = (path, label) => s.ev(`return __row(${J(path)}, ${J(label)}).querySelector('.setting-item-description').textContent`)
const names = path => s.ev(`let box = document.querySelector('.customizer'), first = true; for (const p of ${J(path)}) { box = [...box.querySelectorAll(first ? 'details.cz-main' : ':scope > details')].find(x => x.querySelector(':scope > summary').textContent === p); first = false }
  return [...box.querySelectorAll(':scope > .setting-item')].map(r => r.querySelector('.setting-item-name').textContent.replace('experimental', '').trim()).join('|')`)

// removals
check('Links box: no web link visited rows', await names(['Text & links', 'Links']) === 'Note link|Note link, hover|Note link, visited|Note link, visited, hover|Web link|Web link, hover|Forget visited links', await names(['Text & links', 'Links']))
check('Tags box: no hover rows', await names(['Text & links', 'Tags']) === 'Tag text|Tag background', await names(['Text & links', 'Tags']))
check('Forget says notes only', !/web/i.test(await desc(['Text & links', 'Links'], 'Forget')))

// visited note links: wiki link and Markdown link, both views, hover
const TL = ['Text & links', 'Links']
await s.ev(`__color(${J(TL)}, 'Note link, visited', '#ff0000'); __color(${J(TL)}, 'Note link, visited, hover', '#00ff00'); __color(${J(TL)}, 'Web link, hover', '#0000ff'); return 1`); await sleep(300)
await goto('## Links and tags'); await away()
const lpLink = text => `[...el.querySelectorAll('.cm-underline')].find(e => e.textContent === ${J(text)})`
check('Live Preview: visited wiki link takes the visited color', await live(`return getComputedStyle(${lpLink('this note')}).color`) === 'rgb(255, 0, 0)')
check('Live Preview: visited Markdown link [text](note.md) takes the visited color', await live(`return getComputedStyle(${lpLink('a Markdown link to it')}).color`) === 'rgb(255, 0, 0)')
check('Live Preview: unvisited link keeps the link color', await live(`return getComputedStyle(${lpLink('A note you have not opened')}).color`) !== 'rgb(255, 0, 0)')
await mouse(await center(live, lpLink('this note')))
check('Live Preview: visited link, hover (real mouse)', await live(`return getComputedStyle(${lpLink('this note')}).color`) === 'rgb(0, 255, 0)')
await mouse(await center(live, lpLink('Obsidian')))
check('Live Preview: web link, hover (real mouse)', await live(`return getComputedStyle(${lpLink('Obsidian')}).color`) === 'rgb(0, 0, 255)')
await away()
const rdLink = text => `[...el.querySelectorAll('a')].find(e => e.textContent === ${J(text)})`
check('Reading view: visited Markdown link takes the visited color', await reading(`return getComputedStyle(${rdLink('a Markdown link to it')}).color`) === 'rgb(255, 0, 0)')
await mouse(await center(reading, rdLink('Obsidian')))
check('Reading view: web link, hover (real mouse)', await reading(`return getComputedStyle(${rdLink('Obsidian')}).color`) === 'rgb(0, 0, 255)')
await away(); await shot('m9-01-links')

// palette: reset returns to the palette color; Apply palette undoes hand changes
const PAL = ['Headings', 'Auto palette (all headings, H1-H6)'], H3 = ['Headings', 'H3']
const theme = await ev(`return document.body.classList.contains('theme-dark') ? 'dark' : 'light'`)
const val = k => ev(`return app.plugins.plugins.stylemate.settings.values[${J(k)}]`)
await s.ev(`__color(${J(PAL)}, 'Start color', '#cc0000'); __color(${J(PAL)}, 'End color', '#0000cc'); return 1`); await sleep(300)
const pal3 = (await val(`palette@${theme}`))?.split(',')[2]
check('palette colors are stored', !!pal3 && await val(`h3-color@${theme}`) === pal3, pal3)
await s.ev(`__color(${J(H3)}, 'Color', '#00ff00'); return 1`); await sleep(200)
await s.ev(`__reset(${J(H3)}, 'Color'); return 1`); await sleep(200)
check('H3 color reset goes back to the palette color, not the original', await val(`h3-color@${theme}`) === pal3, await val(`h3-color@${theme}`))
await s.ev(`__color(${J(H3)}, 'Color', '#00ff00'); return 1`); await sleep(200)
await s.ev(`[...__row(${J(PAL)}, 'Apply to all headings').querySelectorAll('button')].find(b => b.textContent === 'Apply palette').click(); return 1`); await sleep(200)
check('Apply palette puts the palette back on every heading', await val(`h3-color@${theme}`) === pal3)
await goto('### Heading 3')
check('Reading view H3 shows the palette color', await reading(`return getComputedStyle(el.querySelector('h3')).color`) === await ev(`const e = document.body.createEl('span'); e.style.color = ${J(pal3)}; const c = getComputedStyle(e).color; e.remove(); return c`))
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset Headings').click(); return 1`); await sleep(200)
check('Reset Headings clears the palette too', await val(`palette@${theme}`) === undefined && await val(`h3-color@${theme}`) === undefined)
await s.ev(`__row(${J(PAL)}, 'Start color').scrollIntoView({ block: 'start' }); return 1`); await sleep(200); await s.shot('m9-02-palette')

// guide line swatches show the see-through color as it looks, not black
const sw = label => s.ev(`return getComputedStyle(__row(['Lists', 'All lists'], ${J(label)}).querySelector('.cz-swatch')).backgroundColor`)
const raw = await ev(`return getComputedStyle(document.body).getPropertyValue('--indentation-guide-color').trim()`)
check('guide color swatch is not solid black/white', !['rgb(0, 0, 0)', 'rgb(255, 255, 255)'].includes(await sw('Color')), `${raw} -> ${await sw('Color')}`)
check('active guide color swatch is not solid black/white', !['rgb(0, 0, 0)', 'rgb(255, 255, 255)'].includes(await sw('Color, list you are in')), await sw('Color, list you are in'))
check('Lists colors still read as unchanged', !(await s.ev(`return __row(['Lists', 'All lists'], 'Color').classList.contains('customizer-changed')`)))

// bullet hover and folded with a bullet color set
const BUL = ['Lists', 'Bullet lists']
await s.ev(`__color(${J(BUL)}, 'Bullet color', '#ff00ff'); __color(${J(BUL)}, 'On hover', '#00ffff'); __color(${J(BUL)}, 'When folded', '#ffaa00'); return 1`); await sleep(300)
await goto('## Bullet list'); await away()
const bul = (scope, t = 'Level 1 again') => scope(`return getComputedStyle([...el.querySelectorAll('li, .cm-line')].find(l => l.textContent.includes(${J(t)})).querySelector('.list-bullet'), '::after').backgroundColor`)
check('bullet color applies (reading, Live Preview)', await bul(reading) === 'rgb(255, 0, 255)' && await bul(live) === 'rgb(255, 0, 255)')
await mouse(await center(reading, `[...el.querySelectorAll('li > p, li')].find(l => l.textContent.includes('Level 1 again'))`))
check('On hover: real mouse on the item (reading)', await bul(reading) === 'rgb(0, 255, 255)', await bul(reading))
await mouse(await center(live, `[...el.querySelectorAll('.cm-line')].find(l => l.textContent.includes('Level 1 again'))`))
check('On hover: real mouse on the item (Live Preview)', await bul(live) === 'rgb(0, 255, 255)', await bul(live))
await away()
// fold "Level 1 item" in both views with a real click on its fold arrow
const foldRd = `[...el.querySelectorAll('li')].find(l => l.firstChild && l.textContent.trim().startsWith('Level 1 item')).querySelector('.list-collapse-indicator')`
const folded = () => reading(`return [...el.querySelectorAll('li')].find(l => l.firstChild && l.textContent.trim().startsWith('Level 1 item')).classList.contains('is-collapsed')`)
for (let i = 0; i < 2 && !(await folded()); i++) { // the fold state can outlive a run
  await mouse(await center(reading, foldRd)); const fr = await center(reading, foldRd)
  for (const type of ['mousePressed', 'mouseReleased']) await call('Input.dispatchMouseEvent', { type, x: fr[0], y: fr[1], button: 'left', clickCount: 1 })
  await sleep(300)
}
await away(); await sleep(400) // bullets fade between colors
check('folding works in Reading view (children hidden)', await reading(`return [...el.querySelectorAll('li')].find(l => l.firstChild && l.textContent.trim().startsWith('Level 1 item')).classList.contains('is-collapsed')`))
check('When folded color (reading)', await bul(reading, 'Level 1 item') === 'rgb(255, 170, 0)', await bul(reading, 'Level 1 item') + ' ' + await reading(`return [...el.querySelectorAll('li')].filter(l => l.textContent.includes('Level 1 item')).map(l => l.className).join()`))
await ev(`const l = app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === 'source'); app.workspace.setActiveLeaf(l, { focus: true }); const line = l.view.data.split('\\n').findIndex(x => x.startsWith('- Level 1 item')); l.view.editor.setCursor({ line, ch: 5 })
  if (![...l.view.containerEl.querySelectorAll('.cm-line')].some(x => x.textContent.includes('Level 1 item…'))) app.commands.executeCommandById('editor:toggle-fold'); l.view.editor.setCursor({ line: line - 1, ch: 0 }); await new Promise(r => setTimeout(r, 400)); return 1`)
await goto('## Bullet list')
await sleep(400)
check('folding works in Live Preview (Level 2 hidden)', await live(`const t = [...el.querySelectorAll('.cm-line')].map(l => l.textContent); return t.some(x => x.includes('Level 1 again')) && !t.some(x => x.includes('Level 2 item'))`))
check('When folded color (Live Preview)', await live(`return getComputedStyle([...el.querySelectorAll('.cm-line')].find(l => l.textContent.includes('Level 1 item')).querySelector('.list-bullet'), '::after').backgroundColor`) === 'rgb(255, 170, 0)')
await shot('m9-03-folded')
await ev(`app.commands.executeCommandById('editor:unfold-all'); return 1`)
await reading(`${foldRd}.click(); return 1`); await sleep(300)

// per-level space above / below
const NUM = ['Lists', 'Numbered lists']
check('Numbered lists has Space above and Space below boxes, levels 1-6', await names([...NUM, 'Space above']) === 'Level 1 (em)|Level 2 (em)|Level 3 (em)|Level 4 (em)|Level 5 (em)|Level 6 (em)' && await names([...NUM, 'Space below']) === await names([...NUM, 'Space above']))
check('Space above follows All lists (0.075 em)', /Follows All lists \(0.075 em\)/.test(await desc([...NUM, 'Space above'], 'Level 2')), await desc([...NUM, 'Space above'], 'Level 2'))
// items with nested items (a fold arrow) have no padding in Live Preview, so measure leaf items and compare with before
await goto('## Numbered list')
const pad = (scope, q) => scope(`const c = getComputedStyle(${q}); return [parseFloat(c.paddingTop), parseFloat(c.paddingBottom), parseFloat(c.fontSize)]`)
const lpN = t => `[...el.querySelectorAll('.cm-line')].find(l => l.textContent.trim().endsWith(${J(t)}))`
const rdN = t => `[...el.querySelectorAll('li')].find(l => l.firstChild && l.textContent.trim().startsWith(${J(t)}))`
const [a1Before] = await pad(live, lpN('2. Second')), [aBulBefore] = (await goto('## Bullet list'), await pad(live, lpN('Level 2 again')))
await s.ev(`__slider(${J([...NUM, 'Space above'])}, 'Level 2', 1); __slider(${J([...NUM, 'Space below'])}, 'Level 2', 0.5); return 1`); await sleep(300)
check('Space above now overrides All lists', /Overrides All lists for numbered lists/.test(await desc([...NUM, 'Space above'], 'Level 2')))
await goto('## Numbered list')
const [a2, b2, f2] = await pad(live, lpN('Second, nested')), [a1] = await pad(live, lpN('2. Second'))
check('Live Preview: numbered level 2 gets 1 em above, 0.5 em below', Math.abs(a2 - f2) < 0.5 && Math.abs(b2 - f2 / 2) < 0.5, `${a2}/${b2} at ${f2}px`)
check('Live Preview: numbered level 1 keeps its spacing', a1 === a1Before, `${a1Before} -> ${a1}`)
const [ra, rb, rf] = await pad(reading, rdN('Second, nested'))
check('Reading view: numbered level 2 gets 1 em above, 0.5 em below', Math.abs(ra - rf) < 0.5 && Math.abs(rb - rf / 2) < 0.5, `${ra}/${rb} at ${rf}px`)
await goto('## Bullet list')
check('bullet level 2 is untouched (numbered setting only)', (await pad(live, lpN('Level 2 again')))[0] === aBulBefore)
await shot('m9-04-spacing')
await s.ev(`__row(${J([...NUM, 'Space above'])}, 'Level 1').scrollIntoView({ block: 'start' }); return 1`); await sleep(200); await s.shot('m9-05-spacing-settings')

// sweep Lists and Text & links: set, CSS parses, reset clears
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset all').click(); return 1`); await sleep(300)
const sheet = () => ev(`return app.plugins.plugins.stylemate.css`)
const n = await s.ev(`window.__rows = [...document.querySelectorAll('.customizer details .setting-item')].filter(r => /^(Lists|Text & links)$/.test(r.closest('.customizer > details').querySelector(':scope > summary').textContent) && r.querySelector('input[type=range], select, input[type=text], .cz-swatch'))
  window.__sweepSet = i => {
    const r = __rows[i], rg = r.querySelector('input[type=range]'), se = r.querySelector('select'), tx = r.querySelector('input[type=text]')
    if (rg) { const mn = +rg.min, mx = +rg.max, st = +rg.step || 1; let v = mn + Math.round((mx - mn) / 2 / st) * st; if (String(v) === rg.value) v = mx; rg.value = v; rg.dispatchEvent(new Event('input', { bubbles: true })) }
    else if (se) { se.value = [...se.options].find(o => o.value !== se.value).value; se.dispatchEvent(new Event('change', { bubbles: true })) }
    else if (tx) { tx.value = 'Inter'; tx.dispatchEvent(new Event('input', { bubbles: true })) }
    else { if (!r.querySelector('.cz-pop')) r.querySelector('.cz-swatch').click(); const h = r.querySelector('.cz-hex'); h.value = '#123456'; h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); r.querySelector('.cz-swatch').click() }
  }
  return __rows.length`)
const bad = []
for (let i = 0; i < n; i++) {
  const name = await s.ev(`return __rows[${i}].querySelector('.setting-item-name').textContent`)
  await s.ev(`__sweepSet(${i}); return 1`); await sleep(50)
  const css = await sheet(), kept = await ev(`const sh = new CSSStyleSheet(); sh.replaceSync(app.plugins.plugins.stylemate.css); return sh.cssRules.length`)
  if (!css.trim()) bad.push(`${name}: no CSS`)
  else if (kept !== css.split('\n').length) bad.push(`${name}: rule rejected`)
  if (!await s.ev(`return __rows[${i}].classList.contains('customizer-changed')`)) bad.push(`${name}: not marked changed`)
  await s.ev(`__rows[${i}].querySelector('.clickable-icon').click(); return 1`); await sleep(50)
  if ((await sheet()).trim() !== '') bad.push(`${name}: reset did not clear`)
}
check(`Lists and Text & links controls: set, CSS parses, reset clears (${n} controls)`, bad.length === 0 && n > 60, bad.join('; '))
done()
