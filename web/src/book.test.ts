import { describe, expect, it } from 'vitest'
import { CHAPTERS, PAGE_COUNT, chapterOf, pageAlt, pageSrc, parsePageHash, spreadOf } from './book'

describe('parsePageHash', () => {
  it('reads a page number', () => expect(parsePageHash('#/p/45')).toBe(45))
  it('clamps out-of-range pages', () => {
    expect(parsePageHash('#/p/0')).toBe(1)
    expect(parsePageHash('#/p/9999')).toBe(PAGE_COUNT)
  })
  it('rejects anything else', () => {
    for (const h of ['', '#', '#/p/', '#/p/-3', '#/p/4a', '#/x/4', '#/p/1.5']) expect(parsePageHash(h)).toBeNull()
  })
})

describe('chapterOf', () => {
  it('is null before the first chapter (표지·목차)', () => expect(chapterOf(4)).toBeNull())
  it('finds the chapter on its first page and inside it', () => {
    expect(chapterOf(45)?.title).toMatch(/^제3장/)
    expect(chapterOf(66)?.title).toMatch(/^제3장/)
    expect(chapterOf(PAGE_COUNT)?.title).toMatch(/^제13장/)
  })
  it('has 13 chapters starting on odd (right-hand) pages', () => {
    expect(CHAPTERS).toHaveLength(13)
    for (const c of CHAPTERS) expect(c.page % 2).toBe(1)
  })
})

describe('spreadOf', () => {
  it('shows the cover alone', () => expect(spreadOf(1)).toEqual([1]))
  it('pairs even-left with odd-right', () => {
    expect(spreadOf(44)).toEqual([44, 45])
    expect(spreadOf(45)).toEqual([44, 45])
  })
  it('handles the last page of an odd-length book', () => expect(spreadOf(287, 287)).toEqual([286, 287]))
  it('handles a lone last page', () => expect(spreadOf(288, 288)).toEqual([288]))
})

describe('page assets', () => {
  it('pads the image name', () => expect(pageSrc(7)).toBe('/pages/007.webp'))
  it('names the chapter in alt text', () => expect(pageAlt(45)).toBe('자료집 45쪽, 제3장 나 찾기 100일 퀘스트'))
})
