import { describe, expect, it } from 'vitest'
import { hexToHsl } from '../../src/core/color'
import { shiftColors } from '../../src/core/palette'

describe('shiftColors', () => {
  it('moves hue and keeps each color distinct', () => {
    const out = shiftColors(['#FF0000', '#00FF00'], 120, 0, 0)
    expect(out).toEqual(['#00FF00', '#0000FF'])
  })
  it('zero shift changes nothing', () => expect(shiftColors(['#FF0000', '#808080'], 0, 0, 0)).toEqual(['#FF0000', '#808080']))
})

import { contrast, gradient } from '../../src/core/palette'
describe('gradient and contrast', () => {
  it('runs from the start to the end color in six steps', () => {
    const g = gradient('#FF0000', '#0000FF')
    expect(g).toHaveLength(6); expect(g[0]).toBe('#FF0000'); expect(g[5]).toBe('#0000FF')
    expect(hexToHsl(g[1])[0]).toBeGreaterThan(280) // red -> blue the short way, through magenta, not green
  })
  it('contrast widens and narrows the lightness range, 0 changes nothing', () => {
    const g = gradient('#FFD000', '#5A5A9A'), span = (a: string[]) => Math.abs(hexToHsl(a[0])[2] - hexToHsl(a[5])[2])
    expect(contrast(g, 0)).toEqual(g)
    expect(span(contrast(g, 30))).toBeGreaterThan(span(g))
    expect(span(contrast(g, -30))).toBeLessThan(span(g))
  })
})
