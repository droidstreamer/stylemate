// Live checks for StyleMate in a real Obsidian. `npm run build` first, then `npm run obsidian:check`.
import { call, check, done, ev, openSettings, shot, sleep } from './drive.mjs'

await ev(`const p = app.plugins.plugins.stylemate; p.saveData = async () => {}; p.settings.values = {}; p.settings.enabled = true; p.apply(); return 1`) // settings stay in memory
await call('Page.bringToFront')
console.log('StyleMate', await ev(`return app.plugins.plugins.stylemate.manifest.version`))
const bodyVar = v => ev(`return getComputedStyle(document.body).getPropertyValue(${JSON.stringify(v)}).trim()`)
const sheet = () => ev(`return app.plugins.plugins.stylemate.css`)
// Both views draw only what is on screen, so a lookup can race a re-layout: retry a few times before calling it a failure.
const retry = async f => { for (let i = 0; ; i++) try { return await f() } catch (e) { if (i > 4) throw e; await sleep(400) } }
const reading = js => retry(() => ev(`const el = app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === 'preview').view.containerEl.querySelector('.markdown-reading-view'); ${js}`))
const live = js => retry(() => ev(`const el = app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === 'source').view.containerEl.querySelector('.markdown-source-view'); ${js}`))

// Both views render only what is on screen, so scroll to a heading before checking what is below it.
const goto = (heading, span = 12) => ev(`const ls = app.workspace.getLeavesOfType('markdown'), text = ls[0].view.data, line = text.split('\\n').findIndex(l => l.startsWith(${JSON.stringify(heading)}))
  for (const l of ls) { if (l.view.getMode() === 'preview') l.view.previewMode.applyScroll(line); else if (line < 1) l.view.editor.scrollTo(0, 0); else l.view.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line: line + ${span}, ch: 0 } }, true) }
  await new Promise(r => setTimeout(r, 600)); return line`)

// --- sample note: two leaves, live preview + reading view
await ev(`await app.commands.executeCommandById('stylemate:open-preview'); await new Promise(r => setTimeout(r, 1200)); return 1`)
const leaves = await ev(`return app.workspace.getLeavesOfType('markdown').map(l => l.view.getMode()).sort().join()`)
check('sample note opens in Live Preview and Reading view', leaves === 'preview,source', leaves)
await ev(`app.workspace.getLeavesOfType('markdown').find(l => l.view.getMode() === 'source').view.editor.setCursor({ line: 2, ch: 0 }); return 1`)
await shot('01-default')

// --- real UI: sliders and color pickers in the settings window
const s = await openSettings()
await s.shot('02-settings')
await goto('# Heading 1')
const h1Before = await reading(`return getComputedStyle(el.querySelector('h1')).fontSize`)
await s.ev(`__slider(['Headings', 'H1'], 'Size', 3); return 1`); await sleep(200)
check('slider sets the CSS variable', await bodyVar('--h1-size') === '3em', await bodyVar('--h1-size'))
const h1After = await reading(`return getComputedStyle(el.querySelector('h1')).fontSize`)
check('Reading view H1 grows', parseFloat(h1After) > parseFloat(h1Before) * 1.3, `${h1Before} -> ${h1After}`)
const lp = await live(`return getComputedStyle(el.querySelector('.cm-header-1')).fontSize`)
check('Live Preview H1 grows too', parseFloat(lp) > parseFloat(h1Before) * 1.3, lp)
check('settings row is marked changed', await s.ev(`return __row(['Headings', 'H1'], 'Size').classList.contains('customizer-changed')`))
await s.ev(`__reset(['Headings', 'H1'], 'Size'); return 1`); await sleep(200)
check('reset removes the override', (await sheet()).trim() === '', await sheet())
check('reset moves the slider back', await s.ev(`return __row(['Headings', 'H1'], 'Size').querySelector('input[type=range]').value`) === '1.6', 'default 1.618em, rounded to the step')

// colors are per theme
const theme = await ev(`return document.body.classList.contains('theme-dark') ? 'dark' : 'light'`)
await s.ev(`__color(['Headings', 'H2'], 'Color', '#ff0000'); return 1`); await sleep(200)
const css = await sheet()
check('color goes to the current theme only', css.includes(`body.theme-${theme}{--h2-color:#FF0000 !important}`) && !css.includes(`theme-${theme === 'dark' ? 'light' : 'dark'}`), css)
check('Reading view H2 turns red', await reading(`return getComputedStyle(el.querySelector('h2')).color`) === 'rgb(255, 0, 0)')
check('Live Preview H2 turns red', await live(`return getComputedStyle(el.querySelector('.cm-header-2')).color`) === 'rgb(255, 0, 0)')

// experimental selector rules
await s.ev(`__slider(['Headings', 'H2'], 'Shift', -20); __slider(['Headings', 'H3'], 'Space above', 2); return 1`); await sleep(200)
check('experimental: heading shift moves H2', await reading(`return getComputedStyle(el.querySelector('h2')).left`) === '-20px')
check('experimental: space above H3 (reading)', await reading(`const d = el.querySelector('h3').parentElement, c = getComputedStyle(d); return Math.abs(parseFloat(c.marginTop) - 2 * parseFloat(c.fontSize)) < 0.5`))
check('experimental: space above H3 (Live Preview)', await live(`const c = getComputedStyle(el.querySelector('.HyperMD-header-3')); return Math.abs(parseFloat(c.paddingTop) - 2 * parseFloat(c.fontSize)) < 0.5`))
await goto('## Checkboxes')
await s.ev(`__color(['Checkboxes'], 'Color of [/]', '#00aa00'); __color(['Lists', 'Marker colors'], 'Bullets only', '#ff00ff'); return 1`); await sleep(200)
check('experimental: [/] checkbox gets its own color', await reading(`return getComputedStyle(el.querySelector('li[data-task="/"]')).getPropertyValue('--checkbox-color').trim()`) === '#00AA00')
check('experimental: [x] checkbox is untouched', await reading(`return getComputedStyle(el.querySelector('li[data-task="x"]')).getPropertyValue('--checkbox-color').trim()`) !== '#00AA00')
await s.ev(`__slider(['Lists'], 'Indent per level', 4); __slider(['Checkboxes'], 'Size', 26); __slider(['Page'], 'Line width', 600); return 1`); await sleep(300)
await goto('## Bullet list')
check('experimental: bullet color (reading)', await reading(`return getComputedStyle(el.querySelector('.list-bullet'), '::after').backgroundColor`) === 'rgb(255, 0, 255)')
check('experimental: bullet color (Live Preview)', await live(`return getComputedStyle(el.querySelector('.list-bullet'), '::after').backgroundColor`) === 'rgb(255, 0, 255)')
await shot('03b-bullets')
check('list indent variable', await bodyVar('--checkbox-size') === '26px')
await goto('## Checkboxes')
check('checkbox size reaches the checkbox', await reading(`return getComputedStyle(el.querySelector('input[type=checkbox]')).width`) === '26px')
await shot('03-customized')
await s.shot('04-settings-changed')


// --- M2: fixes from the first test round
await goto('## Text', 2)
await s.ev(`__slider(['Page'], 'Text size', 24); __slider(['Text & links'], 'Bold strength', 500); return 1`); await sleep(300)
check('text size works even though Obsidian sets it inline', await reading(`return getComputedStyle(el.querySelector('p')).fontSize`) === '24px')
check('text size works in Live Preview', await live(`return getComputedStyle(el.querySelector('.cm-content')).fontSize`) === '24px')
check('bold strength changes bold (reading)', await reading(`return getComputedStyle(el.querySelector('strong')).fontWeight`) === '900')
check('bold strength changes bold (Live Preview)', await live(`return getComputedStyle(el.querySelector('.cm-strong')).fontWeight`) === '900')
const navColor = () => ev(`return getComputedStyle(document.querySelector('.nav-file-title, .tree-item-self')).color`)
const navBefore = await navColor()
await s.ev(`__color(['Text & links'], 'Text color (reading', '#00ffff'); return 1`); await sleep(300)
check('notes-only text color changes the note text', await reading(`return getComputedStyle(el.querySelector('p')).color`) === 'rgb(0, 255, 255)')
check('note text color also changes Live Preview (editing)', await live(`return getComputedStyle(el.querySelector('.cm-line:not(.HyperMD-header)')).color`) === 'rgb(0, 255, 255)')
check('notes-only text color leaves the sidebar alone', await navColor() === navBefore)
await s.ev(`__reset(['Text & links'], 'Text color (reading'); __reset(['Page'], 'Text size'); __reset(['Text & links'], 'Bold strength'); return 1`)

await goto('## Bullet list')
await s.ev(`__slider(['Lists'], 'Indent per level', 3); return 1`); await sleep(300)
const ind = () => live(`return [...el.querySelectorAll('.cm-hmd-list-indent-1 .cm-indent')].map(e => e.getBoundingClientRect().width)`)
const ind3 = await ind()
await s.ev(`__slider(['Lists'], 'Indent per level', 1); return 1`); await sleep(300)
const ind1 = await ind()
check('one indent setting drives Live Preview', ind3.length > 0 && ind3[0] > ind1[0] * 1.5, `${ind1[0]} -> ${ind3[0]}`)
check('no second (Live Preview) indent setting', await s.ev(`return !__row(['Lists'], 'Indent per level (Live')`))
check('bullet and number colors sit under "Marker colors"', await s.ev(`return !!__row(['Lists', 'Marker colors'], 'Bullets only') && !!__row(['Lists', 'Marker colors'], 'Numbers only')`))
await s.ev(`__slider(['Lists'], 'Indent guide line thickness', 6); return 1`); await sleep(300)
check('guide thickness is set inside notes', await reading(`return getComputedStyle(el.querySelector('.markdown-preview-view')).getPropertyValue('--indentation-guide-width').trim()`) === '6px')
check('guide thickness leaves File Explorer alone', await ev(`return getComputedStyle(document.querySelector('.nav-files-container')).getPropertyValue('--indentation-guide-width').trim()`) !== '6px')
await s.ev(`__slider(['Lists'], 'Bullet corner radius', 10); __slider(['Checkboxes'], 'Corner radius', 25); return 1`); await sleep(200)
check('corner radius is a slider (bullets)', await bodyVar('--list-bullet-radius') === '10%')
check('corner radius is a slider (checkboxes)', await bodyVar('--checkbox-radius') === '25%')
await s.ev(`__reset(['Lists'], 'Indent guide line thickness'); __reset(['Lists'], 'Indent per level'); __reset(['Lists'], 'Bullet corner'); __reset(['Checkboxes'], 'Corner radius'); return 1`)

await goto('## Text', 2)
await s.ev(`__slider(['Page'], 'Side margins', 100); return 1`); await sleep(300)
check('side margins pad left and right (Live Preview)', await live(`const c = getComputedStyle(el.querySelector('.cm-scroller')); return c.paddingLeft + ' ' + c.paddingRight`) === '100px 100px')
check('side margins leave top and bottom alone', await live(`return getComputedStyle(el.querySelector('.cm-scroller')).paddingTop`) === '32px')
check('side margins pad left and right (reading)', await reading(`return getComputedStyle(el.querySelector('.markdown-preview-view')).paddingLeft`) === '100px')
await s.ev(`__reset(['Page'], 'Side margins'); return 1`)

check('code background / code text settings are gone', await s.ev(`return ![...document.querySelectorAll('.setting-item-name')].some(n => /^Code (background|text)/.test(n.textContent))`))
const fonts = await s.ev(`const i = __row(['Headings'], 'Font for all headings').querySelector('input[type=text]'); await new Promise(r => setTimeout(r, 500)); const dl = document.getElementById(i.getAttribute('list')); return dl ? dl.options.length : -1`)
check('font boxes suggest installed fonts', fonts > 10, `${fonts} fonts`)

// the picker updates live while dragging, no click outside
await s.ev(`__color(['Headings', 'H4'], 'Color', '#ff0000'); __hue(['Headings', 'H4'], 'Color', 120); return 1`); await sleep(200)
check('color picker applies while dragging the hue', (await sheet()).includes('--h4-color:#00FF00'), 'red -> hue 120 = green')
const h4 = await goto('#### Heading 4')
check('Reading view H4 turns green live', await reading(`return getComputedStyle(el.querySelector('h4')).color`) === 'rgb(0, 255, 0)')
await s.ev(`__row(['Headings', 'H4'], 'Color').scrollIntoView({ block: 'start' }); return 1`); await sleep(300)
check('picker tracks are the full 12px high and wide (not thinned by Obsidian\'s own slider style)', await s.ev(`const r = [...document.querySelectorAll('.cz-pop .cz-track')].map(i => { const c = getComputedStyle(i); return [c.height, Math.round(i.getBoundingClientRect().width)].join(' ') }); return r.length === 3 && r.every(x => x.startsWith('12px') && parseInt(x.split(' ')[1]) > 150) && r.join()`), await s.ev(`return [...document.querySelectorAll('.cz-pop .cz-track')].map(i => getComputedStyle(i).height + ' ' + i.getBoundingClientRect().width).join()`))
await s.shot('04c-picker-open')
await s.ev(`__reset(['Headings', 'H4'], 'Color'); return 1`)

// --- M3: auto heading palette
const PAL = ['Headings', 'Auto palette (all six colors)']
const hsl = css => { const [r, g, b] = css.match(/[\d.]+/g).map(n => n / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
  const h = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 * 60 : mx === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60
  return [h, d ? d / (1 - Math.abs(2 * l - 1)) * 100 : 0, l * 100] }
await goto('# Heading 1')
await s.ev(`__color(${JSON.stringify(PAL)}, 'Start color', '#FFCC00'); __color(${JSON.stringify(PAL)}, 'End color', '#3366CC'); return 1`); await sleep(300)
const colors = await ev(`return [1,2,3,4,5,6].map(n => getComputedStyle(document.body).getPropertyValue('--h' + n + '-color').trim())`)
const L = colors.map(c => hsl(`rgb(${[1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).join(',')})`))
check('the start and end colors set all six heading colors', colors.every(c => /^#[0-9A-F]{6}$/i.test(c)), colors.join(' '))
check('H1 is more saturated than H6', L[0][1] > L[5][1] + 20, `${L[0][1].toFixed(0)}% vs ${L[5][1].toFixed(0)}%`)
check('Reading view H1 uses the palette', await reading(`return getComputedStyle(el.querySelector('h1')).color`) !== 'rgb(255, 0, 0)' )
await s.ev(`__row(${JSON.stringify(PAL)}, 'Start color').scrollIntoView({ block: 'start' }); return 1`); await sleep(300)
await s.shot('06-palette'); await shot('06b-palette-note')
await s.ev(`__slider(${JSON.stringify(PAL)}, 'Hue', 90); return 1`); await sleep(300)
const colors2 = await ev(`return [1,2,3,4,5,6].map(n => getComputedStyle(document.body).getPropertyValue('--h' + n + '-color').trim())`)
const L2 = colors2.map(c => hsl(`rgb(${[1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).join(',')})`))
check('hue slider moves all six hues by 90', L.every((h, i) => Math.abs((((L2[i][0] - h[0]) % 360) + 360) % 360 - 90) < 8 || h[1] < 5), `${L[0][0].toFixed(0)} -> ${L2[0][0].toFixed(0)}`)
await s.ev(`__slider(${JSON.stringify(PAL)}, 'Hue', 0); __slider(${JSON.stringify(PAL)}, 'Value', -20); return 1`); await sleep(300)
const colors3 = await ev(`return [1,2,3,4,5,6].map(n => getComputedStyle(document.body).getPropertyValue('--h' + n + '-color').trim())`)
check('value slider darkens all six', colors3.every((c, i) => hsl(`rgb(${[1, 3, 5].map(j => parseInt(c.slice(j, j + 2), 16)).join(',')})`)[2] < L[i][2] - 10))
await goto('# Heading 1')
check('Live Preview H1 follows', await live(`return getComputedStyle(el.querySelector('.cm-header-1')).color`) === `rgb(${[1, 3, 5].map(j => parseInt(colors3[0].slice(j, j + 2), 16)).join(', ')})`)
await s.ev(`__reset(['Headings', 'H1'], 'Color'); return 1`)

// --- M4: notes round
check('whole-app text color and muted text color are gone', await s.ev(`return ![...document.querySelectorAll('.customizer .setting-item-name')].some(n => /whole app|^Muted text/.test(n.textContent))`))
// palette: start and end swatches, contrast
await s.ev(`__slider(${JSON.stringify(PAL)}, 'Value', 0); __color(${JSON.stringify(PAL)}, 'Start color', '#FF0000'); __color(${JSON.stringify(PAL)}, 'End color', '#0000FF'); return 1`); await sleep(300)
const gcol = () => ev(`return [1,2,3,4,5,6].map(n => getComputedStyle(document.body).getPropertyValue('--h' + n + '-color').trim())`)
const g1 = await gcol()
check('start swatch is H1 and end swatch is H6', g1[0] === '#FF0000' && g1[5] === '#0000FF', g1.join(' '))
check('H2-H5 blend between them', new Set(g1).size === 6, g1.join(' '))
await s.ev(`__slider(${JSON.stringify(PAL)}, 'Contrast', 40); return 1`); await sleep(300)
const g2 = await gcol()
check('contrast widens the gradient', hsl(`rgb(${[1, 3, 5].map(j => parseInt(g2[0].slice(j, j + 2), 16)).join(',')})`)[1] >= 99 && g2.join() !== g1.join(), g2.join(' '))
await s.shot('07-palette-gradient')
await s.ev(`__slider(${JSON.stringify(PAL)}, 'Contrast', 0); [...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset Headings').click(); return 1`)

// header inheritance
await s.ev(`__slider(['Headings', 'H1'], 'Space above', 2.5); __slider(['Headings', 'H1'], 'Line height', 1.7); __slider(['Headings', 'H1'], 'Shift', 12); return 1`); await sleep(200)
await s.ev(`__row(['Headings', 'H2'], 'Inherit from').querySelector('button').click(); return 1`); await sleep(300)
const v = await ev(`return JSON.stringify(app.plugins.plugins.stylemate.settings.values)`)
check('Copy from H1 gives H2 the same above, line height and shift', ['"h2-above":2.5', '"h2-lh":1.7', '"h2-shift":12'].every(x => v.includes(x)), v)
check('the H2 slider shows the copied value', await s.ev(`return __row(['Headings', 'H2'], 'Space above').querySelector('input[type=range]').value`) === '2.5')
check('H1 has no inherit button', await s.ev(`return !__row(['Headings', 'H1'], 'Inherit from')`))
check('each heading submenu is a bordered box', await s.ev(`const d = document.querySelector('.customizer .customizer-group .customizer-group'); return getComputedStyle(d).borderTopStyle === 'solid'`), await s.ev(`const d = document.querySelector('.customizer .customizer-group .customizer-group'); const c = getComputedStyle(d); return d.className + ' ' + c.borderTopWidth + ' ' + c.borderTopStyle`))
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset Headings').click(); return 1`)

// header styles
await goto('## Heading 2')
await s.ev(`__case(['Headings', 'H3'], 'ALL CAPS'); __slider(['Headings', 'H3'], 'Letter spacing', 0.2); __case(['Headings', 'H4'], 'small caps')
  __row(['Headings', 'H3'], 'Style').querySelector('.cz-toggle[aria-label=Underline]').click(); return 1`); await sleep(300)
await goto('# Heading 1')
check('ALL CAPS (reading)', await reading(`return getComputedStyle(el.querySelector('h3')).textTransform`) === 'uppercase')
check('ALL CAPS (Live Preview)', await live(`return getComputedStyle(el.querySelector('.HyperMD-header-3')).textTransform`) === 'uppercase')
check('letter spacing (reading)', await reading(`const c = getComputedStyle(el.querySelector('h3')); return Math.abs(parseFloat(c.letterSpacing) - 0.2 * parseFloat(c.fontSize)) < 0.5`))
check('letter spacing (Live Preview)', await live(`const c = getComputedStyle(el.querySelector('.HyperMD-header-3')); return Math.abs(parseFloat(c.letterSpacing) - 0.2 * parseFloat(c.fontSize)) < 0.5`))
check('underline (reading)', await reading(`return getComputedStyle(el.querySelector('h3')).textDecorationLine`) === 'underline')
await goto('#### Heading 4')
check('small caps (reading)', await reading(`return getComputedStyle(el.querySelector('h4')).fontVariantCaps`) === 'small-caps')
check('small caps leaves H2 alone', await reading(`return getComputedStyle(el.querySelector('h2')).fontVariantCaps`) === 'normal')
await shot('08-header-styles')
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset Headings').click(); return 1`)

// presets
await s.ev(`__slider(['Headings', 'H1'], 'Size', 2.5); return 1`); await sleep(200)
await s.ev(`const r = [...document.querySelectorAll('.customizer .cz-host > .setting-item')].find(x => x.textContent.startsWith('Save current')); const t = r.querySelector('input'); t.value = 'Big'; t.dispatchEvent(new Event('input', { bubbles: true })); r.querySelector('button').click(); return 1`); await sleep(500)
check('preset is saved', await ev(`return Object.keys(app.plugins.plugins.stylemate.settings.presets).join()`) === 'Big')
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset all').click(); return 1`); await sleep(300)
check('settings cleared before loading', (await sheet()).trim() === '')
await s.ev(`[...document.querySelectorAll('.customizer .cz-host > .setting-item')].find(x => x.textContent.startsWith('Presets')).querySelector('button').click(); return 1`); await sleep(500)
check('preset loads', await bodyVar('--h1-size') === '2.5em', await bodyVar('--h1-size'))
check('settings window shows the loaded value', await s.ev(`return __row(['Headings', 'H1'], 'Size').querySelector('input[type=range]').value`) === '2.5')
await s.shot('09-presets')
await s.ev(`const r = [...document.querySelectorAll('.customizer .cz-host > .setting-item')].find(x => x.textContent.startsWith('Presets')); [...r.querySelectorAll('button')].find(b => b.textContent === 'Delete').click(); return 1`); await sleep(400)
check('preset deletes', await ev(`return Object.keys(app.plugins.plugins.stylemate.settings.presets).length`) === 0)

// --- M5: notes round 2
const J = JSON.stringify
const RESET_ALL = `[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset all').click()`
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)

// Preferences header
const about = await s.ev(`const a = document.querySelector('.customizer-about'); return a ? { name: a.querySelector('.customizer-about-name').textContent, title: a.querySelector('.customizer-about-title').textContent, p: a.querySelector('p').textContent.length, tip: !!a.querySelector('.customizer-about-tip'), href: a.querySelector('a.customizer-coffee')?.getAttribute('href'), img: a.querySelector('a img')?.getAttribute('src')?.startsWith('data:image/png') } : null`)
const ver = await ev(`return app.plugins.plugins.stylemate.manifest.version`)
check('Preferences header: title, version and author', about?.name === 'StyleMate' && about.title === `v${ver} · by Droid`, J(about))
check('Preferences header: description, tip and Buy Me a Coffee button', about?.p > 40 && about.tip && about.href === 'https://buymeacoffee.com/droidstreamer' && about.img)
check('Preferences header is the first thing on the page', await s.ev(`return document.querySelector('.customizer .setting-item').firstElementChild.classList.contains('customizer-about')`))
await s.ev(`document.querySelector('.customizer').scrollIntoView(); return 1`); await sleep(200)
await s.shot('10-preferences-header')

// auto palette: sliders like the picker's, "fill from the note background" gone, always open with Headings
check('"Fill from the note background" is gone', await s.ev(`return ![...document.querySelectorAll('.customizer .setting-item-name')].some(n => /Fill from/.test(n.textContent)) && ![...document.querySelectorAll('.customizer button')].some(b => b.textContent === 'Make palette')`))
check('Hue, Saturation, Value and Contrast are gradient-track sliders', J(await s.ev(`return ['Hue', 'Saturation', 'Value', 'Contrast'].map(n => { const i = __row(${J(PAL)}, n)?.querySelector('input.cz-track'); return !!i && getComputedStyle(i).backgroundImage.includes('gradient') })`)) === '[true,true,true,true]')
await s.ev(`__slider(${J(PAL)}, 'Hue', 40); return 1`); await sleep(200)
check('a palette slider shows its value beside it', await s.ev(`return __row(${J(PAL)}, 'Hue').querySelector('.cz-value').textContent`) === '40')
await s.ev(`__row(${J(PAL)}, 'Hue').querySelector('.clickable-icon').click(); return 1`); await sleep(200)
check('the slider reset arrow returns it to 0', await s.ev(`return __row(${J(PAL)}, 'Hue').querySelector('.cz-value').textContent`) === '0')
await s.ev(`__row(${J(PAL)}, 'Hue').scrollIntoView({ block: 'center' }); return 1`); await sleep(200)
await s.shot('11-palette-sliders')
check('Auto palette opens whenever Headings opens', await s.ev(`const h = [...document.querySelectorAll('.customizer details.cz-main')].find(d => d.querySelector(':scope > summary').textContent === 'Headings'), pal = [...h.querySelectorAll(':scope > details')].find(d => d.querySelector(':scope > summary').textContent.startsWith('Auto palette'))
  pal.open = false; h.open = false; await new Promise(r => setTimeout(r, 150)); h.open = true; await new Promise(r => setTimeout(r, 150)); return pal.open`))

await s.ev(`${RESET_ALL}; return 1`); await sleep(300)
// indent guide: active thickness
await s.ev(`__slider(['Lists'], 'Indent guide line thickness, active', 5); return 1`); await sleep(300)
check('active guide thickness is set inside notes', await reading(`return getComputedStyle(el.querySelector('.markdown-preview-view')).getPropertyValue('--indentation-guide-width-active').trim()`) === '5px')
check('active guide thickness leaves File Explorer alone', await ev(`return getComputedStyle(document.querySelector('.nav-files-container')).getPropertyValue('--indentation-guide-width-active').trim()`) !== '5px')
check('the plain guide thickness slider is a separate setting', !(await sheet()).includes('--indentation-guide-width:'))
await s.ev(`__reset(['Lists'], 'Indent guide line thickness, active'); return 1`)

// quote background bug: a transparent default must not show as black, and a chosen color must reach the note
await goto('## Quote')
check('quote background shows "no color", not black, while unset', await s.ev(`return __row(['Quotes & rules'], 'Quote background').querySelector('.cz-swatch').classList.contains('cz-none')`))
await s.ev(`__color(['Quotes & rules'], 'Quote background', '#FF0000'); return 1`); await sleep(300)
check('quote background reaches Reading view', await reading(`return getComputedStyle(el.querySelector('blockquote')).backgroundColor`) === 'rgb(255, 0, 0)')
check('quote background reaches Live Preview', await live(`return getComputedStyle(el.querySelector('.HyperMD-quote')).backgroundColor`) === 'rgb(255, 0, 0)')
check('the swatch shows the chosen color', await s.ev(`const w = __row(['Quotes & rules'], 'Quote background').querySelector('.cz-swatch'); return !w.classList.contains('cz-none') && getComputedStyle(w).backgroundColor === 'rgb(255, 0, 0)'`))
await shot('12-quote-background')
await s.ev(`__reset(['Quotes & rules'], 'Quote background'); return 1`); await sleep(200)
check('reset returns the swatch to "no color"', await s.ev(`return __row(['Quotes & rules'], 'Quote background').querySelector('.cz-swatch').classList.contains('cz-none')`))
check('picking from "no color" starts on a visible color, not black', await s.ev(`const r = __row(['Quotes & rules'], 'Quote background'); r.querySelector('.cz-swatch').click(); const v = r.querySelector('.cz-hex').value; r.querySelector('.cz-swatch').click(); return v !== '#000000' && v`))

// export .css
await s.ev(`__slider(['Headings', 'H1'], 'Size', 2.5); __color(['Headings', 'H2'], 'Color', '#ff0000'); return 1`); await sleep(200)
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Save snippet').click(); return 1`); await sleep(600)
const file = await ev(`try { return await app.vault.adapter.read(app.vault.configDir + '/snippets/stylemate.css') } catch (e) { return 'ERR ' + e }`)
check('Export writes customizer.css into the vault snippets folder', file.startsWith('/* StyleMate settings') && file.includes('--h1-size:2.5em !important;'), file.slice(0, 80))
check('the snippet has the theme-scoped color too', /body\.theme-(dark|light) \{\n  --h2-color:#FF0000 !important;/.test(file), file)
check('the snippet parses as CSS with every rule kept', await ev(`const sh = new CSSStyleSheet(); sh.replaceSync(${J(file)}); return sh.cssRules.length === 2`))
const notice = async text => { const f = `return [...document.querySelectorAll('.notice')].some(n => n.textContent.includes(${J(text)}))`; return await s.ev(f) || await ev(f) }
check('a notice says where it was saved', await notice('customizer.css'))
await s.call('Page.bringToFront')
await s.ev(`window.__copied = null; const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = t => { __copied = t; return w(t) }; return 1`) // capture what is written: reading the system clipboard back is unreliable in a test session
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Copy CSS').click(); return 1`); await sleep(600)
check('Copy CSS says it copied', await notice('CSS copied'))
const clip = await s.ev(`return __copied`)
check('Copy CSS writes the CSS from the Preferences window', !!clip && clip.includes('--h1-size:2.5em') && clip.startsWith('/* StyleMate settings'), String(clip).slice(0, 60))
await ev(`await app.vault.adapter.remove(app.vault.configDir + '/snippets/stylemate.css'); return 1`)
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)

// presets: several, created out of order; every one loads itself and the dropdown keeps showing it
const make = async (name, size) => {
  await s.ev(`__slider(['Headings', 'H1'], 'Size', ${size}); return 1`); await sleep(150)
  await s.ev(`const r = [...document.querySelectorAll('.customizer .cz-host > .setting-item')].find(x => x.textContent.startsWith('Save current')), t = r.querySelector('input'); t.value = ${J(name)}; t.dispatchEvent(new Event('input', { bubbles: true })); r.querySelector('button').click(); return 1`); await sleep(400)
}
for (const [n, z] of [['Mike', 2], ['Alpha', 1.5], ['Zulu', 3], ['Echo', 2.5]]) await make(n, z)
const want = { Alpha: 1.5, Echo: 2.5, Mike: 2, Zulu: 3 }
check('all four presets are stored', J(Object.keys(await ev(`return app.plugins.plugins.stylemate.settings.presets`)).sort()) === J(Object.keys(want)))
check('the dropdown lists them in order', await s.ev(`return [...[...document.querySelectorAll('.customizer .cz-host > .setting-item')].find(x => x.textContent.startsWith('Presets')).querySelector('select').options].map(o => o.value).join()`) === 'Alpha,Echo,Mike,Zulu')
for (const n of ['Zulu', 'Mike', 'Alpha', 'Echo', 'Zulu', 'Alpha', 'Mike']) {
  const shown = await s.ev(`const pr = () => [...document.querySelectorAll('.customizer .cz-host > .setting-item')].find(x => x.textContent.startsWith('Presets')), sel = pr().querySelector('select'); sel.value = ${J(n)}; sel.dispatchEvent(new Event('change', { bubbles: true })); [...pr().querySelectorAll('button')].find(b => b.textContent === 'Load').click(); await new Promise(r => setTimeout(r, 400)); return [pr().querySelector('select').value, __row(['Headings', 'H1'], 'Size').querySelector('input[type=range]').value].join()`)
  check(`loading "${n}" loads "${n}"`, await bodyVar('--h1-size') === `${want[n]}em` && shown === `${n},${want[n]}`, `${await bodyVar('--h1-size')} / ${shown}`)
}
await ev(`app.plugins.plugins.stylemate.settings.presets = {}; return 1`)
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)

// per-level indents
const BS = ['Lists', 'Bullet list indent steps'], NS = ['Lists', 'Numbered list indent steps'], CS = ['Lists', 'Checkbox list indent steps']
check('each list type has six level steps', await s.ev(`return [${J(BS)}, ${J(NS)}, ${J(CS)}].map(p => [1, 2, 3, 4, 5, 6].every(k => !!__row(p, 'Level ' + k + ' step'))).join()`) === 'true,true,true')
const lpIndent = (type, lvl) => live(`return [...el.querySelectorAll('.HyperMD-list-line-${lvl}')].filter(l => ${type}).map(l => { const i = l.querySelector('.cm-hmd-list-indent'), c = getComputedStyle(l); return [Math.round(i.getBoundingClientRect().width), c.paddingInlineStart, c.textIndent, Math.round(l.querySelector('.cm-formatting-list, .task-list-label').getBoundingClientRect().left - l.getBoundingClientRect().left)].join(' ') })[0]`)
const isB = `l.querySelector('.cm-formatting-list-ul') && !l.classList.contains('HyperMD-task-line')`, isN = `l.querySelector('.cm-formatting-list-ol')`, isC = `l.classList.contains('HyperMD-task-line')`
const rdMargin = (sel, depth) => reading(`let list = [...el.querySelectorAll(${J(sel)})].find(u => !u.parentElement.closest('li')); for (let d = 0; d < ${depth}; d++) list = [...list.children].find(l => l.querySelector(':scope > ul, :scope > ol')).querySelector(':scope > ul, :scope > ol'); return getComputedStyle(list.querySelector(':scope > li')).marginInlineStart`)
await s.ev(`__slider(${J(BS)}, 'Level 1', 60); __slider(${J(BS)}, 'Level 2', 20); return 1`); await sleep(400)
await goto('## Bullet list')
check('bullets, Live Preview level 2: indent 60, marker at 60', await lpIndent(isB, 2) === '60 80px -80px 60', await lpIndent(isB, 2))
check('bullets, Live Preview level 3: 60 + 20', await lpIndent(isB, 3) === '80 100px -100px 80', await lpIndent(isB, 3))
check('bullets, Live Preview level 4: step 3 untouched = Obsidian\'s 36', (await lpIndent(isB, 4)).startsWith('116 136px -136px'), await lpIndent(isB, 4)) // marker not compared: the narrow test pane wraps it onto the continuation line
check('bullets, Reading view level 2 margin 60', await rdMargin('ul:not(.contains-task-list)', 1) === '60px', await rdMargin('ul:not(.contains-task-list)', 1))
check('bullets, Reading view level 3 margin 20', await rdMargin('ul:not(.contains-task-list)', 2) === '20px', await rdMargin('ul:not(.contains-task-list)', 2))
check('bullets, Reading view level 4 margin = native 36', await rdMargin('ul:not(.contains-task-list)', 3) === '36px', await rdMargin('ul:not(.contains-task-list)', 3))
await shot('13-bullet-indents')
await goto('## Numbered list')
check('numbered lists are untouched by bullet steps (Live Preview)', (await lpIndent(isN, 2))?.startsWith('36 '), await lpIndent(isN, 2))
check('numbered lists are untouched by bullet steps (Reading)', await rdMargin('ol', 1) === '36px', await rdMargin('ol', 1))
await s.ev(`__slider(${J(NS)}, 'Level 1', 50); __slider(${J(NS)}, 'Level 2', 10); return 1`); await sleep(400)
check('numbered, Live Preview level 2: indent 50, marker at 50', await lpIndent(isN, 2) === '50 78px -78px 50', await lpIndent(isN, 2))
check('numbered, Live Preview level 3: 50 + 10', await lpIndent(isN, 3) === '60 88px -88px 60', await lpIndent(isN, 3))
check('numbered, Reading view levels 2 and 3', await rdMargin('ol', 1) === '50px' && await rdMargin('ol', 2) === '10px', `${await rdMargin('ol', 1)} ${await rdMargin('ol', 2)}`)
await shot('14-numbered-indents')
await goto('## Checkboxes')
await s.ev(`__slider(${J(CS)}, 'Level 1', 44); return 1`); await sleep(400)
check('checkboxes, Live Preview level 2: indent 44', (await lpIndent(isC, 2)).startsWith('44 74px -74px'), await lpIndent(isC, 2)) // the box's own left edge sits a few px inside the label, so only the three padding values are compared
check('checkboxes, Reading view level 2 margin 44', await rdMargin('ul.contains-task-list', 1) === '44px', await rdMargin('ul.contains-task-list', 1))
await shot('15-checkbox-indents')
await goto('## Bullet list')
check('checkbox steps leave the bullet steps alone', await lpIndent(isB, 2) === '60 80px -80px 60', await lpIndent(isB, 2))
check('a changed step is marked in Preferences', await s.ev(`return __row(${J(BS)}, 'Level 1').classList.contains('customizer-changed')`))
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset Lists').click(); return 1`); await sleep(300)
check('Reset Lists clears the indent steps and their rules', (await sheet()).trim() === '' && await s.ev(`return __row(${J(BS)}, 'Level 1').querySelector('input[type=range]').value`) === '36')

// --- M6: notes round 3
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)
// tooltips on every setting, shown on a real mouse hover
const noTip = await s.ev(`return [...document.querySelectorAll('.customizer details .setting-item-info')].filter(n => n.textContent.trim() && !n.getAttribute('aria-label')).map(n => n.textContent)`)
check('every setting name has a hover tooltip', noTip.length === 0, noTip.join(', '))
const lh = await s.ev(`const n = __row(['Headings', 'H1'], 'Line height').querySelector('.setting-item-name'); n.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 200)); const b = n.getBoundingClientRect(); return { x: b.x + 20, y: b.y + b.height / 2 }`)
await s.call('Page.bringToFront'); await s.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: lh.x, y: lh.y }); await sleep(1200)
const tipText = await s.ev(`return document.querySelector('.tooltip')?.textContent ?? ''`)
check('hovering "Line height" (H1) shows its tooltip', /wraps/.test(tipText), tipText)
await s.shot('16-tooltip')
await s.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 })
// icons on heading settings
const icons = await s.ev(`return [...__row(['Headings', 'H1'], 'Size').parentElement.querySelectorAll(':scope > .setting-item')].filter(r => r.querySelector('input, select, .cz-swatch')).map(r => r.querySelector('.setting-item-name').textContent.replace('experimental', '').trim() + ':' + !!r.querySelector('.cz-icon svg'))`)
check('every H1 setting shows an icon', icons.every(x => x.endsWith(':true')), icons.join(' '))
// style strip
const strip = await s.ev(`const r = __row(['Headings', 'H2'], 'Style'), box = r.parentElement; return { opts: [...r.querySelector('select').options].map(o => o.value), toggles: [...r.querySelectorAll('.cz-toggle')].map(t => t.getAttribute('aria-label') + (t.querySelector('svg') ? '+icon' : '')), old: [...box.querySelectorAll(':scope > .setting-item .setting-item-name')].filter(n => /^(Italic|Underline|Letter case)/.test(n.textContent)).length }`)
check('one Style row per heading: case dropdown, Italic and Underline icon toggles', strip.toggles.join() === 'Italic+icon,Underline+icon' && strip.old === 0, J(strip))
check('letter case lists every option', J(strip.opts) === J(['normal', 'ALL CAPS', 'lowercase', 'Capitalize Each Word', 'Sentence case', 'small caps', 'all small caps']), strip.opts.join(' | '))
await goto('## Heading 2')
await s.ev(`__row(['Headings', 'H2'], 'Style').querySelector('.cz-toggle[aria-label=Italic]').click(); return 1`); await sleep(300)
check('Italic toggle on: H2 italic in Reading view and Live Preview', await reading(`return getComputedStyle(el.querySelector('h2')).fontStyle`) === 'italic' && await live(`return getComputedStyle(el.querySelector('.HyperMD-header-2')).fontStyle`) === 'italic')
check('the Italic toggle shows as pressed and the row as changed', await s.ev(`const r = __row(['Headings', 'H2'], 'Style'); return r.querySelector('.cz-toggle[aria-label=Italic]').classList.contains('is-active') && r.classList.contains('customizer-changed')`))
await s.ev(`__row(['Headings', 'H2'], 'Style').querySelector('.cz-toggle[aria-label=Italic]').click(); return 1`); await sleep(300)
check('Italic toggle off: H2 upright again', await reading(`return getComputedStyle(el.querySelector('h2')).fontStyle`) === 'normal')
await s.ev(`__row(['Headings', 'H2'], 'Style').scrollIntoView({ block: 'center' }); __row(['Headings', 'H2'], 'Style').querySelector('.cz-toggle[aria-label=Underline]').click(); return 1`); await sleep(200)
await s.shot('17-style-strip')
await s.ev(`__row(['Headings', 'H2'], 'Style').querySelector('.clickable-icon').click(); return 1`); await sleep(200)
check('the strip\'s reset arrow clears case, italic and underline', (await sheet()).trim() === '' && await s.ev(`return !__row(['Headings', 'H2'], 'Style').querySelector('.cz-toggle.is-active')`))
const caseWant = { 'ALL CAPS': ['uppercase', 'normal'], 'lowercase': ['lowercase', 'normal'], 'Capitalize Each Word': ['capitalize', 'normal'], 'Sentence case': ['lowercase', 'normal'], 'small caps': ['none', 'small-caps'], 'all small caps': ['none', 'all-small-caps'] }
for (const [opt, [tt, fv]] of Object.entries(caseWant)) {
  await s.ev(`__case(['Headings', 'H2'], ${J(opt)}); return 1`); await sleep(250)
  const rd = await reading(`const c = getComputedStyle(el.querySelector('h2')), f = getComputedStyle(el.querySelector('h2'), '::first-letter'); return [c.textTransform, c.fontVariantCaps, f.textTransform].join()`)
  const lp = await live(`const h = el.querySelector('.HyperMD-header-2'), c = getComputedStyle(h), f = getComputedStyle(h, '::first-letter'); return [c.textTransform, c.fontVariantCaps, f.textTransform].join()`)
  const first = opt === 'Sentence case' ? 'uppercase' : tt
  check(`letter case "${opt}" in Reading view and Live Preview`, rd === `${tt},${fv},${first}` && lp === rd, `${rd} / ${lp}`)
  if (opt === 'Sentence case') await shot('18-sentence-case')
}
await s.ev(`__row(['Headings', 'H2'], 'Style').querySelector('.clickable-icon').click(); return 1`); await sleep(200)
// numbering style removed (it only worked in Reading view)
check('"Numbering style" is gone', await s.ev(`return ![...document.querySelectorAll('.customizer .setting-item-name')].some(n => n.textContent.startsWith('Numbering style'))`))
// marker to text gaps: the marker moves, the text stays
const GAP = ['Lists', 'Marker to text gap']
const textLeft = `const textLeft = n => { const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, { acceptNode: t => /\\S/.test(t.data) && !t.parentElement.closest('.cm-formatting, .list-bullet, .collapse-indicator, .cm-fold-indicator, .task-list-label') ? 1 : 3 }), t = w.nextNode(), i = t.data.search(/\\S/), r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); return r.getBoundingClientRect().left };`
const probes = {
  bullet: ['## Bullet list', `const l = [...el.querySelectorAll('.HyperMD-list-line-1:not(.HyperMD-task-line)')].find(l => l.querySelector('.cm-formatting-list-ul')); return [l.querySelector('.list-bullet').getBoundingClientRect().left, textLeft(l)]`,
    `const li = el.querySelector('ul > li:not(.task-list-item)'); return [li.querySelector(':scope > .list-bullet').getBoundingClientRect().left, textLeft(li)]`],
  number: ['## Numbered list', `const l = [...el.querySelectorAll('.HyperMD-list-line-1')].find(l => l.querySelector('.cm-formatting-list-ol')); return [l.querySelector('.cm-formatting-list-ol').getBoundingClientRect().left, textLeft(l)]`,
    `const li = el.querySelector('ol > li'); return [null, textLeft(li), getComputedStyle(li).listStyleType, getComputedStyle(li, '::before').content]`],
  checkbox: ['## Checkboxes', `const l = el.querySelector('.HyperMD-list-line-1.HyperMD-task-line'); return [l.querySelector('.task-list-item-checkbox').getBoundingClientRect().left, textLeft(l)]`,
    `const li = el.querySelector('li.task-list-item'); return [li.querySelector('.task-list-item-checkbox').getBoundingClientRect().left, textLeft(li)]`],
}
const label = { bullet: 'Bullet to text', number: 'Number to text', checkbox: 'Checkbox to text' }
for (const [k, [h, lpJs, rdJs]] of Object.entries(probes)) {
  await goto(h)
  const lp0 = await live(textLeft + lpJs), rd0 = await reading(textLeft + rdJs)
  for (const g of [12, -4]) {
    await s.ev(`__slider(${J(GAP)}, ${J(label[k])}, ${g}); return 1`); await sleep(300)
    const lp1 = await live(textLeft + lpJs), rd1 = await reading(textLeft + rdJs)
    check(`${k} gap ${g}px, Live Preview: marker moves ${g}px, text stays`, Math.abs(lp0[0] - lp1[0] - g) < 1.5 && Math.abs(lp1[1] - lp0[1]) < 1, `marker ${lp0[0].toFixed(1)} -> ${lp1[0].toFixed(1)}, text ${lp0[1].toFixed(1)} -> ${lp1[1].toFixed(1)}`)
    if (k === 'number') check(`number gap ${g}px, Reading view: numbers redrawn beside the item, text stays`, rd1[2] === 'none' && /counter\(list-item\)/.test(rd1[3]) && Math.abs(rd1[1] - rd0[1]) < 1, J(rd1))
    else check(`${k} gap ${g}px, Reading view: marker moves ${g}px, text stays`, Math.abs(rd0[0] - rd1[0] - g) < 1.5 && Math.abs(rd1[1] - rd0[1]) < 1, `marker ${rd0[0].toFixed(1)} -> ${rd1[0].toFixed(1)}, text ${rd0[1].toFixed(1)} -> ${rd1[1].toFixed(1)}`)
  }
  await s.ev(`__slider(${J(GAP)}, ${J(label[k])}, 20); return 1`); await sleep(300); await shot(`19-gap-${k}`)
  await s.ev(`__reset(${J(GAP)}, ${J(label[k])}); return 1`); await sleep(200)
}
// the number color still reaches redrawn numbers
await goto('## Numbered list')
await s.ev(`__slider(${J(GAP)}, 'Number to text', 10); __color(['Lists', 'Marker colors'], 'Numbers only', '#ff0000'); return 1`); await sleep(300)
check('"Numbers only" color reaches the redrawn numbers', await reading(`return getComputedStyle(el.querySelector('ol > li'), '::before').color`) === 'rgb(255, 0, 0)')
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)
// palette tracks: one length
const widths = await s.ev(`return ['Hue', 'Saturation', 'Value', 'Contrast'].map(n => Math.round(__row(${J(PAL)}, n).querySelector('.cz-track').getBoundingClientRect().width))`)
check('Auto palette Hue, Saturation, Value and Contrast tracks are the same length', new Set(widths).size === 1, widths.join())
// slider knobs centred on their tracks, read from the rendered pixels
const knob = async (rowJs, name) => {
  const b = await s.ev(`const i = ${rowJs}; i.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300)); const b = i.getBoundingClientRect(); const f = (i.value - i.min) / (i.max - i.min); return { x: b.x - 6, y: b.y - 6, width: b.width + 12, height: b.height + 12, th: b.height, kx: 6 + 9 + f * (b.width - 18) }`)
  const { data } = await s.call('Page.captureScreenshot', { format: 'png', clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 2 } })
  const ys = await s.ev(`const img = new Image(); img.src = 'data:image/png;base64,${data}'; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data, rows = [], k = c.width / ${b.width}; for (let y = 0; y < c.height; y++) for (let i = Math.round((${b.kx} - 3) * k); i < Math.round((${b.kx} + 3) * k); i++) { const p = (y * c.width + i) * 4; if (d[p] > 225 && d[p + 1] > 225 && d[p + 2] > 225) { rows.push(y); break } } return [rows[0] / k, (rows[rows.length - 1] + 1) / k]`)
  const knobMid = (ys[0] + ys[1]) / 2, trackMid = 6 + b.th / 2
  check(`${name}: the knob is centred on the track`, Math.abs(knobMid - trackMid) <= 1, `knob centre ${knobMid.toFixed(2)}px, track centre ${trackMid}px`)
}
await s.ev(`__row(['Headings', 'H2'], 'Color').querySelector('.cz-swatch').click(); const h = __row(['Headings', 'H2'], 'Color').querySelector('input[aria-label=Hue]'); h.value = 180; h.dispatchEvent(new Event('input')); return 1`)
await knob(`__row(['Headings', 'H2'], 'Color').querySelector('input[aria-label=Hue]')`, 'color picker hue slider')
await s.shot('20-picker-knobs')
await s.ev(`__row(['Headings', 'H2'], 'Color').querySelector('.cz-swatch').click(); return 1`)
await knob(`__row(${J(PAL)}, 'Hue').querySelector('.cz-track')`, 'Auto palette hue slider')
await s.shot('21-palette-tracks')
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)

// --- M7: notes round 4
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)
// tooltips: the whole name area, after a short pause, normal mouse pointer
const info = await s.ev(`const r = __row(['Headings', 'H1'], 'Weight'), i = r.querySelector('.setting-item-info'); i.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 200))
  const b = i.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(r.querySelector('.setting-item-name')); const n = rg.getBoundingClientRect()
  return { x: n.right + (b.right - n.right) / 2, y: b.y + b.height / 2, cursor: getComputedStyle(r.querySelector('.setting-item-name')).cursor, wide: b.right - n.right }`)
check('tooltips: normal mouse pointer, no question mark', info.cursor !== 'help', info.cursor)
await s.call('Page.bringToFront'); await s.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 }); await sleep(300)
await s.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: info.x, y: info.y }); await sleep(600)
const quick = await s.ev(`return document.querySelector('.tooltip')?.textContent ?? ''`)
check('tooltip shows within 0.6 s, also beside the name text', info.wide > 40 && /thick/.test(quick), `${Math.round(info.wide)}px beside the name: "${quick}"`)
await s.shot('22-tooltip-quick')
await s.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 }); await sleep(500)
const gone = await s.ev(`const t = document.querySelector('.tooltip'); return !t || getComputedStyle(t).display === 'none' || t.classList.contains('mod-hidden')`)
check('tooltip goes away when the mouse leaves', gone)

// link and tag boxes in Text & links
const kids = sub => s.ev(`const d = [...document.querySelectorAll('.customizer details details')].find(x => x.querySelector(':scope > summary').textContent === ${JSON.stringify(sub)})
  return d ? [...d.querySelectorAll(':scope > .setting-item .setting-item-name')].map(n => n.textContent.replace('experimental', '').trim()).join('|') : 'missing'`)
check('Links box: 8 link colors (note and web; normal, hover, visited, visited hover) and Forget', await kids('Links') === 'Note link|Note link, hover|Note link, visited|Note link, visited, hover|Web link|Web link, hover|Web link, visited|Web link, visited, hover|Forget visited links', await kids('Links'))
check('Tags box: text and background, normal and hover', await kids('Tags') === 'Tag text|Tag text, hover|Tag background|Tag background, hover', await kids('Tags'))
check('no link or tag rows left loose in Text & links', await s.ev(`const d = [...document.querySelectorAll('.customizer details.cz-main')].find(x => x.querySelector(':scope > summary').textContent === 'Text & links'); return [...d.querySelectorAll(':scope > .setting-item .setting-item-name')].filter(n => /link|tag/i.test(n.textContent)).length`) === 0)
await s.ev(`__row(['Text & links', 'Links'], 'Note link').scrollIntoView({ block: 'start' }); return 1`); await s.shot('23-link-tag-boxes')

// text color: body text only, headings keep their color
await goto('## Text', 2)
await s.ev(`__color(['Text & links'], 'Text color (reading', '#00ffff'); return 1`); await sleep(300)
const cyan = 'rgb(0, 255, 255)'
check('text color: Reading view paragraph changes', await reading(`return getComputedStyle(el.querySelector('p')).color`) === cyan)
check('text color: Reading view headings keep their color', await reading(`return getComputedStyle(el.querySelector('h2')).color`) !== cyan, await reading(`return getComputedStyle(el.querySelector('h2')).color`))
check('text color: Live Preview text changes', await live(`return getComputedStyle(el.querySelector('.cm-line:not(.HyperMD-header)')).color`) === cyan)
check('text color: Live Preview headings keep their color', await live(`return getComputedStyle(el.querySelector('.HyperMD-header-2')).color`) !== cyan)
await s.ev(`__color(['Headings', 'H2'], 'Color', '#ff0000'); return 1`); await sleep(300)
check('text color: a heading color still applies on top', await reading(`return getComputedStyle(el.querySelector('h2')).color`) === 'rgb(255, 0, 0)' && await live(`return getComputedStyle(el.querySelector('.HyperMD-header-2')).color`) === 'rgb(255, 0, 0)')
await goto('# Heading 1')
check('text color: note title keeps its color', await live(`return getComputedStyle(el.querySelector('.inline-title')).color`) !== cyan)
await shot('24-text-color-headings')
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)

// visited links
await ev(`window.__open = window.open; window.open = () => null; return 1`) // a web link click must not start the browser
await goto('## Links and tags')
await s.ev(`[...document.querySelectorAll('.setting-item')].find(r => r.textContent.startsWith('Forget visited links')).querySelector('button').click(); return 1`); await sleep(300)
check('Forget visited links empties the list', await ev(`return app.plugins.plugins.stylemate.settings.visited.length`) === 0)
const V = [['Note link, visited', '#00ff00'], ['Note link, visited, hover', '#ffff00'], ['Web link, visited', '#ff8800'], ['Web link, visited, hover', '#ff00ff']]
for (const [l, c] of V) await s.ev(`__color(['Text & links', 'Links'], ${JSON.stringify(l)}, '${c}'); return 1`)
await sleep(300)
const rdColor = q => reading(`return getComputedStyle(el.querySelector(${JSON.stringify(q)})).color`)
check('not visited yet: note link keeps the link color', await rdColor('a.internal-link[data-href="StyleMate Preview"]') !== 'rgb(0, 255, 0)')
await ev(`app.workspace.trigger('file-open', app.vault.getFileByPath('StyleMate Preview.md')); return 1`); await sleep(400)
check('opening a note marks links to it visited (Reading view)', await rdColor('a.internal-link[data-href="StyleMate Preview"]') === 'rgb(0, 255, 0)')
check('visited note link (Live Preview)', await live(`return getComputedStyle(el.querySelector('.cz-vi')).color`) === 'rgb(0, 255, 0)')
check('a note never opened stays unvisited', await rdColor('a.internal-link.is-unresolved') !== 'rgb(0, 255, 0)')
await reading(`el.querySelector('a.external-link').click(); return 1`); await sleep(300)
check('clicking a web link (Reading view) marks it visited', await rdColor('a.external-link[href="https://obsidian.md"]') === 'rgb(255, 136, 0)' && await live(`return [...el.querySelectorAll('.cz-ve')].some(e => getComputedStyle(e).color === 'rgb(255, 136, 0)')`))
check('the other web link is not visited', await rdColor('a.external-link[href="https://help.obsidian.md"]') !== 'rgb(255, 136, 0)')
await live(`[...el.querySelectorAll('.cm-url')].find(e => e.textContent.includes('help.obsidian')).dispatchEvent(new MouseEvent('click', { bubbles: true })); return 1`); await sleep(300)
check('clicking a web link (Live Preview) marks it visited', await rdColor('a.external-link[href="https://help.obsidian.md"]') === 'rgb(255, 136, 0)')
// hover: DevTools forces :hover on the link (a synthetic mouse does not reach the main window while Settings is open;
// checked by hand with a real mouse)
await call('DOM.enable'); await call('CSS.enable')
const hover = async q => {
  await reading(`document.querySelectorAll('.cz-hovertest').forEach(e => e.classList.remove('cz-hovertest')); el.querySelector(${JSON.stringify(q)}).classList.add('cz-hovertest'); return 1`)
  const { root } = await call('DOM.getDocument', { depth: -1 }), { nodeId } = await call('DOM.querySelector', { nodeId: root.nodeId, selector: '.cz-hovertest' })
  await call('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] }); await sleep(200)
  const c = await rdColor('.cz-hovertest'); await call('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }); return c
}
check('visited note link, hover color', await hover('a.internal-link.cz-vi') === 'rgb(255, 255, 0)')
check('visited web link, hover color', await hover('a.external-link.cz-ve') === 'rgb(255, 0, 255)')
await shot('25-visited-links')
await s.ev(`[...document.querySelectorAll('.setting-item')].find(r => r.textContent.startsWith('Forget visited links')).querySelector('button').click(); return 1`); await sleep(300)
check('Forget clears the visited colors', await rdColor('a.external-link[href="https://obsidian.md"]') !== 'rgb(255, 136, 0)' && await live(`return el.querySelectorAll('.cz-vi, .cz-ve').length`) === 0)
await ev(`window.open = window.__open; return 1`)
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)

// every control: set it from the real settings window, see CSS appear and parse, reset it, see the CSS go
await s.ev(`${RESET_ALL}; return 1`); await sleep(300)
await s.ev(`window.__rows = [...document.querySelectorAll('.customizer details > .setting-item')].filter(r => !r.closest('details').querySelector(':scope > summary').textContent.startsWith('Auto palette') && r.querySelector('input[type=range], select, input[type=text], .cz-swatch'))
  window.__sweepSet = i => {
    const r = __rows[i], rg = r.querySelector('input[type=range]'), se = r.querySelector('select'), tx = r.querySelector('input[type=text]')
    if (rg) { const mn = +rg.min, mx = +rg.max, st = +rg.step || 1; let v = mn + Math.round((mx - mn) / 2 / st) * st; if (String(v) === rg.value) v = mx; rg.value = v; rg.dispatchEvent(new Event('input', { bubbles: true })) }
    else if (se) { se.value = [...se.options].find(o => o.value !== se.value).value; se.dispatchEvent(new Event('change', { bubbles: true })); r.querySelectorAll('.cz-toggle').forEach(t => t.click()) }
    else if (tx) { tx.value = 'Inter'; tx.dispatchEvent(new Event('input', { bubbles: true })) }
    else { if (!r.querySelector('.cz-pop')) r.querySelector('.cz-swatch').click(); const h = r.querySelector('.cz-hex'); h.value = '#123456'; h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); r.querySelector('.cz-swatch').click() }
  }
  window.__sweepState = i => __rows[i].classList.contains('customizer-changed')
  window.__sweepReset = i => __rows[i].querySelector('.clickable-icon').click()
  return __rows.length`)
const rows = await s.ev(`return __rows.map((r, i) => r.querySelector('.setting-item-name').textContent.replace('experimental', '').trim())`)
const bad = []
for (const [i, name] of rows.entries()) {
  await s.ev(`__sweepSet(${i}); return 1`); await sleep(50)
  const css = await sheet(), kept = await ev(`const sh = new CSSStyleSheet(); sh.replaceSync(app.plugins.plugins.stylemate.css); return sh.cssRules.length`)
  if (!await s.ev(`return __sweepState(${i})`)) bad.push(`${name}: not marked changed`)
  if (!css.trim()) bad.push(`${name}: no CSS`)
  else if (kept !== css.split('\n').length) bad.push(`${name}: ${css.split('\n').length - kept} rule(s) the browser rejected`)
  await s.ev(`__sweepReset(${i}); return 1`); await sleep(50)
  if ((await sheet()).trim() !== '' || await s.ev(`return __sweepState(${i})`)) bad.push(`${name}: reset did not clear`)
}
check(`every control works: set, CSS appears and parses, reset clears (${rows.length} controls)`, bad.length === 0 && rows.length > 100, bad.join('; '))

// master switch
await s.ev(`__slider(['Checkboxes'], 'Size', 26); return 1`); await sleep(300)
await s.ev(`const t = [...document.querySelectorAll('.setting-item')].find(r => r.textContent.startsWith('Enable StyleMate')).querySelector('.checkbox-container'); t.click(); return 1`); await sleep(200)
check('Enable off: all overrides gone', (await sheet()).trim() === '' && await bodyVar('--checkbox-size') !== '26px')
await s.ev(`document.querySelector('.setting-item .checkbox-container').click(); return 1`); await sleep(200)
check('Enable on: overrides back', await bodyVar('--checkbox-size') === '26px')
await s.ev(`[...document.querySelectorAll('.setting-item button')].find(b => b.textContent === 'Reset all').click(); return 1`); await sleep(200)
check('Reset all clears everything', (await sheet()).trim() === '')
await shot('05-reset')
done()
