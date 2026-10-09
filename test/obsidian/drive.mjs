// Drives a real Obsidian over the DevTools protocol (same approach as MindmapMate/LevelMate): launch, trust, enable StyleMate, ev(), shot(), check().
// `npm run build` first. Imported by check.mjs. Own profile on ../test-vault (port 9336); the user's Obsidian is untouched.
// Obsidian 1.13 opens Settings in its own window, so `settings` is a second connection to that window.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

export const PORT = Number(process.env.PORT ?? 9336), VAULT = resolve(process.env.VAULT ?? '../test-vault'), profile = `${tmpdir()}/stylemate-obsidian-profile-${PORT}`, SHOTS = process.env.SHOTS ?? tmpdir()
export const sleep = ms => new Promise(r => setTimeout(r, ms))
const targets = async () => (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).filter(t => t.type === 'page')
const mainTarget = async () => (await targets()).find(t => t.title && !t.title.startsWith('Settings')) // untitled: a hidden Export to PDF window
try { if (!(await mainTarget())) throw 0 } catch {
  mkdirSync(profile, { recursive: true })
  writeFileSync(`${profile}/obsidian.json`, JSON.stringify({ vaults: { customizertest01: { path: VAULT, ts: 1, open: true } }, updateDisabled: true }))
  spawn('obsidian', [`--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`], { detached: true, stdio: 'ignore' }).unref()
  for (let i = 0; i < 60; i++) { try { if (await mainTarget()) break } catch { /* starting */ } await sleep(500) }
}

export async function connect(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise(r => ws.onopen = r)
  let seq = 0
  const call = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq
    ws.addEventListener('message', function h(e) { const m = JSON.parse(e.data); if (m.id !== id) return; ws.removeEventListener('message', h); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result) })
    ws.send(JSON.stringify({ id, method, params }))
  })
  const ev = async src => {
    const r = await call('Runtime.evaluate', { expression: `(async () => { ${src} })()`, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  const shot = async name => { const r = await call('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('shot', `${SHOTS}/${name}.png`) }
  return { ws, call, ev, shot }
}

export const main = await connect(await mainTarget())
export const { call, ev, shot } = main
export let failed = 0
export const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? `  (${detail})` : ''}`) }
export const done = () => { console.log(failed ? `${failed} FAILED` : 'all passed'); process.exit(failed ? 1 : 0) }

await sleep(1500)
await ev(`[...document.querySelectorAll('.modal button')].find(b => b.textContent.includes('Trust'))?.click()
  await new Promise(r => setTimeout(r, 300)); await app.plugins.setEnable(true)
  await app.plugins.disablePlugin('stylemate'); await app.plugins.loadManifests(); await app.plugins.enablePlugin('stylemate'); await new Promise(r => setTimeout(r, 500)); return 1`)

// Open the plugin's settings tab and connect to the settings window.
export async function openSettings() {
  await ev(`app.setting.open(); app.setting.openTabById('stylemate'); return 1`)
  let t
  for (let i = 0; i < 40 && !t; i++) { await sleep(250); t = (await targets()).find(x => x.title.startsWith('Settings')) }
  if (!t) throw new Error('settings window not found')
  const s = await connect(t)
  await sleep(500)
  // helpers living in the settings window
  await s.ev(`window.__row = (path, label) => {
      let box = document.querySelector('.customizer'), first = true
      for (const p of path) { const d = [...box.querySelectorAll(first ? 'details.cz-main' : ':scope > details')].find(x => x.querySelector(':scope > summary').textContent === p); first = false; d.open = true; box = d }
      return [...box.querySelectorAll(':scope > .setting-item')].find(r => r.querySelector('.setting-item-name').textContent.startsWith(label))
    }
    window.__slider = (path, label, v) => { const i = __row(path, label).querySelector('input[type=range]'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })) }
    window.__color = (path, label, v) => { // the in-app picker: open the popover, type a hex, Enter
      const r = __row(path, label); if (!r.querySelector('.cz-pop')) r.querySelector('.cz-swatch').click()
      const h = r.querySelector('.cz-hex'); h.value = v; h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); r.querySelector('.cz-swatch').click()
    }
    window.__hue = (path, label, v) => { // drag the hue slider with the popover left open
      const r = __row(path, label); if (!r.querySelector('.cz-pop')) r.querySelector('.cz-swatch').click()
      const i = r.querySelector('input[aria-label=Hue]'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true }))
    }
    window.__case = (path, v) => { const i = __row(path, 'Style').querySelector('select'); i.value = v; i.dispatchEvent(new Event('change')) }
    window.__reset = (path, label) => __row(path, label).querySelector('.clickable-icon').click()
    return 1`)
  return s
}
