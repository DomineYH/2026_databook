import HTMLFlipBook from 'react-pageflip'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type Ref } from 'react'
import { CHAPTERS, LINKS, PAGE_COUNT, TITLE, chapterOf, isSpread, keepAnchor, nextTrapIndex, pageAlt, pageHash, pageSrc, parsePageHash, spreadOf } from './book'

type PageFlipApi = {
  flipNext(): void
  flipPrev(): void
  turnToPage(index: number): void
  getSettings(): Record<string, unknown>
  update(): void
  getRender(): {
    finishAnimation(): void
    setBottomPage(p: null): void
    setFlippingPage(p: null): void
    clearShadow(): void
    getOrientation(): 'portrait' | 'landscape'
    getRect(): { pageWidth: number; height: number }
    convertToBook(point: Point): Point
  }
  getFlipController(): {
    isPointOnCorners(point: Point): boolean
    showCorner(point: Point): void
    stopMove(): void
    flipNext(corner?: string): void
    flipPrev(corner?: string): void
    getDirectionByPoint(point: Point): number
    reset(): void
    setState(state: 'read'): void
    getState(): string
    getCalculation(): { getPosition(): { x: number } | null; getDirection(): number } | null
  }
  getUI(): { touchPoint: unknown }
  userStop(point: Point, isSwipe: boolean): void
}
type Point = { x: number; y: number }
type FlipEvent = { data: unknown }
// react-pageflip's typings mark every setting as required; we pass only the ones we change.
const FlipBook = HTMLFlipBook as unknown as ComponentType<Record<string, unknown> & { children: ReactNode; ref: Ref<{ pageFlip(): PageFlipApi }> }>

// page-flip picks its mode from width alone; a huge minWidth forces single pages, usePortrait=false forces spreads.
// maxWidth/maxHeight stay above it (page-flip resets them to 2000 otherwise), so CSS alone sizes the book.
const modeSettings = (spread: boolean) => ({ usePortrait: !spread, minWidth: spread ? 1 : 100000 })

/** page-flip's own end-of-turn cleanup, for whatever fold is left on screen. */
function dropFold(flip: PageFlipApi) {
  const render = flip.getRender()
  render.setBottomPage(null)
  render.setFlippingPage(null)
  render.clearShadow()
  flip.getFlipController().setState('read')
  flip.getFlipController().reset()
}

/** Bring page-flip to rest before we move it ourselves. Anything left running lands on the wrong page later. */
function settle(flip: PageFlipApi) {
  flip.getRender().finishAnimation() // a turn in flight
  flip.getFlipController().stopMove() // a held drag or corner preview
  flip.getRender().finishAnimation()
  dropFold(flip)
  flip.userStop({ x: 0, y: 0 }, true) // end the pointer gesture without acting on it
  flip.getUI().touchPoint = null // and a pending swipe, which would otherwise flip on touchend
}

const STORAGE_KEY = 'databook:lastPage'
const PAGES = Array.from({ length: PAGE_COUNT }, (_, i) => i + 1)

function initialPage(): number {
  const fromHash = parsePageHash(location.hash)
  if (fromHash) return fromHash
  return parsePageHash(pageHash(Number(localStorage.getItem(STORAGE_KEY)))) ?? 1
}

// Images get their src only near the current 쪽: loading="lazy" still fetched ~150 hidden pages up front.
// From 3 back: the reader's 쪽 may be a spread's right page, and turning back must show the previous spread's left page.
function reveal(page: number) {
  for (let p = page - 3; p <= page + 4; p++) {
    const img = document.querySelector<HTMLImageElement>(`img[data-src="${pageSrc(p)}"]`)
    if (img && !img.getAttribute('src')) img.src = img.dataset.src!
  }
}

export default function Viewer() {
  const bookRef = useRef<{ pageFlip(): PageFlipApi }>(null)
  const [page, setPage] = useState(initialPage)
  const stageRef = useRef<HTMLElement>(null)
  const [spread, setSpread] = useState<boolean | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [zoomed, setZoomed] = useState<number[] | null>(null)
  const [idle, setIdle] = useState(false)
  const tocButton = useRef<HTMLButtonElement>(null)
  const zoomButton = useRef<HTMLButtonElement>(null)
  const tocList = useRef<HTMLOListElement>(null)
  const overlayOpen = tocOpen || zoomed !== null

  const api = () => bookRef.current?.pageFlip()
  // The 쪽 the reader asked for. In a spread page-flip reports the left 쪽, so keep this while it is still on screen.
  const anchor = useRef(page)
  const spreadRef = useRef(spread)

  const onFlip = useCallback((e: FlipEvent) => {
    const shown = Number(e.data) + 1
    const p = (anchor.current = keepAnchor(anchor.current, shown, spreadRef.current === true))
    setPage(p)
    reveal(p)
    history.replaceState(null, '', pageHash(p))
    localStorage.setItem(STORAGE_KEY, String(p))
  }, [])

  const onInit = useCallback(() => {
    // ponytail: patches page-flip 2.0.x internals; re-check on upgrade.
    // flipNext/flipPrev are wrapped too: in a window under ~161px tall their fake corner click misses every corner (#11).
    const flip = api()!
    const controller = flip.getFlipController()
    const render = flip.getRender()
    // On a single page page-flip tests corners against a virtual two-page book, so the visible page's left corners
    // never count and clicks, buttons, arrow keys and swipes (all corner clicks under disableFlipByClick) could not
    // go back. Test against the visible page, the book's right half, instead - but not for hover previews, whose
    // backward fold page-flip maps wrongly and completes as a turn when the pointer leaves.
    const onCorners = controller.isPointOnCorners.bind(controller)
    let hovering = false
    const showCorner = controller.showCorner.bind(controller)
    controller.showCorner = (point) => {
      hovering = true
      try { showCorner(point) } finally { hovering = false }
    }
    controller.isPointOnCorners = (point) => {
      if (hovering || render.getOrientation() !== 'portrait') return onCorners(point)
      const { pageWidth, height } = render.getRect()
      const { x, y } = render.convertToBook(point)
      const px = x - pageWidth
      const reach = Math.hypot(pageWidth, height) / 5
      return px > 0 && px < pageWidth && y > 0 && y < height && (px < reach || px > pageWidth - reach) && (y < reach || y > height - reach)
    }
    // A fold started on a corner has no position until its first frame; leaving the corner (or a drag) before that
    // made stopMove throw on every mouse move. Just drop such a fold.
    const stopMove = controller.stopMove.bind(controller)
    // A hover preview must never turn the page; on a page narrower than page-flip's fixed 50px fold it rests across the
    // spine (x <= 0), which stopMove completes as a turn (#15).
    // A preview still up when settle() runs on a mode switch is in page-flip's fold_corner state; same rule (#19).
    // On a single page a backward fold maps to x <= 0 anywhere on screen, so any backward drag turned the page;
    // turn only once the corner is at or past the middle of the visible page (#18). FlipDirection BACK is 1.
    // A turn already animating (key, button, click) must finish first: the drag reuses its calculation.
    controller.stopMove = () => {
      const calc = controller.getCalculation()
      const pos = calc?.getPosition()
      const preview = hovering || controller.getState() === 'fold_corner'
      const shortBack = !hovering && render.getOrientation() === 'portrait' && calc?.getDirection() === 1
        && !!pos && pos.x > -render.getRect().pageWidth / 2
      if (shortBack) render.finishAnimation()
      return pos && !(preview && pos.x <= 0) && !shortBack ? stopMove() : dropFold(flip)
    }
    // Buttons, arrow keys and swipes fake a click 10px inside the book's edge; once the corner zone is under 10px that
    // misses and disableFlipByClick rejects it. Allow clicks only for the duration of these programmatic calls.
    // Once a page is narrower than that inset the fake point also lands on the wrong side of the spine and page-flip
    // reads it as the opposite direction, so pin the direction to the one asked for (FlipDirection: 0 forward, 1 back).
    const byPoint = controller.getDirectionByPoint
    for (const [method, direction] of [['flipNext', 0], ['flipPrev', 1]] as const) {
      const original = controller[method].bind(controller)
      controller[method] = (corner) => {
        const settings = flip.getSettings()
        settings.disableFlipByClick = false
        controller.getDirectionByPoint = () => direction
        try { original(corner) } finally { settings.disableFlipByClick = true; controller.getDirectionByPoint = byPoint }
      }
    }
    // A jump may have arrived while the book was mounting; anchor holds the latest target.
    flip.turnToPage(anchor.current - 1)
    reveal(anchor.current)
    history.replaceState(null, '', pageHash(anchor.current))
  }, [])

  // page-flip reads settings only at init and never stops its render loop on unmount, so switch modes on the live instance.
  useEffect(() => {
    const flip = api()
    if (flip) settle(flip) // under the old mode; a turn landing after the switch overruns the new spreads and stops page-flip
    spreadRef.current = spread
    if (!flip || spread === null) return
    const keep = anchor.current
    Object.assign(flip.getSettings(), modeSettings(spread))
    flip.update()
    flip.turnToPage(keep - 1) // update() re-shows the spread's left 쪽; return to the reader's
  }, [spread])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSpread(isSpread(entry.contentRect.width, entry.contentRect.height)))
    observer.observe(stageRef.current!)
    return () => observer.disconnect()
  }, [])

  // Every link (목차 패널, 3쪽 목차, 쪽 번호 입력) just changes the hash.
  useEffect(() => {
    // Read the event's URL: onFlip may already have replaced location.hash (e.g. during a mode switch).
    const go = (e: HashChangeEvent) => {
      const p = parsePageHash(new URL(e.newURL).hash)
      const flip = api()
      if (p) {
        if (flip) settle(flip)
        anchor.current = p
        if (flip) flip.turnToPage(p - 1)
        else setPage(p) // book not ready yet: onInit opens anchor
      }
      setTocOpen(false)
    }
    addEventListener('hashchange', go)
    return () => removeEventListener('hashchange', go)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setZoomed(null); setTocOpen(false) }
      // Without inert the page behind stays tabbable; trap every Tab, since Safari's default Tab skips links.
      if (e.key === 'Tab' && (zoomed || tocOpen) && !('inert' in HTMLElement.prototype)) {
        const items = [...document.querySelectorAll<HTMLElement>('.overlay a, .overlay button')]
        e.preventDefault()
        items[nextTrapIndex(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey)]?.focus()
        return
      }
      if (e.target instanceof HTMLInputElement) return
      if (zoomed || tocOpen) return
      if (e.key === 'ArrowRight') api()?.flipNext()
      if (e.key === 'ArrowLeft') api()?.flipPrev()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [zoomed, tocOpen])

  useEffect(() => {
    let timer = 0
    const wake = () => { setIdle(false); clearTimeout(timer); timer = setTimeout(() => setIdle(true), 3000) }
    wake()
    const events = ['pointermove', 'pointerdown', 'keydown'] as const
    events.forEach((e) => addEventListener(e, wake))
    return () => { clearTimeout(timer); events.forEach((e) => removeEventListener(e, wake)) }
  }, [])

  // Move focus into the TOC on open and back to its button on close (runs after inert is lifted).
  const tocWasOpen = useRef(false)
  useEffect(() => {
    if (tocOpen) (tocList.current?.querySelector<HTMLElement>('.current a') ?? tocList.current?.querySelector('a'))?.focus()
    else if (tocWasOpen.current) tocButton.current?.focus()
    tocWasOpen.current = tocOpen
  }, [tocOpen])

  const zoomWasOpen = useRef(false)
  useEffect(() => {
    if (!zoomed && zoomWasOpen.current) zoomButton.current?.focus()
    zoomWasOpen.current = zoomed !== null
  }, [zoomed])

  // Built once: react-pageflip re-reads its children whenever they change.
  const pages = useMemo(() => PAGES.map((p) => (
    <div className="page" key={p} onDoubleClick={() => setZoomed([p])}>
      <img data-src={pageSrc(p)} alt={pageAlt(p)} width={1600} height={2265} draggable={false} />
      {LINKS[p]?.map((l, i) => (
        <a key={i} className="page-link" href={pageHash(l.to)} aria-label={`${l.to}쪽으로 이동`}
          style={{ left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%`, height: `${l.height}%` }} />
      ))}
    </div>
  )), [])

  const visible = spread ? spreadOf(page) : [page]
  // 장 always start on the right-hand page, so name the chapter of the last visible 쪽.
  const chapter = chapterOf(visible[visible.length - 1])

  return (
    <div className={`viewer${idle && !tocOpen ? ' idle' : ''}`}>
      <header className="bar top" inert={overlayOpen}>
        <h1>{TITLE}</h1>
        <span className="chapter">{chapter?.title ?? ''}</span>
      </header>

      {/* Mode class lives on the stage: page-flip adds its own class to .book, which a className change would wipe. */}
      <main className={`stage ${spread ? 'spread' : 'single'}`} ref={stageRef} inert={overlayOpen}>
        {spread !== null && (
          <FlipBook ref={bookRef} className="book"
            width={800} height={1132} size="stretch" autoSize={false} {...modeSettings(spread)}
            maxWidth={100000} minHeight={1} maxHeight={100000}
            showCover mobileScrollSupport={false} disableFlipByClick clickEventForward
            maxShadowOpacity={0.4} flippingTime={600} startPage={page - 1}
            onFlip={onFlip} onInit={onInit}>
            {pages}
          </FlipBook>
        )}
      </main>

      <nav className="bar bottom" aria-label="쪽 이동" inert={overlayOpen}>
        <button ref={tocButton} onClick={() => setTocOpen(true)} aria-label="목차 열기">☰ 목차</button>
        <button onClick={() => api()?.flipPrev()} aria-label="이전 쪽" disabled={page <= 1}>◀</button>
        <form onSubmit={(e) => {
          e.preventDefault()
          const n = Number(new FormData(e.currentTarget).get('page'))
          if (n) location.hash = pageHash(n)
          e.currentTarget.reset()
        }}>
          <input name="page" type="number" min={1} max={PAGE_COUNT} inputMode="numeric"
            placeholder={visible.join('–')} aria-label="이동할 쪽 번호" />
          <span aria-live="polite"> / {PAGE_COUNT}</span>
        </form>
        <button onClick={() => api()?.flipNext()} aria-label="다음 쪽" disabled={visible.includes(PAGE_COUNT)}>▶</button>
        <button ref={zoomButton} onClick={() => setZoomed(visible)} aria-label="크게 보기">⤢ 크게</button>
      </nav>

      {tocOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="목차" onClick={() => setTocOpen(false)}>
          <ol className="toc" ref={tocList} onClick={(e) => { e.stopPropagation(); if ((e.target as Element).closest('a')) setTocOpen(false) }}>
            <li><a href={pageHash(1)}>표지</a></li>
            <li><a href={pageHash(3)}>목차</a></li>
            {CHAPTERS.map((c) => (
              <li key={c.page} className={c === chapter ? 'current' : ''}>
                <a href={pageHash(c.page)}>{c.title}<small>{c.page}쪽</small></a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {zoomed && (
        <div className="overlay zoom" role="dialog" aria-modal="true" aria-label="크게 보기">
          <button className="close" onClick={() => setZoomed(null)} autoFocus>✕ 닫기</button>
          {zoomed.map((p) => <img key={p} src={pageSrc(p)} alt={pageAlt(p)} />)}
        </div>
      )}
    </div>
  )
}
