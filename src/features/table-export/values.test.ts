import { describe, expect, it } from 'vitest'
import { AUTHOR, ctx, FINISHED, GENRES, RATING, READ, refs, SHELF, STARTED } from './fixtures'
import { type Ent, type Filter, mapColumns, matchesFilter, resolve, rowMatches, sortRows, Unsupported } from './values'

describe('table-export values', () => {
  it('refs become what the cell shows: title, journal date, property value', () => {
    expect(resolve({ id: 10 }, 'default', refs)).toBe('Done')
    expect(resolve({ id: 20 }, 'date', refs)).toBe('2026-03-02')
    expect(resolve({ id: 30 }, 'number', refs)).toBe(5)
  })

  it('many values stay an array; datetimes become ISO; plain values pass through', () => {
    expect(resolve([{ id: 40 }, { id: 41 }], 'node', refs)).toEqual(['Fiction', 'Classic'])
    expect(resolve(1772450000000, 'datetime', refs)).toBe(new Date(1772450000000).toISOString())
    expect(resolve(true, 'checkbox', refs)).toBe(true)
    expect(resolve('Middlemarch', 'string', refs)).toBe('Middlemarch')
    expect(resolve(undefined, 'string', refs)).toBeNull()
  })
})

describe('table-export filters (core row-matched? semantics)', () => {
  const book: Ent = {
    id: 1,
    title: 'Middlemarch',
    [SHELF]: { id: 10 },
    [RATING]: { id: 30 },
    [FINISHED]: { id: 20 },
    [GENRES]: [{ id: 40 }, { id: 41 }],
    [READ]: true,
    [AUTHOR]: { id: 50 },
    [STARTED]: 1000,
  }
  const empty: Ent = { id: 2, title: 'Kindred' }
  const m = (row: Ent, f: Filter) => matchesFilter(row, f, ctx)

  it('is / is-not on refs match by uuid, and by content for text values', () => {
    expect(m(book, [SHELF, 'is', ['u-done']])).toBe(true)
    expect(m(book, [SHELF, 'is', ['u-reading']])).toBe(false)
    expect(m(book, [SHELF, 'is-not', ['u-done']])).toBe(false)
    expect(m(empty, [SHELF, 'is-not', ['u-done']])).toBe(true)
    expect(m(book, [GENRES, 'is', ['u-classic']])).toBe(true)
  })

  it('is with an empty match passes everything; booleans and :empty compare the value itself', () => {
    expect(m(empty, [SHELF, 'is', []])).toBe(true)
    expect(m(book, [READ, 'is', true])).toBe(true)
    expect(m(empty, [READ, 'is', false])).toBe(true)
    expect(m(empty, [SHELF, 'is', 'empty'])).toBe(true)
    expect(m(book, [SHELF, 'is-not', ':empty'])).toBe(true)
  })

  it('text filters: contains ignores case, not-contains does not (as core)', () => {
    expect(m(book, [AUTHOR, 'text-contains', 'eliot'])).toBe(true)
    expect(m(book, [AUTHOR, 'text-not-contains', 'eliot'])).toBe(true)
    expect(m(book, [AUTHOR, 'text-not-contains', 'Eliot'])).toBe(false)
  })

  it('number filters compare the property value and drop rows with no value', () => {
    expect(m(book, [RATING, 'number-gt', 4])).toBe(true)
    expect(m(book, [RATING, 'number-lte', 4])).toBe(false)
    expect(m(empty, [RATING, 'number-lt', 10])).toBe(false)
    expect(m(book, [RATING, 'between', [5, null]])).toBe(true)
    expect(m(book, [RATING, 'between', [1, 4]])).toBe(false)
  })

  it('date filters compare journal days; before/after compare timestamps', () => {
    expect(m(book, [FINISHED, 'date-before', { id: 21 }])).toBe(true)
    expect(m(book, [FINISHED, 'date-after', { id: 21 }])).toBe(false)
    expect(m(book, [STARTED, 'before', 2000])).toBe(true)
    expect(m(book, [STARTED, 'after', 2000])).toBe(false)
  })

  it('filters it cannot evaluate faithfully throw Unsupported; unknown operators pass, as in core', () => {
    expect(() => m(book, [STARTED, 'after', ':1-week-ago'])).toThrow(Unsupported)
    expect(m(book, [SHELF, 'some-new-op', 'x'])).toBe(true)
  })

  it('rowMatches: and / or, plus the head search on the title', () => {
    const fs: Filter[] = [
      [SHELF, 'is', ['u-reading']],
      [READ, 'is', true],
    ]
    expect(rowMatches(book, { 'or?': false, filters: fs }, '', ctx)).toBe(false)
    expect(rowMatches(book, { 'or?': true, filters: fs }, '', ctx)).toBe(true)
    expect(rowMatches(book, undefined, 'MARCH', ctx)).toBe(true)
    expect(rowMatches(book, undefined, 'kindred', ctx)).toBe(false)
  })
})

describe('table-export sorting', () => {
  const rows: Ent[] = [
    { id: 1, title: 'B', [RATING]: { id: 31 }, [SHELF]: { id: 10 }, 'updated-at': 2 },
    { id: 2, title: 'A', 'updated-at': 3 },
    { id: 3, title: 'C', [RATING]: { id: 30 }, [SHELF]: { id: 11 }, 'updated-at': 1 },
  ]
  const titles = (rs: Ent[]) => rs.map((r) => r.title)

  it('empty values sort last in both directions (as the table shows them)', () => {
    expect(titles(sortRows(rows, [{ id: RATING, 'asc?': true }], ctx))).toEqual(['B', 'C', 'A'])
    expect(titles(sortRows(rows, [{ id: RATING, 'asc?': false }], ctx))).toEqual(['C', 'B', 'A'])
  })

  it('choices sort by their order in the choice list, not by name', () => {
    expect(titles(sortRows(rows, [{ id: SHELF, 'asc?': true }], ctx))).toEqual(['C', 'B', 'A'])
  })

  it('many values sort by their titles joined with ", "; dates by journal day', () => {
    const many: Ent[] = [
      { id: 1, title: 'X', [GENRES]: [{ id: 41 }] },
      { id: 2, title: 'Y', [GENRES]: [{ id: 40 }, { id: 41 }] },
      { id: 3, title: 'Z', [FINISHED]: { id: 21 } },
      { id: 4, title: 'W', [FINISHED]: { id: 20 } },
    ]
    expect(titles(sortRows(many, [{ id: GENRES, 'asc?': true }], ctx)).slice(0, 2)).toEqual(['X', 'Y'])
    expect(titles(sortRows(many, [{ id: FINISHED, 'asc?': true }], ctx)).slice(0, 2)).toEqual(['W', 'Z'])
  })

  it('no sorting means core default: newest update first', () => {
    expect(titles(sortRows(rows, undefined, ctx))).toEqual(['A', 'B', 'C'])
  })
})

describe('table-export columns', () => {
  const props = [{ ident: RATING, title: 'Rating', ':logseq.property/type': 'number' }]

  it('header titles map to built-ins and to properties by title', () => {
    expect(mapColumns(['Name', 'Rating', 'Created At'], props)).toEqual([
      { title: 'Name', key: 'title', type: 'string' },
      { title: 'Rating', key: RATING, type: 'number' },
      { title: 'Created At', key: 'created-at', type: 'datetime' },
    ])
  })

  it('a title it cannot place throws Unsupported naming the column', () => {
    expect(() => mapColumns(['Name', 'Mystery'], props)).toThrow(/Mystery/)
  })
})
