import { hexToHsl, hslToHex } from './color'

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v))

// Move every color by the same amount (hue in degrees, saturation and brightness in points), each keeping its own character.
export const shiftColors = (hexes: string[], dh: number, ds: number, dl: number) =>
  hexes.map(x => { const [h, s, l] = hexToHsl(x); return hslToHex((h + dh + 360) % 360, clamp(s + ds), clamp(l + dl)) })

const arc = (from: number, to: number) => ((to - from + 540) % 360) - 180 // shortest signed hue distance

// Six colors from `start` (H1) to `end` (H6), blended in HSL along the shorter way round the hue wheel.
export function gradient(start: string, end: string): string[] {
  const [h1, s1, l1] = hexToHsl(start), [h2, s2, l2] = hexToHsl(end)
  return [0, 1, 2, 3, 4, 5].map(i => { const t = i / 5; return hslToHex((h1 + arc(h1, h2) * t + 360) % 360, s1 + (s2 - s1) * t, l1 + (l2 - l1) * t) })
}

// Contrast -50..50 widens (+) or narrows (-) the range: every color's distance from the gradient's middle is scaled by 1 + c/50.
export function contrast(hexes: string[], c: number): string[] {
  if (!c) return hexes // HSL rounding would drift the colors a little
  const k = 1 + c / 50, hsl = hexes.map(hexToHsl)
  const d = hsl.map(x => arc(hsl[0][0], x[0])), mid = [d.reduce((a, b) => a + b) / 6, hsl.reduce((a, x) => a + x[1], 0) / 6, hsl.reduce((a, x) => a + x[2], 0) / 6]
  return hsl.map((x, i) => hslToHex((hsl[0][0] + mid[0] + (d[i] - mid[0]) * k + 720) % 360, clamp(mid[1] + (x[1] - mid[1]) * k), clamp(mid[2] + (x[2] - mid[2]) * k)))
}
