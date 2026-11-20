import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { pageAlt, pageSrc } from './book'
import { anchorShift, clampZoom, pinchZoom, wheelZoom } from './zoom'

const STEP = 1.25

/** The 크게 보기 overlay: pages at fit width (1x) up to 3200px wide, zoomed about the cursor or fingers. */
export default function ZoomView({ pages, onClose }: { pages: number[]; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const zoom = useRef(1)
  const [percent, setPercent] = useState(100)

  const fitWidth = () => Math.min(scroller.current!.clientWidth, 1600)

  /** Set the zoom, keeping the page point under (x, y) where it is on screen. */
  const zoomTo = (next: number, x: number, y: number) => {
    const el = scroller.current!
    next = clampZoom(next, fitWidth())
    if (next === zoom.current) return
    const imgs = [...el.querySelectorAll('img')]
    const distance = (img: HTMLImageElement) => { const r = img.getBoundingClientRect(); return Math.max(r.top - y, y - r.bottom, 0) }
    const img = imgs.reduce((a, b) => (distance(b) < distance(a) ? b : a))
    const before = img.getBoundingClientRect()
    zoom.current = next
    el.style.setProperty('--zoom', String(next))
    const { dx, dy } = anchorShift(before, img.getBoundingClientRect(), x, y)
    el.scrollLeft += dx
    el.scrollTop += dy
    setPercent(Math.round(next * 100))
  }
  const zoomAtCenter = (next: number) => {
    const r = scroller.current!.getBoundingClientRect()
    zoomTo(next, r.left + r.width / 2, r.top + r.height / 2)
  }

  // Native, non-passive listeners: React's wheel and touch handlers are passive and cannot stop the browser's own zoom.
  useEffect(() => {
    const el = root.current!
    let pinch: { distance: number; zoom: number; span: number } | null = null
    const span = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      zoomTo(wheelZoom(zoom.current, e.deltaY, e.deltaMode, fitWidth()), e.clientX, e.clientY)
    }
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length !== 2) { pinch = null; return }
      if (e.cancelable) e.preventDefault() // not cancelable mid-fling; touch-action already blocks the browser's pinch there
      const d = span(e.touches)
      if (!pinch || e.type === 'touchstart') { pinch = { distance: d, zoom: zoom.current, span: d }; return }
      pinch.span = d
      const [a, b] = [e.touches[0], e.touches[1]]
      zoomTo(pinchZoom(pinch.zoom, pinch.distance, d, fitWidth()), (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2)
    }
    const stop = (e: Event) => e.preventDefault()
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === '+' || e.key === '=') zoomAtCenter(zoom.current * STEP)
      if (e.key === '-') zoomAtCenter(zoom.current / STEP)
      if (e.key === '0') zoomAtCenter(1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouch, { passive: false })
    el.addEventListener('touchmove', onTouch, { passive: false })
    el.addEventListener('gesturestart', stop) // Safari's pinch
    addEventListener('keydown', onKey)
    // A wider fit (window resize, phone rotation) lowers the maximum; re-clamp the current zoom.
    const resize = new ResizeObserver(() => {
      const was = zoom.current
      zoomAtCenter(was)
      // A held pinch continues from the re-clamped zoom, whatever control set it, at the fingers' current span.
      if (pinch && zoom.current !== was) pinch = { distance: pinch.span, zoom: zoom.current, span: pinch.span }
    })
    resize.observe(scroller.current!)
    return () => {
      resize.disconnect()
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouch)
      el.removeEventListener('touchmove', onTouch)
      el.removeEventListener('gesturestart', stop)
      removeEventListener('keydown', onKey)
    }
  }, [])

  // Mouse drag pans; touch keeps the browser's own scrolling.
  const drag = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const el = e.currentTarget
    const { scrollLeft, scrollTop } = el
    el.scrollLeft -= e.clientX - d.x
    el.scrollTop -= e.clientY - d.y
    // Advance by what really scrolled: the drag follows a zoom or resize, and what an edge refused stays owed.
    d.x += scrollLeft - el.scrollLeft
    d.y += scrollTop - el.scrollTop
  }
  const endDrag = () => { drag.current = null }

  return (
    <div className="overlay zoom" role="dialog" aria-modal="true" aria-label="크게 보기" ref={root}>
      <div className="zoom-bar">
        <button onClick={() => zoomAtCenter(zoom.current / STEP)} aria-label="축소">−</button>
        <button onClick={() => zoomAtCenter(1)} aria-label={`원래 크기 (지금 ${percent}%)`}>{percent}%</button>
        <button onClick={() => zoomAtCenter(zoom.current * STEP)} aria-label="확대">+</button>
        <button onClick={onClose} autoFocus>✕ 닫기</button>
      </div>
      <div className="zoom-scroll" ref={scroller}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
        onDoubleClick={(e) => zoomTo(zoom.current > 1 ? 1 : 2, e.clientX, e.clientY)}>
        {pages.map((p) => <img key={p} src={pageSrc(p)} alt={pageAlt(p)} draggable={false} />)}
      </div>
    </div>
  )
}
