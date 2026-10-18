// The database step: a view's rows, columns, filters and sort, read through the injected Db.
import type { Db } from '../../types'
import type { Out } from './format'
import {
  type Ctx,
  type Ent,
  type Filters,
  mapColumns,
  type Prop,
  resolve,
  rowMatches,
  type Sorting,
  sortRows,
  Unsupported,
} from './values'
import type { View } from './view'

export interface Table {
  header: string[]
  rows: Out[][]
  uuids: (string | undefined)[]
}

const edn = (s: string) => JSON.stringify(s)
const ground = (xs: (string | number)[]) => `[${xs.join(' ')}]`
const uuidList = (uuids: string[]) => ground(uuids.map((u) => `#uuid ${edn(u)}`))
const REF_PULL = '[:db/id :block/uuid :block/title :logseq.property/value :block/journal-day]'

/** The first column of each result row (the pulled entity). */
async function pulled<T = Ent>(db: Db, query: string): Promise<T[]> {
  return ((await db.q(query)) ?? []).map((r) => r[0] as T).filter(Boolean)
}

export const pullByUuid = async (db: Db, uuid: string): Promise<Ent | undefined> =>
  (await pulled(db, `[:find (pull ?b [*]) :where [?b :block/uuid #uuid ${edn(uuid)}]]`))[0]

/** Every tag that is `tagId` or extends it, at any depth. */
async function tagAndDescendants(db: Db, tagId: number): Promise<number[]> {
  const pairs = ((await db.q('[:find ?c ?p :where [?c :logseq.property.class/extends ?p]]')) ?? []) as [
    number,
    number,
  ][]
  const ids = new Set([tagId])
  for (let grew = true; grew; ) {
    grew = false
    for (const [c, p] of pairs) {
      if (ids.has(p) && !ids.has(c)) {
        ids.add(c)
        grew = true
      }
    }
  }
  return [...ids]
}

/** A query table's rows: its query re-run (simple or advanced), in the order the query returned them. */
async function queryRows(db: Db, view: Ent): Promise<Ent[]> {
  const ref = view[':logseq.property/query'] as { id: number } | undefined
  const [query] = ref ? await pulled(db, `[:find (pull ?b [*]) :where [(ground ${ref.id}) ?b] [?b :block/uuid]]`) : []
  const text = query?.title
  if (!text) throw new Unsupported('this query (no query text)')
  const result = (await (/^\s*[[{]/.test(text) ? db.custom(text) : db.dsl(text))) ?? []
  const uuids = result.flat().flatMap((b) => ((b as Ent | null)?.uuid ? [(b as Ent).uuid as string] : []))
  if (!uuids.length) return []
  const rows = await pulled(
    db,
    `[:find (pull ?b [*]) :where [(ground ${uuidList(uuids)}) [?u ...]] [?b :block/uuid ?u]]`,
  )
  // Ties in the sort keep the order core got them in: the query's result order
  const at = new Map(uuids.map((u, i) => [u, i]))
  return rows.sort((a, b) => (at.get(a.uuid ?? '') ?? 0) - (at.get(b.uuid ?? '') ?? 0))
}

/** A tag table's rows: objects of the tag and of every tag extending it, in entity order (as core). */
async function tagRows(db: Db, view: Ent): Promise<Ent[]> {
  const tags = await tagAndDescendants(db, (view[':logseq.property/view-for'] as { id: number }).id)
  const rows = await pulled(db, `[:find (pull ?b [*]) :where [(ground ${ground(tags)}) [?t ...]] [?b :block/tags ?t]]`)
  return rows.sort((a, b) => a.id - b.id)
}

/** Every entity a cell, filter or sort can point at, fetched once. */
async function context(db: Db, rows: Ent[], filters: Filters | undefined, props: Prop[]): Promise<Ctx> {
  const filterList = filters?.filters ?? []
  const refIds = new Set<number>()
  const addRef = (v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'id' in v) refIds.add((v as { id: number }).id)
  }
  for (const r of rows) for (const v of Object.values(r)) for (const x of Array.isArray(v) ? v : [v]) addRef(x)
  for (const [, , m] of filterList) addRef(m)
  const refs = refIds.size
    ? await pulled(
        db,
        `[:find (pull ?e ${REF_PULL}) :where [(ground ${ground([...refIds])}) [?e ...]] [?e :block/uuid]]`,
      )
    : []
  const matchUuids = [
    ...new Set(filterList.flatMap(([, , m]) => (Array.isArray(m) ? m.filter((x) => typeof x === 'string') : []))),
  ]
  const byUuid = matchUuids.length
    ? await pulled(
        db,
        `[:find (pull ?e ${REF_PULL}) :where [(ground ${uuidList(matchUuids)}) [?u ...]] [?e :block/uuid ?u]]`,
      )
    : []
  const choices = ((await db.q(
    '[:find ?v ?order :where [?v :block/closed-value-property _] [?v :block/order ?order]]',
  )) ?? []) as [number, string | number][]
  return {
    refs: new Map(refs.map((e) => [e.id, e])),
    byUuid: new Map(byUuid.map((e) => [e.uuid ?? '', e])),
    choiceOrder: new Map(choices),
    types: new Map(props.map((p) => [p.ident, p[':logseq.property/type'] ?? ''])),
  }
}

/** Everything needed to export one view: the header on screen, and every row the table has, filtered and sorted. */
export async function collect(view: View, db: Db): Promise<Table> {
  const entity = await pullByUuid(db, view.uuid)
  if (!entity) throw new Unsupported('this table (its view was not found)')
  let rows: Ent[]
  if (view.kind === 'query') rows = await queryRows(db, entity)
  else if (entity[':logseq.property.view/feature-type'] === 'class-objects') rows = await tagRows(db, entity)
  else throw new Unsupported('this kind of table')

  const propKeys = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k.startsWith(':'))))]
  const props = propKeys.length
    ? await pulled<Prop>(
        db,
        `[:find (pull ?p [:db/ident :block/title :logseq.property/type]) :where [(ground ${ground(propKeys)}) [?i ...]] [?p :db/ident ?i]]`,
      )
    : []
  const columns = mapColumns(view.titles, props)
  const filters = entity[':logseq.property.table/filters'] as Filters | undefined
  const ctx = await context(db, rows, filters, props)
  const sorting = entity[':logseq.property.table/sorting'] as Sorting[] | undefined
  const kept = sortRows(
    rows.filter((r) => rowMatches(r, filters, view.search, ctx)),
    sorting,
    ctx,
  )
  return {
    header: columns.map((c) => c.title),
    rows: kept.map((r) => columns.map((c) => resolve(r[c.key], c.type, ctx.refs))),
    uuids: kept.map((r) => r.uuid),
  }
}
