import { setIcon, type Setting } from 'obsidian'
import { hexToHsl, hslToHex, type Hsl } from './core/color'

const MAX = [360, 100, 100], NAMES = ['Hue', 'Saturation', 'Lightness']
export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v)

// A slider drawn like the color picker's (a gradient track showing what each position gives), with its value beside it.
// `setBackground` repaints the track (it can depend on other sliders); `set` moves it without reporting a change.
export function addTrackSlider(s: Setting, min: number, max: number, step: number, onInput: (v: number) => void, background = '') {
  s.controlEl.addClass('cz-slider')
  const input = s.controlEl.createEl('input', { type: 'range', cls: 'cz-track' })
  input.min = String(min); input.max = String(max); input.step = String(step); input.value = '0'
  const out = s.controlEl.createSpan({ cls: 'cz-value', text: '0' })
  input.style.setProperty('background', background)
  input.addEventListener('input', () => { out.setText(input.value); onInput(Number(input.value)) }) // live while dragging
  return {
    input,
    set(v: number) { input.value = String(v); out.setText(String(v)) },
    setBackground(b: string) { input.style.setProperty('background', b) },
  }
}

// The picker the other plugins use: a swatch button opens a popover with hue, saturation and lightness sliders over tracks that show
// what each would give, a hex field and a Reset button (back to the color it opened with). Every change applies at once, while dragging.
// Returns `set`, which closes the popover and repaints the swatch without reporting a change (reset arrow, switching theme).
export function addColorPicker(s: Setting, onChange: (hex: string) => void) {
  s.controlEl.addClass('cz-color')
  let value = '#808080' // what the picker opens on when the setting has no color of its own
  let swatch!: HTMLElement, closePop = () => {}
  s.addButton(b => {
    swatch = b.buttonEl
    swatch.addClass('cz-swatch')
    swatch.setAttribute('aria-label', 'Pick a color')
    const doc = swatch.ownerDocument
    let pop: HTMLElement | null = null

    const close = () => {
      pop?.remove(); pop = null
      doc.removeEventListener('mousedown', outside, true); doc.removeEventListener('keydown', esc, true)
    }
    const outside = (e: MouseEvent) => { if (pop && !pop.contains(e.target as Node) && !swatch.contains(e.target as Node)) close() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    closePop = close

    const open = () => {
      pop = s.controlEl.createDiv({ cls: 'cz-pop' })
      const box = pop.createDiv({ cls: 'cz-hsl' })
      let hsl: Hsl = hexToHsl(value)
      const first = value // what Reset goes back to
      const sliders = NAMES.map((name, i) => {
        const r = box.createEl('input', { type: 'range', cls: 'cz-track' })
        r.min = '0'; r.max = String(MAX[i]); r.setAttribute('aria-label', name)
        r.addEventListener('input', () => { hsl[i] = Number(r.value); apply(hslToHex(...hsl)) })
        return r
      })
      const row = box.createDiv({ cls: 'cz-row' })
      const preview = row.createSpan({ cls: 'cz-swatch' })
      const hexBox = row.createEl('input', { type: 'text', cls: 'cz-hex' })
      hexBox.setAttribute('aria-label', 'Hex color')
      const commitTyped = () => {
        const v = '#' + hexBox.value.trim().replace(/^#/, '').toUpperCase()
        if (isHex(v)) { hsl = hexToHsl(v); apply(v) } else hexBox.value = value
      }
      hexBox.addEventListener('blur', commitTyped)
      hexBox.addEventListener('keydown', e => { if (e.key === 'Enter') commitTyped() })
      const reset = row.createEl('button', { cls: 'cz-reset' })
      reset.setAttribute('aria-label', 'Back to the color before')
      setIcon(reset, 'rotate-ccw')
      reset.addEventListener('click', () => { hsl = hexToHsl(first); apply(first) })
      const paint = (hex: string) => {
        value = hex
        const [h, sat, l] = hsl
        swatch.removeClass('cz-none'); swatch.style.setProperty('background', hex)
        preview.style.setProperty('background', hex)
        hexBox.value = hex
        const tracks = [
          `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map(d => `hsl(${d} 100% 50%)`).join(', ')})`,
          `linear-gradient(to right, hsl(${h} 0% ${l}%), hsl(${h} 100% ${l}%))`,
          `linear-gradient(to right, hsl(${h} ${sat}% 0%), hsl(${h} ${sat}% 50%), hsl(${h} ${sat}% 100%))`,
        ]
        sliders.forEach((r, i) => { r.value = String(hsl[i]); r.style.setProperty('background', tracks[i]) })
      }
      const apply = (hex: string) => { paint(hex); onChange(hex) }
      paint(value) // show the current color without reporting a change
      doc.addEventListener('mousedown', outside, true); doc.addEventListener('keydown', esc, true)
    }
    b.onClick(() => (pop ? close() : open()))
  })
  return {
    // A color, or '' for "no color" (transparent default): the swatch shows a checkerboard, and the picker opens on gray.
    set(hex: string) {
      closePop()
      value = isHex(hex) ? hex : '#808080'
      swatch.toggleClass('cz-none', !isHex(hex))
      swatch.style.setProperty('background', isHex(hex) ? value : '')
    },
  }
}
