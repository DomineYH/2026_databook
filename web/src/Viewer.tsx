import HTMLFlipBook from 'react-pageflip'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type Ref } from 'react'
import { CHAPTERS, LINKS, PAGE_COUNT, TITLE, chapterOf, isSpread, keepAnchor, pageAlt, pageHash, pageSrc, parsePageHash, spreadOf } from './book'

type PageFlipApi = {
  flipNext(): void
  flipPrev(): void
  turnToPage(index: number): void
  getSettings(): Record<string, unknown>
  update(): void
  getFlipController(): Record<'flipNext' | 'flipPrev', (corner?: string) => void>
}
type FlipEvent = { data: unknown }
type InitEvent = { data: { page: number } }
// react-pageflip's typings mark every setting as required; we pass only the ones we change.
const FlipBook = HTMLFlipBook as unknown as ComponentType<Record<string, unknown> & { children: ReactNode; ref: Ref<{ pageFlip(): PageFlipApi }> }>

// page-flip picks its mode from width alone; a huge minWidth forces single pages, usePortrait=false forces spreads.
// maxWidth/maxHeight stay above it (page-flip resets them to 2000 otherwise), so CSS alone sizes the book.
const modeSettings = (spread: boolean) => ({ usePortrait: !spread, minWidth: spread ? 1 : 100000 })

const STORAGE_KEY = 'databook:lastPage'
const PAGES = Array.from({ length: PAGE_COUNT }, (_, i) => i + 1)

function initialPage(): number {
  const fromHash = parsePageHash(location.hash)
  if (fromHash) return fromHash
  return parsePageHash(pageHash(Number(localStorage.getItem(STORAGE_KEY)))) ?? 1
}

// Images get their src only near the current 쪽: loading="lazy" still fetched ~150 hidden pages up front.
function reveal(page: number) {
  for (let p = page - 2; p <= page + 4; p++) {
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

  const onInit = useCallback((e: InitEvent) => {
    const p = e.data.page + 1
    reveal(p)
    history.replaceState(null, '', pageHash(p))
    // Buttons, arrow keys and swipes turn pages by faking a corner click, which disableFlipByClick rejects whenever
    // the fake point misses a corner (always for "previous" on a single page). Let those calls through.
    // ponytail: patches react-pageflip/page-flip 2.0.x internals; re-check on upgrade.
    const flip = api()!
    const controller = flip.getFlipController()
    for (const method of ['flipNext', 'flipPrev'] as const) {
      const original = controller[method].bind(controller)
      controller[method] = (corner) => {
        const settings = flip.getSettings()
        settings.disableFlipByClick = false
        try { original(corner) } finally { settings.disableFlipByClick = true }
      }
    }
  }, [])

  // page-flip reads settings only at init and never stops its render loop on unmount, so switch modes on the live instance.
  useEffect(() => {
    spreadRef.current = spread
    const flip = api()
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
    const go = () => {
      const p = parsePageHash(location.hash)
      if (p) { anchor.current = p; api()?.turnToPage(p - 1) }
      setTocOpen(false)
    }
    addEventListener('hashchange', go)
    return () => removeEventListener('hashchange', go)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'Escape') { setZoomed(null); setTocOpen(false) }
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
