/** Widest a page may get: twice its 1600px source. */
export const MAX_WIDTH = 3200

type Rect = { left: number; top: number; width: number; height: number }

/** Zoom factor over the fit width (1x), kept between 1x and the page reaching MAX_WIDTH. */
export const clampZoom = (zoom: number, fitWidth: number) => Math.min(Math.max(zoom, 1), Math.max(1, MAX_WIDTH / fitWidth))

// deltaMode 0 pixels, 1 lines, 2 pages; one 100px wheel notch zooms by about 22%.
const WHEEL_PX = [1, 33, 800]
export const wheelZoom = (zoom: number, deltaY: number, deltaMode: number, fitWidth: number) =>
  clampZoom(zoom * Math.exp((-deltaY * (WHEEL_PX[deltaMode] ?? 1)) / 500), fitWidth)

export const pinchZoom = (startZoom: number, startDistance: number, distance: number, fitWidth: number) =>
  clampZoom((startZoom * distance) / startDistance, fitWidth)

/** Scroll change that puts the image point under (x, y) back under it after the image went from `before` to `after`. */
export function anchorShift(before: Rect, after: Rect, x: number, y: number) {
  return {
    dx: after.left + ((x - before.left) / before.width) * after.width - x,
    dy: after.top + ((y - before.top) / before.height) * after.height - y,
  }
}
