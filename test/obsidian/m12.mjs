// M12 live checks: number boxes, Shift+arrow, boxes past the slider, capital headers. `npm run build` first, then `node test/obsidian/m12.mjs`.
import { check, done, ev, openSettings, sleep } from './drive.mjs'

await ev(`const p = app.plugins.plugins.stylemate; p.saveData = async () => {}; p.settings.values = {}; p.settings.enabled = true; p.apply(); return 1`)
console.log('StyleMate', await ev(`return app.plugins.plugins.stylemate.manifest.version`))
const s = await openSettings()
await s.ev(`document.querySelectorAll('.customizer details').forEach(d => d.open = true); return 1`); await sleep(300)

check('main headers are capitals', await s.ev(`return [...document.querySelectorAll('.customizer details.cz-main > summary')].every(e => getComputedStyle(e).textTransform === 'uppercase')`))
check('six main headers', await s.ev(`return document.querySelectorAll('.customizer details.cz-main').length`) === 6)
check('sub boxes stay as typed', await s.ev(`return [...document.querySelectorAll('.customizer details:not(.cz-main) > summary')].every(e => getComputedStyle(e).textTransform === 'none')`))
check('every slider has a number box', await s.ev(`return document.querySelectorAll('.customizer input[type=range].cz-track').length >= 0 && [...document.querySelectorAll('.customizer .setting-item')].filter(r => r.querySelector('input[type=range]:not(.cz-track)')).every(r => r.querySelector('input.cz-num'))`))

// Row helpers: the "Text size" row (Page group), 10-32px step 1, box up to 64.
const row = `[...document.querySelectorAll('.customizer .setting-item')].find(r => r.querySelector('.setting-item-name')?.textContent.startsWith('Text size'))`
const val = () => ev(`return app.plugins.plugins.stylemate.settings.values['font-size']`)
await s.ev(`const r = ${row}, b = r.querySelector('input.cz-num'); b.focus(); b.value = '20'; b.dispatchEvent(new Event('input', { bubbles: true })); return 1`)
check('typing 20 applies 20', await val() === 20, await val())
check('slider follows the box', await s.ev(`return ${row}.querySelector('input[type=range]').value`) === '20')
await s.ev(`const r = ${row}, b = r.querySelector('input.cz-num'); b.value = '50'; b.dispatchEvent(new Event('input', { bubbles: true })); b.dispatchEvent(new Event('change', { bubbles: true })); return 1`)
check('box goes past the slider max (50 > 32)', await val() === 50, await val())
check('slider parks at its end', await s.ev(`return ${row}.querySelector('input[type=range]').value`) === '32')
await s.ev(`const r = ${row}, b = r.querySelector('input.cz-num'); b.value = '500'; b.dispatchEvent(new Event('change', { bubbles: true })); return 1`)
check('box stops at twice the max (64)', await val() === 64, await val())
const key = (sel, k) => s.ev(`const r = ${row}, e = r.querySelector('${sel}'); e.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', shiftKey: true, bubbles: true, cancelable: true })); return 1`)
await s.ev(`const r = ${row}, b = r.querySelector('input.cz-num'); b.value = '20'; b.dispatchEvent(new Event('change', { bubbles: true })); return 1`)
await key('input.cz-num', 'ArrowUp')
check('Shift+Up on the box adds 10 steps', await val() === 30, await val())
await key('input[type=range]', 'ArrowDown')
check('Shift+Down on the slider takes 10 steps', await val() === 20, await val())
check('box shows the slider move', await s.ev(`return ${row}.querySelector('input.cz-num').value`) === '20')
// Reset puts both back
await s.ev(`${row}.querySelector('.extra-setting-button, .clickable-icon').click(); return 1`); await sleep(200)
check('reset clears the value', await val() === undefined, await val())
await s.ev(`const r = ${row}; r.scrollIntoView({ block: 'center' }); return 1`); await sleep(200)
await s.shot('m12-number-box')
await s.ev(`document.querySelectorAll('.customizer details').forEach(d => d.open = false); document.querySelector('.customizer details.cz-main').scrollIntoView({ block: 'start' }); return 1`); await sleep(200)
await s.shot('m12-headers')
await ev(`const p = app.plugins.plugins.stylemate; p.settings.values = {}; p.apply(); return 1`)
done()
