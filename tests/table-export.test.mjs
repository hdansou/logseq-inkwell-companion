import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const x = createRequire(import.meta.url)('../src/features/table-export.js')

// Shapes below are what logseq.DB.datascriptQuery returned on Logseq-DB 2.0.2 (2026-10-18): built-in attributes lose
// their namespace ("title", "tags", "created-at"), properties keep theirs, refs are {id}.
const refs = new Map([
  [10, { id: 10, uuid: 'u-done', title: 'Done' }],
  [11, { id: 11, uuid: 'u-reading', title: 'Reading' }],
  [20, { id: 20, uuid: 'u-mar2', title: 'Mar 2nd, 2026', 'journal-day': 20260302 }],
  [21, { id: 21, uuid: 'u-jul18', title: 'Jul 18th, 2026', 'journal-day': 20260718 }],
  [30, { id: 30, uuid: 'u-five', ':logseq.property/value': 5 }],
  [31, { id: 31, uuid: 'u-three', ':logseq.property/value': 3 }],
  [40, { id: 40, uuid: 'u-fiction', title: 'Fiction' }],
  [41, { id: 41, uuid: 'u-classic', title: 'Classic' }],
  [50, { id: 50, uuid: 'u-eliot', title: 'George Eliot' }],
])
const ctx = {
  refs,
  byUuid: new Map([...refs.values()].map((e) => [e.uuid, e])),
  choiceOrder: new Map([[11, 'a0'], [10, 'a1']]),
  types: new Map([[':user.property/rating-x', 'number'], [':user.property/finished-x', 'date'], [':user.property/genres-x', 'node']]),
}
const SHELF = ':user.property/shelf-x', RATING = ':user.property/rating-x', FINISHED = ':user.property/finished-x'
const GENRES = ':user.property/genres-x', READ = ':user.property/read-x', AUTHOR = ':user.property/author-x', STARTED = ':user.property/started-x'

describe('table-export formats', () => {
  test('CSV has a BOM, CRLF lines, RFC 4180 quoting, and joins many values with "; "', () => {
    const csv = x.toCsv(['Name', 'Genres', 'Rating'], [['Notes, "quoted"', ['Fiction', 'Classic'], 5], ['Line\nbreak', [], null]])
    assert.equal(csv, '﻿Name,Genres,Rating\r\n"Notes, ""quoted""",Fiction; Classic,5\r\n"Line\nbreak",,\r\n')
  })
  test('TSV flattens tabs and line breaks so each row stays one spreadsheet row', () => {
    assert.equal(x.toTsv(['A', 'B'], [['x\ty', 'one\ntwo'], [true, ['p', 'q']]]), 'A\tB\nx y\tone two\ntrue\tp; q')
  })
  test('JSON keeps types and arrays, puts the uuid first, and numbers repeated titles', () => {
    const rows = JSON.parse(x.toJson(['Name', 'Rating', 'Name'], [['Kindred', null, 'dup']], ['u1']))
    assert.deepEqual(rows, [{ uuid: 'u1', Name: 'Kindred', Rating: null, 'Name 2': 'dup' }])
    assert.deepEqual(Object.keys(rows[0]), ['uuid', 'Name', 'Rating', 'Name 2'])
  })
  test('file names drop characters that are unsafe on any OS', () => {
    assert.equal(x.fileName('Books: 2026/Q3 "draft"', 'csv'), 'Books 2026 Q3 draft.csv')
    assert.equal(x.fileName('', 'json'), 'table.json')
  })
  test('parseCount reads a tab count and a query title count', () => {
    assert.equal(x.parseCount('4'), 4)
    assert.equal(x.parseCount('Live query (12)'), 12)
    assert.equal(x.parseCount(''), null)
  })
})

describe('table-export values', () => {
  test('refs become what the cell shows: title, journal date, property value', () => {
    assert.equal(x.resolve({ id: 10 }, 'default', refs), 'Done')
    assert.equal(x.resolve({ id: 20 }, 'date', refs), '2026-03-02')
    assert.equal(x.resolve({ id: 30 }, 'number', refs), 5)
  })
  test('many values stay an array; datetimes become ISO; plain values pass through', () => {
    assert.deepEqual(x.resolve([{ id: 40 }, { id: 41 }], 'node', refs), ['Fiction', 'Classic'])
    assert.equal(x.resolve(1772450000000, 'datetime', refs), new Date(1772450000000).toISOString())
    assert.equal(x.resolve(true, 'checkbox', refs), true)
    assert.equal(x.resolve('Middlemarch', 'string', refs), 'Middlemarch')
    assert.equal(x.resolve(undefined, 'string', refs), null)
  })
})

describe('table-export filters (core row-matched? semantics)', () => {
  const book = { title: 'Middlemarch', [SHELF]: { id: 10 }, [RATING]: { id: 30 }, [FINISHED]: { id: 20 }, [GENRES]: [{ id: 40 }, { id: 41 }], [READ]: true, [AUTHOR]: { id: 50 }, [STARTED]: 1000 }
  const empty = { title: 'Kindred' }
  const m = (row, f) => x.matchesFilter(row, f, ctx)

  test('is / is-not on refs match by uuid, and by content for text values', () => {
    assert.equal(m(book, [SHELF, 'is', ['u-done']]), true)
    assert.equal(m(book, [SHELF, 'is', ['u-reading']]), false)
    assert.equal(m(book, [SHELF, 'is-not', ['u-done']]), false)
    assert.equal(m(empty, [SHELF, 'is-not', ['u-done']]), true)
    assert.equal(m(book, [GENRES, 'is', ['u-classic']]), true)
  })
  test('is with an empty match passes everything; booleans and :empty compare the value itself', () => {
    assert.equal(m(empty, [SHELF, 'is', []]), true)
    assert.equal(m(book, [READ, 'is', true]), true)
    assert.equal(m(empty, [READ, 'is', false]), true)
    assert.equal(m(empty, [SHELF, 'is', 'empty']), true)
    assert.equal(m(book, [SHELF, 'is-not', ':empty']), true)
  })
  test('text filters: contains ignores case, not-contains does not (as core)', () => {
    assert.equal(m(book, [AUTHOR, 'text-contains', 'eliot']), true)
    assert.equal(m(book, [AUTHOR, 'text-not-contains', 'eliot']), true)
    assert.equal(m(book, [AUTHOR, 'text-not-contains', 'Eliot']), false)
  })
  test('number filters compare the property value and drop rows with no value', () => {
    assert.equal(m(book, [RATING, 'number-gt', 4]), true)
    assert.equal(m(book, [RATING, 'number-lte', 4]), false)
    assert.equal(m(empty, [RATING, 'number-lt', 10]), false)
    assert.equal(m(book, [RATING, 'between', [5, null]]), true)
    assert.equal(m(book, [RATING, 'between', [1, 4]]), false)
  })
  test('date filters compare journal days; before/after compare timestamps', () => {
    assert.equal(m(book, [FINISHED, 'date-before', { id: 21 }]), true)
    assert.equal(m(book, [FINISHED, 'date-after', { id: 21 }]), false)
    assert.equal(m(book, [STARTED, 'before', 2000]), true)
    assert.equal(m(book, [STARTED, 'after', 2000]), false)
  })
  test('filters it cannot evaluate faithfully throw Unsupported; unknown operators pass, as in core', () => {
    assert.throws(() => m(book, [STARTED, 'after', ':1-week-ago']), x.Unsupported)
    assert.equal(m(book, [SHELF, 'some-new-op', 'x']), true)
  })
  test('rowMatches: and / or, plus the head search on the title', () => {
    const fs = [[SHELF, 'is', ['u-reading']], [READ, 'is', true]]
    assert.equal(x.rowMatches(book, { 'or?': false, filters: fs }, '', ctx), false)
    assert.equal(x.rowMatches(book, { 'or?': true, filters: fs }, '', ctx), true)
    assert.equal(x.rowMatches(book, undefined, 'MARCH', ctx), true)
    assert.equal(x.rowMatches(book, undefined, 'kindred', ctx), false)
  })
})

describe('table-export sorting', () => {
  const rows = [
    { title: 'B', [RATING]: { id: 31 }, [SHELF]: { id: 10 }, 'updated-at': 2 },
    { title: 'A', 'updated-at': 3 },
    { title: 'C', [RATING]: { id: 30 }, [SHELF]: { id: 11 }, 'updated-at': 1 },
  ]
  const titles = (rs) => rs.map((r) => r.title)
  test('empty values sort last in both directions (as the table shows them)', () => {
    assert.deepEqual(titles(x.sortRows(rows, [{ id: RATING, 'asc?': true }], ctx)), ['B', 'C', 'A'])
    assert.deepEqual(titles(x.sortRows(rows, [{ id: RATING, 'asc?': false }], ctx)), ['C', 'B', 'A'])
  })
  test('choices sort by their order in the choice list, not by name', () => {
    assert.deepEqual(titles(x.sortRows(rows, [{ id: SHELF, 'asc?': true }], ctx)), ['C', 'B', 'A'])
  })
  test('many values sort by their titles joined with ", "; dates by journal day', () => {
    const many = [{ title: 'X', [GENRES]: [{ id: 41 }] }, { title: 'Y', [GENRES]: [{ id: 40 }, { id: 41 }] }, { title: 'Z', [FINISHED]: { id: 21 } }, { title: 'W', [FINISHED]: { id: 20 } }]
    assert.deepEqual(titles(x.sortRows(many, [{ id: GENRES, 'asc?': true }], ctx)).slice(0, 2), ['X', 'Y'])
    assert.deepEqual(titles(x.sortRows(many, [{ id: FINISHED, 'asc?': true }], ctx)).slice(0, 2), ['W', 'Z'])
  })
  test('no sorting means core default: newest update first', () => {
    assert.deepEqual(titles(x.sortRows(rows, undefined, ctx)), ['A', 'B', 'C'])
  })
})

describe('table-export columns', () => {
  const props = [{ ident: RATING, title: 'Rating', ':logseq.property/type': 'number' }]
  test('header titles map to built-ins and to properties by title', () => {
    assert.deepEqual(x.mapColumns(['Name', 'Rating', 'Created At'], props), [
      { title: 'Name', key: 'title', type: 'string' },
      { title: 'Rating', key: RATING, type: 'number' },
      { title: 'Created At', key: 'created-at', type: 'datetime' },
    ])
  })
  test('a title it cannot place throws Unsupported naming the column', () => {
    assert.throws(() => x.mapColumns(['Name', 'Mystery'], props), /Mystery/)
  })
})

describe('table-export collect (database step, stubbed datascriptQuery)', () => {
  // Book (210) with Novel (211) extending it; one Book row and one Novel row.
  const rowsByTag = {
    210: [{ id: 1, uuid: 'r1', title: 'Middlemarch', tags: [{ id: 210 }], [RATING]: { id: 30 }, [SHELF]: { id: 10 }, 'updated-at': 5 }],
    211: [{ id: 2, uuid: 'r2', title: 'Piranesi', tags: [{ id: 211 }], [SHELF]: { id: 11 }, 'updated-at': 9 }],
  }
  const tagRefs = [{ id: 210, uuid: 'u-book', title: 'Book' }, { id: 211, uuid: 'u-novel', title: 'Novel' }]
  const makeDb = (view) => ({
    q: async (query) => {
      if (query.includes('#uuid "v1"')) return [[view]]
      if (query.includes(':logseq.property.class/extends')) return [[211, 210], [210, 1]]
      if (query.includes('[?b :block/tags ?t]')) {
        const ids = query.match(/ground \[([\d ]+)\]/)[1].split(' ').map(Number)
        return ids.flatMap((id) => (rowsByTag[id] || []).map((r) => [r]))
      }
      if (query.includes('pull ?p')) return [[{ ident: RATING, title: 'Rating', ':logseq.property/type': 'number' }], [{ ident: SHELF, title: 'Shelf', ':logseq.property/type': 'default' }]]
      if (query.includes('pull ?e')) return [...refs.values(), ...tagRefs].map((e) => [e])
      if (query.includes(':block/closed-value-property')) return [[11, 'a0'], [10, 'a1']]
      throw new Error('unexpected query ' + query)
    },
  })
  const view = { uuid: 'v1', kind: 'tab', titles: ['Name', 'Tags', 'Rating', 'Shelf'], search: '', title: 'All' }

  test('a tag table includes tags that extend it, sorted by core default, values resolved', async () => {
    const entity = { id: 99, uuid: 'v1', ':logseq.property.view/feature-type': 'class-objects', ':logseq.property/view-for': { id: 210 } }
    const data = await x.collect(view, makeDb(entity))
    assert.deepEqual(data.header, ['Name', 'Tags', 'Rating', 'Shelf'])
    assert.deepEqual(data.uuids, ['r2', 'r1'])
    assert.deepEqual(data.rows, [['Piranesi', ['Novel'], null, 'Reading'], ['Middlemarch', ['Book'], 5, 'Done']])
  })
  test('the view\'s filters and sorting apply', async () => {
    const entity = {
      id: 99, uuid: 'v1', ':logseq.property.view/feature-type': 'class-objects', ':logseq.property/view-for': { id: 210 },
      ':logseq.property.table/filters': { 'or?': false, filters: [[SHELF, 'is', ['u-done', 'u-reading']]] },
      ':logseq.property.table/sorting': [{ id: 'title', 'asc?': true }],
    }
    const data = await x.collect(view, makeDb(entity))
    assert.deepEqual(data.uuids, ['r1', 'r2'])
    const onlyDone = { ...entity, ':logseq.property.table/filters': { 'or?': false, filters: [[SHELF, 'is', ['u-done']]] } }
    assert.deepEqual((await x.collect(view, makeDb(onlyDone))).uuids, ['r1'])
  })
  test('other kinds of tables (All pages, references) are refused', async () => {
    const entity = { id: 99, uuid: 'v1', ':logseq.property.view/feature-type': 'all-pages' }
    await assert.rejects(x.collect(view, makeDb(entity)), x.Unsupported)
  })
})
