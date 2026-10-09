// M16 live checks: Preferences cards (About card, top settings and each main group as a larger card with row cards inside,
// Reset on the big card), no divider lines, no ribbon button. `npm run build` first, then `node test/obsidian/m16.mjs`.
import { check, done, ev, openSettings } from './drive.mjs'

check('no ribbon button for the sample note', await ev(`return !document.querySelector('.side-dock-ribbon-action[aria-label="StyleMate: open sample note"]')`))
check('Open sample note command still there', await ev(`return !!app.commands.commands['stylemate:open-preview']`))
const s = await openSettings(), none = 'rgba(0, 0, 0, 0)'
const r = await s.ev(`const bg = e => getComputedStyle(e).backgroundColor, none = 'rgba(0, 0, 0, 0)', page = document.querySelector('.customizer')
  const card = cls => document.querySelector('.customizer .' + cls + ' > .setting-items')
  const about = card('cz-about-group'), top = card('cz-cards'), mains = [...document.querySelectorAll('.customizer details.cz-main')]
  mains.forEach(d => d.open = true)
  const row = top.querySelector(':scope > .setting-item'), inner = mains[0].querySelector('.setting-item:not(.cz-reset-row)'), reset = mains.map(d => d.querySelector(':scope > .cz-reset-row'))
  const lines = [about.parentElement, ...document.querySelectorAll('.customizer .setting-item, .customizer-about')].filter(e => { const c = getComputedStyle(e), b = getComputedStyle(e, '::before')
    return parseFloat(c.borderTopWidth) || parseFloat(c.borderBottomWidth) || (b.content !== 'none' && parseFloat(b.borderTopWidth)) }).length
  return { page: bg(page), about: bg(about), top: bg(top), mains: mains.map(d => bg(d.closest('.setting-items'))), row: bg(row), inner: bg(inner), radius: getComputedStyle(row).borderRadius,
    resets: reset.map(e => e && bg(e)), aboutInCard: about.contains(document.querySelector('.customizer-about')), lines, groups: mains.length }`)
check('About sits in its own card', r.aboutInCard && r.about !== none && r.about !== r.page, `${r.about} on ${r.page}`)
check('top settings share one larger card', r.top === r.about, r.top)
check('each main group is one larger card', r.groups >= 6 && r.mains.every(c => c === r.about), `${r.groups} groups`)
check('rows are cards inside the larger card', r.row !== none && r.row !== r.top && r.inner === r.row && r.radius !== '0px', `${r.row} ${r.radius}`)
check('Reset buttons sit on the big card, no card of their own', r.resets.every(c => c === none), JSON.stringify(r.resets))
check('no divider lines', r.lines === 0, `${r.lines} found`)
await s.shot('m16-cards')
done()
