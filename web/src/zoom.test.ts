import { describe, expect, it } from 'vitest'
import { anchorShift, clampZoom, pinchZoom, wheelZoom } from './zoom'

describe('clampZoom', () => {
  it('never goes below 1x', () => expect(clampZoom(0.5, 1440)).toBe(1))
  it('stops where the page reaches 3200px', () => {
    expect(clampZoom(10, 1440) * 1440).toBeCloseTo(3200)
    expect(clampZoom(10, 1600)).toBe(2)
    expect(clampZoom(1.5, 1600)).toBe(1.5)
  })
})

describe('wheelZoom', () => {
  it('zooms in on wheel up and out on wheel down', () => {
    expect(wheelZoom(1.5, -100, 0, 1440)).toBeGreaterThan(1.5)
    expect(wheelZoom(1.5, 100, 0, 1440)).toBeLessThan(1.5)
  })
  it('scales in proportion to deltaY, so small trackpad steps add up to one wheel notch', () => {
    let z = 1
    for (let i = 0; i < 10; i++) z = wheelZoom(z, -10, 0, 1440)
    expect(z).toBeCloseTo(wheelZoom(1, -100, 0, 1440))
  })
  it('reads line deltas as several pixels', () => {
    expect(wheelZoom(1, -3, 1, 1440)).toBeGreaterThan(wheelZoom(1, -3, 0, 1440))
  })
  it('stays within 1x..max', () => {
    expect(wheelZoom(1, 5000, 0, 1440)).toBe(1)
    expect(wheelZoom(2, -5000, 0, 1600)).toBe(2)
  })
})

describe('pinchZoom', () => {
  it('follows the change in finger distance', () => expect(pinchZoom(1.5, 100, 200, 390)).toBe(3))
  it('stays within 1x..max', () => {
    expect(pinchZoom(1, 200, 100, 390)).toBe(1)
    expect(pinchZoom(1, 100, 10000, 390) * 390).toBeCloseTo(3200)
  })
})

describe('anchorShift', () => {
  it('scrolls so the point under the cursor stays put', () => {
    const before = { left: 0, top: 52, width: 1440, height: 2038 }
    const after = { left: 0, top: 52, width: 2880, height: 4076 }
    const { dx, dy } = anchorShift(before, after, 700, 400)
    // The point 700/1440 across now sits at 1400 on screen; scrolling by dx brings it back to 700.
    expect(after.left + (700 / 1440) * after.width - dx).toBeCloseTo(700)
    expect(after.top + ((400 - 52) / 2038) * after.height - dy).toBeCloseTo(400)
  })
  it('does nothing when the size did not change', () => {
    const r = { left: 10, top: 20, width: 300, height: 400 }
    const { dx, dy } = anchorShift(r, r, 50, 60)
    expect(dx).toBeCloseTo(0)
    expect(dy).toBeCloseTo(0)
  })
})
