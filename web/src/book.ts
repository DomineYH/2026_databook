import book from './book.json'

export type Chapter = { title: string; page: number }
export type PageLink = { to: number; left: number; top: number; width: number; height: number }

export const TITLE = book.title
export const PAGE_COUNT = book.pageCount
export const CHAPTERS: Chapter[] = book.chapters
export const LINKS: Record<string, PageLink[]> = book.links

/** 쪽 → "#/p/N" 주소 */
export const pageHash = (page: number) => `#/p/${page}`

/** "#/p/N" → 쪽 (범위 밖이면 가장 가까운 쪽으로, 형식이 틀리면 null) */
export function parsePageHash(hash: string, count = PAGE_COUNT): number | null {
  const m = /^#\/p\/(\d+)$/.exec(hash)
  if (!m) return null
  return Math.min(Math.max(Number(m[1]), 1), count)
}

/** 쪽이 속한 장 (목차·표지처럼 첫 장 앞이면 null) */
export function chapterOf(page: number, chapters = CHAPTERS): Chapter | null {
  let found: Chapter | null = null
  for (const c of chapters) if (c.page <= page) found = c
  return found
}

/** 펼침면에서 함께 보이는 쪽들: 표지는 단독, 그 뒤로 [짝수, 홀수] */
export function spreadOf(page: number, count = PAGE_COUNT): number[] {
  if (page <= 1) return [1]
  const left = page % 2 === 0 ? page : page - 1
  return left + 1 <= count ? [left, left + 1] : [left]
}

/** 펼침면 비율(두 쪽 폭 / 높이). 무대가 이보다 좁으면 한 쪽 보기가 각 쪽을 더 크게 보여준다. */
export const SPREAD_RATIO = (1600 * 2) / 2265

export const isSpread = (stageWidth: number, stageHeight: number) => stageWidth / stageHeight >= SPREAD_RATIO

/** page-flip이 보고한 쪽(펼침면이면 왼쪽 쪽)에 대해, 독자가 고른 쪽이 아직 화면에 있으면 그 쪽을 유지한다. */
export const keepAnchor = (anchor: number, shown: number, spread: boolean) =>
  spread && spreadOf(shown).includes(anchor) ? anchor : shown

export const pageSrc = (page: number) => `/pages/${String(page).padStart(3, '0')}.webp`

export function pageAlt(page: number): string {
  const c = chapterOf(page)
  return c ? `자료집 ${page}쪽, ${c.title}` : `자료집 ${page}쪽`
}
