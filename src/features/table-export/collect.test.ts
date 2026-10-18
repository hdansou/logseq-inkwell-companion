import { describe, expect, it } from 'vitest'
import type { Db } from '../../types'
import { collect } from './collect'
import { RATING, refs, SHELF } from './fixtures'
import { type Ent, Unsupported } from './values'

describe('table-export collect (database step, stubbed datascriptQuery)', () => {
  // Book (210) with Novel (211) extending it; one Book row and one Novel row.
  const rowsByTag: Record<number, Ent[]> = {
    210: [
      {
        id: 1,
        uuid: 'r1',
        title: 'Middlemarch',
        tags: [{ id: 210 }],
        [RATING]: { id: 30 },
        [SHELF]: { id: 10 },
        'updated-at': 5,
      },
    ],
    211: [{ id: 2, uuid: 'r2', title: 'Piranesi', tags: [{ id: 211 }], [SHELF]: { id: 11 }, 'updated-at': 9 }],
  }
  const tagRefs: Ent[] = [
    { id: 210, uuid: 'u-book', title: 'Book' },
    { id: 211, uuid: 'u-novel', title: 'Novel' },
  ]
  const makeDb = (view: Ent): Db => ({
    q: async (query) => {
      if (query.includes('#uuid "v1"')) return [[view]]
      if (query.includes(':logseq.property.class/extends'))
        return [
          [211, 210],
          [210, 1],
        ]
      if (query.includes('[?b :block/tags ?t]')) {
        const ids = (/ground \[([\d ]+)\]/.exec(query)?.[1] ?? '').split(' ').map(Number)
        return ids.flatMap((id) => (rowsByTag[id] ?? []).map((r) => [r]))
      }
      if (query.includes('pull ?p'))
        return [
          [{ ident: RATING, title: 'Rating', ':logseq.property/type': 'number' }],
          [{ ident: SHELF, title: 'Shelf', ':logseq.property/type': 'default' }],
        ]
      if (query.includes('pull ?e')) return [...refs.values(), ...tagRefs].map((e) => [e])
      if (query.includes(':block/closed-value-property'))
        return [
          [11, 'a0'],
          [10, 'a1'],
        ]
      throw new Error(`unexpected query ${query}`)
    },
    dsl: async () => [],
    custom: async () => [],
  })
  const view = {
    uuid: 'v1',
    kind: 'tab' as const,
    titles: ['Name', 'Tags', 'Rating', 'Shelf'],
    search: '',
    title: 'All',
    count: null,
  }
  const tagView: Ent = {
    id: 99,
    uuid: 'v1',
    ':logseq.property.view/feature-type': 'class-objects',
    ':logseq.property/view-for': { id: 210 },
  }

  it('a tag table includes tags that extend it, sorted by core default, values resolved', async () => {
    const data = await collect(view, makeDb(tagView))
    expect(data.header).toEqual(['Name', 'Tags', 'Rating', 'Shelf'])
    expect(data.uuids).toEqual(['r2', 'r1'])
    expect(data.rows).toEqual([
      ['Piranesi', ['Novel'], null, 'Reading'],
      ['Middlemarch', ['Book'], 5, 'Done'],
    ])
  })

  it("the view's filters and sorting apply", async () => {
    const entity: Ent = {
      ...tagView,
      ':logseq.property.table/filters': { 'or?': false, filters: [[SHELF, 'is', ['u-done', 'u-reading']]] },
      ':logseq.property.table/sorting': [{ id: 'title', 'asc?': true }],
    }
    expect((await collect(view, makeDb(entity))).uuids).toEqual(['r1', 'r2'])
    const onlyDone = {
      ...entity,
      ':logseq.property.table/filters': { 'or?': false, filters: [[SHELF, 'is', ['u-done']]] },
    }
    expect((await collect(view, makeDb(onlyDone))).uuids).toEqual(['r1'])
  })

  it('other kinds of tables (All pages, references) are refused', async () => {
    const entity: Ent = { id: 99, uuid: 'v1', ':logseq.property.view/feature-type': 'all-pages' }
    await expect(collect(view, makeDb(entity))).rejects.toBeInstanceOf(Unsupported)
  })
})
