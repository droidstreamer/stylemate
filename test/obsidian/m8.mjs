// M8 live checks only (descriptions, icons, list groups, follow/override, removals). `npm run build` first, then `node test/obsidian/m8.mjs`.
import { call, check, done, ev, openSettings, shot, sleep } from './drive.mjs'

await ev(`const p = app.plugins.plugins.stylemate; p.saveData = async () => {}; p.settings.values = {}; p.settings.enabled = true; p.apply(); return 1`)
await call('Page.bringToFront')
console.log('StyleMate', await ev(`return app.plugins.plugins.stylemate.manifest.version`))
const J = JSON.stringify
const retry = async f => { for (let i = 0; ; i++) try { return await f() } catch (e) { if (i > 4) throw e; await sleep(400) } }
const reading = js => retry(() => ev(`const el = app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === 'preview').view.containerEl.querySelector('.markdown-reading-view'); ${js}`))
const goto = heading => ev(`const ls = app.workspace.getLeavesOfType('markdown'), line = ls[0].view.data.split('\\n').findIndex(l => l.startsWith(${J(heading)}))
  for (const l of ls) { if (l.view.getMode() === 'preview') l.view.previewMode.applyScroll(line); else l.view.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line: line + 12, ch: 0 } }, true) }
  await new Promise(r => setTimeout(r, 600)); return line`)
await ev(`await app.commands.executeCommandById('stylemate:open-preview'); await new Promise(r => setTimeout(r, 1200)); return 1`)

const s = await openSettings()
await s.ev(`document.querySelectorAll('.customizer details').forEach(d => d.open = true); return 1`); await sleep(300)
const sheet = () => ev(`return app.plugins.plugins.stylemate.css`)
const desc = (path, label) => s.ev(`return __row(${J(path)}, ${J(label)}).querySelector('.setting-item-description').textContent`)

// every entry: an icon, a written description, no hover tooltip
const rows = await s.ev(`return [...document.querySelectorAll('.customizer .setting-item:not(.cz-host)')].filter(r => r.querySelector('.setting-item-name').textContent.trim())
  .map(r => ({ name: r.querySelector('.setting-item-name').textContent.replace('experimental', '').trim(), icon: !!r.querySelector('.setting-item-name .cz-icon svg'),
    desc: r.querySelector('.setting-item-description')?.textContent.trim() ?? '', tip: r.querySelector('.setting-item-info').hasAttribute('aria-label') }))`)
check(`every entry has an icon (${rows.length} entries)`, rows.every(r => r.icon), rows.filter(r => !r.icon).map(r => r.name).join(', '))
check('every entry has a description under its name', rows.every(r => r.desc.length > 10), rows.filter(r => r.desc.length <= 10).map(r => r.name).join(', '))
check('no hover tooltips on entry names', rows.every(r => !r.tip), rows.filter(r => r.tip).map(r => r.name).join(', '))
check('no explanation in brackets in entry names (units only)', rows.every(r => !/\((?!px\)|em\)|rem\)|%\))/.test(r.name)), rows.filter(r => /\((?!px\)|em\)|rem\)|%\))/.test(r.name)).map(r => r.name).join(', '))

// removals
check('Side margins is gone; Line width has no bracket note', !(await s.ev(`return !!__row(['Page'], 'Side margins')`)) && await s.ev(`return !!__row(['Page'], 'Line width (px)')`))
check('letter case has no Sentence case', await s.ev(`return [...__row(['Headings', 'H1'], 'Style').querySelector('select').options].map(o => o.value).join('|')`) === 'normal|ALL CAPS|lowercase|Capitalize Each Word|small caps|all small caps')
check('no top-level Checkboxes group', await s.ev(`return [...document.querySelectorAll('.customizer > details > summary')].map(x => x.textContent).join('|')`) === 'Page|Text & links|Headings|Lists|Quotes & rules|Editor')

// Auto palette wording
const pal = ['Headings', 'Auto palette (all headings, H1-H6)']
check('palette: Start color says main headings (H1)', await desc(pal, 'Start color') === 'The color applied to main headings (H1).')
check('palette: sliders say all headings (H1-H6)', (await Promise.all(['Hue', 'Saturation', 'Value', 'Contrast'].map(n => desc(pal, n)))).every(d => d.startsWith('All headings (H1-H6)')))
check('heading line height says it only shows when the heading wraps', /wrap/.test(await desc(['Headings', 'H2'], 'Line height')))

// Lists: four boxes, sections, contents
const boxes = await s.ev(`const L = [...document.querySelectorAll('.customizer > details')].find(d => d.querySelector(':scope > summary').textContent === 'Lists')
  return [...L.querySelectorAll(':scope > details')].map(d => d.querySelector(':scope > summary').textContent + ': ' + [...d.children].map(c => c.classList.contains('cz-sec') ? '[' + c.textContent + ']' : c.tagName === 'DETAILS' ? '{' + c.querySelector('summary').textContent + ' ' + c.querySelectorAll('.setting-item').length + '}' : c.querySelector?.('.setting-item-name')?.textContent.replace('experimental', '').trim() ?? '').filter(Boolean).join(', '))`)
const want = [
  'All lists: [Color], Marker color, [Spacing], Indent per level (em), Space between items (em), [Indent guide lines], Thickness (px), Color, Thickness, list you are in (px), Color, list you are in',
  'Bullet lists: [Color], Bullet color, On hover, When folded, [Shape], Size (px), Corner radius (%), [Spacing], Bullet to text gap (px), {Indent steps 6}',
  'Numbered lists: [Color], Number color, [Spacing], Number to text gap (px), {Indent steps 6}',
  'Checkbox lists: [Color], Ticked fill, Empty box border, Tick mark, [Shape], Size (px), Corner radius (%), [Spacing], Box to text gap (px), {Indent steps 6}, [Done tasks], Text color, Crossed out']
check('Lists: All / Bullet / Numbered / Checkbox boxes with Color, Shape, Spacing sections', J(boxes.map(b => b.replace(/, $/, ''))) === J(want), '\n    ' + boxes.join('\n    '))
await s.ev(`__row(['Lists', 'All lists'], 'Marker color').scrollIntoView({ block: 'start' }); return 1`); await sleep(200); await s.shot('m8-01-lists-top')
await s.ev(`__row(['Lists', 'Checkbox lists'], 'Ticked fill').scrollIntoView({ block: 'start' }); return 1`); await sleep(200); await s.shot('m8-02-checkbox-lists')
await s.ev(`__row(${J(pal)}, 'Start color').scrollIntoView({ block: 'start' }); return 1`); await sleep(200); await s.shot('m8-03-palette')

// follow / override: colors
const NUM = ['Lists', 'Numbered lists'], BUL = ['Lists', 'Bullet lists']
check('Number color says it follows All lists', /Follows All lists/.test(await desc(NUM, 'Number color')), await desc(NUM, 'Number color'))
await s.ev(`__color(['Lists', 'All lists'], 'Marker color', '#ff0000'); return 1`); await sleep(300)
check('changing All lists marker color updates the follower', /Follows All lists \(#ff0000\)/i.test(await desc(NUM, 'Number color')) && /#ff0000/i.test(await s.ev(`return __row(${J(NUM)}, 'Number color').querySelector('.cz-swatch').style.background || getComputedStyle(__row(${J(NUM)}, 'Number color').querySelector('.cz-swatch')).backgroundColor`).then(c => c.replace(/rgb\(255, 0, 0\)/, '#ff0000'))), await desc(NUM, 'Number color'))
await s.ev(`__color(${J(NUM)}, 'Number color', '#0000ff'); return 1`); await sleep(300)
check('Number color now says it overrides All lists', /Overrides All lists for numbered lists/.test(await desc(NUM, 'Number color')))
await goto('## Bullet list')
check('bullets keep the All lists color (red)', await reading(`return getComputedStyle(el.querySelector('.list-bullet'), '::after').backgroundColor`) === 'rgb(255, 0, 0)')
await goto('## Numbered list')
check('numbers take their own color (blue)', await reading(`return getComputedStyle(el.querySelector('ol > li'), '::marker').color`) === 'rgb(0, 0, 255)')
await s.ev(`__reset(${J(NUM)}, 'Number color'); return 1`); await sleep(300)
check('reset arrow: Number color follows All lists again', /Follows All lists/.test(await desc(NUM, 'Number color')) && await reading(`return getComputedStyle(el.querySelector('ol > li'), '::marker').color`) === 'rgb(255, 0, 0)')

// follow / override: indents
const STEPS = ['Lists', 'Bullet lists', 'Indent steps']
const px = await ev(`return parseFloat(getComputedStyle(document.body).getPropertyValue('--font-text-size')) || 16`)
const CST = ['Lists', 'Checkbox lists', 'Indent steps']
check('Obsidian default indent (a calc) reads as 2.25 em, and unset steps show it in px', await s.ev(`return __row(['Lists', 'All lists'], 'Indent per level').querySelector('input[type=range]').value`) === '2.25'
  && await s.ev(`return __row(${J(CST)}, 'Level 1').querySelector('input[type=range]').value`) === String(Math.round(2.25 * px)) && /Follows All lists \(2.25 em\)/.test(await desc(CST, 'Level 1')), await desc(CST, 'Level 1'))
await s.ev(`__slider(['Lists', 'All lists'], 'Indent per level', 3); return 1`); await sleep(300)
check('unset bullet steps show the All lists indent', await s.ev(`return __row(${J(STEPS)}, 'Level 1').querySelector('input[type=range]').value`) === String(3 * px) && /Follows All lists \(3 em\)/.test(await desc(STEPS, 'Level 1')), await desc(STEPS, 'Level 1'))
await s.ev(`__slider(${J(STEPS)}, 'Level 1', 60); return 1`); await sleep(300)
await goto('## Bullet list')
const m = await reading(`const lis = [...el.querySelectorAll('ul:not(.contains-task-list) li')], t = n => lis.find(l => l.firstChild && l.textContent.trim().startsWith(n)); return [t('Level 2 item'), t('Level 3 item')].map(l => parseFloat(getComputedStyle(l).marginInlineStart))`)
check('bullet Level 1 step overrides; the unset Level 2 step follows All lists', m[0] === 60 && Math.abs(m[1] - 3 * px) < 1, `level 2 ${m[0]}px, level 3 ${m[1]}px (want 60, ${3 * px})`)
check('Level 1 step says it overrides All lists', /Overrides All lists for bullet lists/.test(await desc(STEPS, 'Level 1')))
await shot('m8-04-lists-note')

// sweep the controls that moved or changed (Lists and Page): set, CSS parses, reset clears
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset all').click(); return 1`); await sleep(300)
const n = await s.ev(`window.__rows = [...document.querySelectorAll('.customizer details .setting-item')].filter(r => /^(Lists|Page)$/.test(r.closest('.customizer > details').querySelector(':scope > summary').textContent) && r.querySelector('input[type=range], select, input[type=text], .cz-swatch'))
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
check(`Lists and Page controls: set, CSS parses, reset clears (${n} controls)`, bad.length === 0 && n > 30, bad.join('; '))
done()
