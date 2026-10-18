// Cell values, filters, sorting and columns, following core (logseq.db.common.view). Pure: rows and refs come in
// as datascriptQuery returns them.
import type { Out } from './format'

/** The export can't match the table faithfully; the message names what (shown as "Export can't handle … yet"). */
export class Unsupported extends Error {}

/** A reference to another entity, as datascriptQuery returns it. */
export interface Ref {
  id: number
}
/** A pulled entity (a row, a ref, a view): built-in attributes lose their namespace, properties keep it. */
export interface Ent {
  id: number
  uuid?: string
  title?: string
  'journal-day'?: number
  ':logseq.property/value'?: string | number
  [key: string]: unknown
}
/** Everything a cell, filter or sort can point at, fetched once. */
export interface Ctx {
  refs: Map<number, Ent>
  byUuid: Map<string, Ent>
  choiceOrder: Map<number, string | number>
  types: Map<string, string>
}
export type Filter = [key: string, op: string, match: unknown]
export interface Filters {
  'or?'?: boolean
  filters?: Filter[]
}
export interface Sorting {
  id: string
  'asc?': boolean
}
export interface Column {
  title: string
  key: string
  type: string | undefined
}

// Header titles of columns that are not properties on the row (English UI; other languages are not matched yet)
const BUILT_IN: Record<string, [key: string, type: string]> = {
  name: ['title', 'string'],
  tags: ['tags', 'class'],
  'created at': ['created-at', 'datetime'],
  'updated at': ['updated-at', 'datetime'],
  page: ['page', 'entity'],
}
const DEFAULT_SORTING: Sorting[] = [{ id: 'updated-at', 'asc?': false }]

const isRef = (v: unknown): v is Ref => typeof v === 'object' && v !== null && !Array.isArray(v) && 'id' in v
const list = (raw: unknown): unknown[] => (raw == null ? [] : Array.isArray(raw) ? raw : [raw])
const isoDay = (d: number) => `${String(d).slice(0, 4)}-${String(d).slice(4, 6)}-${String(d).slice(6, 8)}`
const isEmpty = (raw: unknown) => raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0)
// Values are compared with JavaScript's operators, as before the port (numbers with numbers, text with text)
const n = (v: unknown) => v as number

/** What a ref shows: a journal's date, a property value block's value, or a node's title. */
export function refContent(e: Ent): string | number | null {
  if (e['journal-day']) return isoDay(e['journal-day'])
  if (e[':logseq.property/value'] !== undefined) return e[':logseq.property/value']
  return e.title ?? null
}

/** A row's value for one column, ready for output: text, number, boolean, or an array of them (many values). */
export function resolve(raw: unknown, type: string | undefined, refs: Map<number, Ent>): Out {
  if (raw == null) return null
  if (Array.isArray(raw)) return raw.map((v) => resolve(v, type, refs)).filter((v) => v != null)
  if (isRef(raw)) {
    const e = refs.get(raw.id)
    return e ? refContent(e) : null
  }
  if (type === 'datetime' && typeof raw === 'number') return new Date(raw).toISOString()
  return raw as Out
}

/** One stored filter [key, operator, match] against a row, following core's row-matched?. */
export function matchesFilter(row: Ent, [key, op, match]: Filter, ctx: Ctx): boolean {
  if (match == null) return true
  const raw = row[key]
  const vals = list(raw)
  const ents = vals.map((v) => (isRef(v) ? ctx.refs.get(v.id) : undefined))
  const contents = vals.map((v, i) => {
    const e = ents[i]
    return e ? refContent(e) : v
  })
  switch (op) {
    case 'is':
    case 'is-not': {
      let hit: boolean
      if (typeof match === 'boolean') hit = Boolean(contents[0]) === match
      else if (match === 'empty' || match === ':empty') hit = isEmpty(raw)
      else if (Array.isArray(match)) {
        if (match.length === 0 || (op === 'is-not' && vals.length === 0)) return true
        const wanted = new Set<unknown>(match)
        const wantedContent = new Set(
          match.flatMap((u) => {
            const e = ctx.byUuid.get(String(u))
            return e ? [refContent(e)] : []
          }),
        )
        hit =
          ents.some((e) => e && (wanted.has(e.uuid) || wantedContent.has(refContent(e)))) ||
          vals.some((v) => wanted.has(v))
      } else throw new Unsupported(`a "${op}" filter`)
      return op === 'is' ? hit : !hit
    }
    case 'text-contains':
      return contents.some((c) => c != null && String(c).toLowerCase().includes(String(match).toLowerCase()))
    case 'text-not-contains':
      return !contents.some((c) => String(c ?? '').includes(String(match)))
    case 'number-gt':
      return raw != null && contents.some((c) => n(c) > n(match))
    case 'number-gte':
      return raw != null && contents.some((c) => n(c) >= n(match))
    case 'number-lt':
      return raw != null && contents.some((c) => n(c) < n(match))
    case 'number-lte':
      return raw != null && contents.some((c) => n(c) <= n(match))
    case 'between': {
      if (!Array.isArray(match) || match.length === 0) return true
      const [start, end] = match
      return contents.some((c) => (start == null || n(start) <= n(c)) && (end == null || n(c) <= n(end)))
    }
    case 'date-before':
    case 'date-after': {
      if (raw == null) return false
      const day = isRef(match) ? ctx.refs.get(match.id)?.['journal-day'] : undefined
      if (day === undefined) throw new Unsupported(`a "${op}" filter`)
      return ents.some(
        (e) =>
          e?.['journal-day'] !== undefined && (op === 'date-before' ? e['journal-day'] < day : e['journal-day'] > day),
      )
    }
    case 'before':
    case 'after':
      if (raw == null) return false
      if (typeof match !== 'number') throw new Unsupported('a relative date filter')
      return op === 'before' ? n(raw) <= match : n(raw) >= match
    default:
      return true // core lets unknown operators through too
  }
}

/** The view's filters ({or?, filters}) and the head's search text, as core's row-matched?. */
export function rowMatches(row: Ent, filters: Filters | undefined, search: string, ctx: Ctx): boolean {
  if (
    search &&
    !String(row.title ?? '')
      .toLowerCase()
      .includes(search.toLowerCase())
  )
    return false
  const fs = filters?.filters ?? []
  const check = (f: Filter) => matchesFilter(row, f, ctx)
  return fs.length === 0 || (filters?.['or?'] ? fs.some(check) : fs.every(check))
}

/**
 * The value core sorts a cell by (eid-sort-value): a choice's order, a date's journal day, many numbers summed,
 * many others joined with ", ", a ref's title (or its value for numbers), else the raw value.
 */
function sortValue(raw: unknown, key: string, ctx: Ctx): unknown {
  const vs = list(raw)
  const first = vs[0]
  if (first === undefined) return null
  const type = ctx.types.get(key)
  const ent = (v: unknown) => (isRef(v) ? (ctx.refs.get(v.id) ?? ({ id: v.id } as Ent)) : null)
  if (isRef(first) && ctx.choiceOrder.has(first.id)) return ctx.choiceOrder.get(first.id)
  if (isRef(first) && type === 'date') return ent(first)?.['journal-day'] ?? null
  const numeric = type === 'number' || type === 'datetime'
  const content = (v: unknown) => {
    const e = ent(v)
    if (!e) return v
    return numeric ? (e[':logseq.property/value'] ?? e.title ?? null) : (e.title ?? e[':logseq.property/value'] ?? null)
  }
  if (!Array.isArray(raw)) return content(first)
  if (numeric) {
    const nums = vs.map(content).filter((n): n is number => typeof n === 'number')
    return nums.length ? nums.reduce((a, b) => a + b, 0) : null
  }
  const joined = vs.map(content).filter((c) => c != null)
  return joined.length ? joined.join(', ') : null
}

// compare-sort-values: an empty value sorts last in both directions.
function compare(a: unknown, b: unknown, asc: boolean): number {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1
  const c = n(a) < n(b) ? -1 : n(a) > n(b) ? 1 : 0
  return asc ? c : -c
}

/** Rows sorted by the view's sorting (or core's default, newest update first); ties keep their order. */
export function sortRows(rows: Ent[], sorting: Sorting[] | undefined, ctx: Ctx): Ent[] {
  const keys = sorting?.length ? sorting : DEFAULT_SORTING
  return rows
    .map((row, i) => ({ row, i, vs: keys.map((k) => sortValue(row[k.id], k.id, ctx)) }))
    .sort((a, b) => {
      for (const [k, key] of keys.entries()) {
        const c = compare(a.vs[k], b.vs[k], key['asc?'])
        if (c) return c
      }
      return a.i - b.i
    })
    .map((x) => x.row)
}

/** A property entity as pulled for the columns. */
export interface Prop {
  ident: string
  title?: string
  ':logseq.property/type'?: string
}

/** Header titles → columns; props are the rows' property entities. Throws Unsupported on a title it can't place. */
export function mapColumns(titles: string[], props: Prop[]): Column[] {
  const byTitle = new Map(props.map((p) => [String(p.title).toLowerCase(), p]))
  return titles.map((title) => {
    const t = title.toLowerCase()
    const builtIn = BUILT_IN[t]
    if (builtIn) return { title, key: builtIn[0], type: builtIn[1] }
    const p = byTitle.get(t)
    if (!p) throw new Unsupported(`the column "${title}"`)
    return { title, key: p.ident, type: p[':logseq.property/type'] }
  })
}
