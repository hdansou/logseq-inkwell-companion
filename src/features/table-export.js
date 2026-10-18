// Adds an Export button to tag and query tables: CSV, JSON, or copy for a spreadsheet. Core only copies a view as EDN.
// A table renders only the rows on screen, so rows come from the database: the tag's objects (tags that extend it
// included) or the query's results, with the view's filters, search and sort applied the way core applies them.
// Columns come from the header on screen (order and hidden columns as shown). The export stops when its row count
// differs from the count the table shows, instead of saving a file that quietly differs from the table.
(function (root) {
  const BUTTON = 'inkwell-export-button'
  const MENU = 'inkwell-export-menu'
  // Header titles of columns that are not properties on the row (English UI; other languages are not matched yet)
  const BUILT_IN = { name: 'title', tags: 'tags', 'created at': 'created-at', 'updated at': 'updated-at', page: 'page' }
  const BUILT_IN_TYPE = { title: 'string', tags: 'class', 'created-at': 'datetime', 'updated-at': 'datetime', page: 'entity' }
  const DEFAULT_SORTING = [{ id: 'updated-at', 'asc?': false }]

  class Unsupported extends Error {}

  // ---------- pure: output formats ----------

  const text = (v) => (v == null ? '' : Array.isArray(v) ? v.map(text).join('; ') : String(v))

  /**
   * Text a spreadsheet would run as a formula (=, +, -, @, tab, CR first) gets a leading ' so it stays text: a block
   * titled =HYPERLINK(...) must not become a live formula in Excel or Sheets. Numbers are left as they are.
   */
  const cell = (c, s = text(c)) => (typeof c !== 'number' && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s)

  /** RFC 4180 CSV with a UTF-8 BOM (so Excel reads accents) and CRLF line ends; formula-like text kept as text. */
  function toCsv(header, rows) {
    const quote = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
    return '﻿' + [header, ...rows].map((r) => r.map((c) => quote(cell(c))).join(',')).join('\r\n') + '\r\n'
  }

  /** Tab-separated text that pastes into Excel or Sheets as cells; formula-like text kept as text. */
  function toTsv(header, rows) {
    const clean = (c) => cell(c, text(c).replace(/[\t\r\n]+/g, ' '))
    return [header, ...rows].map((r) => r.map(clean).join('\t')).join('\n')
  }

  /** One object per row keyed by column title (repeated titles get " 2", " 3"), with the block uuid first. */
  function toJson(header, rows, uuids) {
    const seen = new Map()
    const keys = header.map((h) => {
      const n = (seen.get(h) || 0) + 1
      seen.set(h, n)
      return n === 1 ? h : `${h} ${n}`
    })
    const objects = rows.map((r, i) => Object.fromEntries([['uuid', uuids[i]], ...keys.map((k, j) => [k, r[j] ?? null])]))
    return JSON.stringify(objects, null, 2) + '\n'
  }

  /** A file name from the view's title, safe on every OS. */
  function fileName(title, ext) {
    const base = String(title || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    return `${base || 'table'}.${ext}`
  }

  /** The row count a view header shows: "All4" (title + count) or "Live query (4)". */
  function parseCount(s) {
    const m = /(\d+)\D*$/.exec(s || '')
    return m ? Number(m[1]) : null
  }

  // ---------- pure: values, filters, sorting (rows and refs as datascriptQuery returns them) ----------

  const isoDay = (d) => `${String(d).slice(0, 4)}-${String(d).slice(4, 6)}-${String(d).slice(6, 8)}`
  const list = (raw) => (raw == null ? [] : Array.isArray(raw) ? raw : [raw])

  /** What a ref shows: a journal's date, a property value block's value, or a node's title. */
  function refContent(e) {
    if (e['journal-day']) return isoDay(e['journal-day'])
    if (e[':logseq.property/value'] !== undefined) return e[':logseq.property/value']
    return e.title ?? null
  }

  /** A row's value for one column, ready for output: text, number, boolean, or an array of them (many values). */
  function resolve(raw, type, refs) {
    if (raw == null) return null
    if (Array.isArray(raw)) return raw.map((v) => resolve(v, type, refs)).filter((v) => v != null)
    if (typeof raw === 'object') {
      const e = refs.get(raw.id)
      return e ? refContent(e) : null
    }
    if (type === 'datetime' && typeof raw === 'number') return new Date(raw).toISOString()
    return raw
  }

  const emptyValue = (raw) => raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0)

  /** One stored filter [key, operator, match] against a row, following core's row-matched? (logseq.db.common.view). */
  function matchesFilter(row, [key, op, match], ctx) {
    if (match == null) return true
    const raw = row[key]
    const vals = list(raw)
    const ents = vals.map((v) => (v && typeof v === 'object' ? ctx.refs.get(v.id) : null))
    const contents = vals.map((v, i) => (ents[i] ? refContent(ents[i]) : v))
    const journalDay = (m) => (m && typeof m === 'object' ? (ctx.refs.get(m.id) || {})['journal-day'] : undefined)
    switch (op) {
      case 'is':
      case 'is-not': {
        let hit
        if (typeof match === 'boolean') hit = Boolean(contents[0]) === match
        else if (match === 'empty' || match === ':empty') hit = emptyValue(raw)
        else if (Array.isArray(match) && match.length === 0) return true
        else if (Array.isArray(match)) {
          if (op === 'is-not' && vals.length === 0) return true
          const wanted = new Set(match)
          const wantedContent = new Set(match.map((u) => ctx.byUuid.get(u)).filter(Boolean).map(refContent))
          hit = ents.some((e) => e && (wanted.has(e.uuid) || wantedContent.has(refContent(e)))) || vals.some((v) => wanted.has(v))
        } else throw new Unsupported(`a "${op}" filter`)
        return op === 'is' ? hit : !hit
      }
      case 'text-contains':
        return contents.some((c) => c != null && String(c).toLowerCase().includes(String(match).toLowerCase()))
      case 'text-not-contains':
        return !contents.some((c) => String(c ?? '').includes(String(match)))
      case 'number-gt': return raw != null && contents.some((c) => c > match)
      case 'number-gte': return raw != null && contents.some((c) => c >= match)
      case 'number-lt': return raw != null && contents.some((c) => c < match)
      case 'number-lte': return raw != null && contents.some((c) => c <= match)
      case 'between': {
        if (!Array.isArray(match) || match.length === 0) return true
        const [start, end] = match
        return contents.some((c) => (start == null || start <= c) && (end == null || c <= end))
      }
      case 'date-before':
      case 'date-after': {
        if (raw == null) return false
        const day = journalDay(match)
        if (day === undefined) throw new Unsupported(`a "${op}" filter`)
        return vals.some((v, i) => ents[i] && (op === 'date-before' ? ents[i]['journal-day'] < day : ents[i]['journal-day'] > day))
      }
      case 'before':
      case 'after':
        if (raw == null) return false
        if (typeof match !== 'number') throw new Unsupported('a relative date filter')
        return op === 'before' ? raw <= match : raw >= match
      default:
        return true // core lets unknown operators through too
    }
  }

  /** The view's filters ({or?, filters}) and the head's search text, as core's row-matched?. */
  function rowMatches(row, filters, search, ctx) {
    if (search && !String(row.title || '').toLowerCase().includes(search.toLowerCase())) return false
    const fs = (filters && filters.filters) || []
    if (fs.length === 0) return true
    const check = (f) => matchesFilter(row, f, ctx)
    return filters['or?'] ? fs.some(check) : fs.every(check)
  }

  /**
   * The value core sorts a cell by (eid-sort-value in logseq.db.common.view): a choice's order, a date's journal
   * day, many numbers summed, many others joined with ", ", a ref's title (or its value for numbers), else the raw value.
   */
  function sortValue(raw, key, ctx) {
    const vs = list(raw)
    if (vs.length === 0) return null
    const type = ctx.types.get(key)
    const ent = (v) => (v && typeof v === 'object' ? ctx.refs.get(v.id) || {} : null)
    const first = vs[0]
    if (ent(first) && ctx.choiceOrder.has(first.id)) return ctx.choiceOrder.get(first.id)
    if (ent(first) && type === 'date') return ent(first)['journal-day'] ?? null
    const numeric = type === 'number' || type === 'datetime'
    const content = (v) => {
      const e = ent(v)
      if (!e) return v
      return numeric ? e[':logseq.property/value'] ?? e.title ?? null : e.title ?? e[':logseq.property/value'] ?? null
    }
    if (Array.isArray(raw)) {
      if (numeric) {
        const nums = vs.map(content).filter((n) => typeof n === 'number')
        return nums.length ? nums.reduce((a, b) => a + b, 0) : null
      }
      const col = vs.map(content).filter((c) => c != null)
      return col.length ? col.join(', ') : null
    }
    return content(first)
  }

  // compare-sort-values: an empty value sorts last in both directions.
  const compare = (a, b, asc) => {
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    const c = a < b ? -1 : a > b ? 1 : 0
    return asc ? c : -c
  }

  /** Rows sorted by the view's sorting [{id, asc?}] (or core's default, newest update first); ties keep their order. */
  function sortRows(rows, sorting, ctx) {
    const keys = sorting && sorting.length ? sorting : DEFAULT_SORTING
    return rows
      .map((row, i) => ({ row, i, vs: keys.map((k) => sortValue(row[k.id], k.id, ctx)) }))
      .sort((a, b) => {
        for (let k = 0; k < keys.length; k++) {
          const c = compare(a.vs[k], b.vs[k], keys[k]['asc?'])
          if (c) return c
        }
        return a.i - b.i
      })
      .map((x) => x.row)
  }

  /** Header titles → columns {title, key, type}; props are the row's property entities. Throws on a title it can't place. */
  function mapColumns(titles, props) {
    const byTitle = new Map(props.map((p) => [String(p.title).toLowerCase(), p]))
    return titles.map((title) => {
      const t = title.toLowerCase()
      if (BUILT_IN[t]) return { title, key: BUILT_IN[t], type: BUILT_IN_TYPE[BUILT_IN[t]] }
      const p = byTitle.get(t)
      if (!p) throw new Unsupported(`the column "${title}"`)
      return { title, key: p.ident, type: p[':logseq.property/type'] }
    })
  }

  // ---------- data: the database through datascriptQuery ----------

  const edn = (s) => JSON.stringify(String(s))
  const ground = (xs) => `[${xs.join(' ')}]`
  const pulled = (res) => (res || []).map((r) => r[0]).filter(Boolean)

  async function pullRows(q, where) {
    return pulled(await q(`[:find (pull ?b [*]) :where ${where}]`))
  }

  /** Every tag that is `tagId` or extends it, at any depth. */
  async function tagAndDescendants(q, tagId) {
    const pairs = (await q('[:find ?c ?p :where [?c :logseq.property.class/extends ?p]]')) || []
    const ids = new Set([tagId])
    for (let grew = true; grew;) {
      grew = false
      for (const [c, p] of pairs) if (ids.has(p) && !ids.has(c)) { ids.add(c); grew = true }
    }
    return [...ids]
  }

  /**
   * Everything needed to export one view: {header, rows, uuids, count}. `view` = {uuid, kind: 'tab'|'query', titles,
   * search, title}; `db` = {q: datascriptQuery, dsl: DB.q, custom: DB.customQuery}.
   */
  async function collect(view, db) {
    const q = db.q
    const [entity] = await pullRows(q, `[?b :block/uuid #uuid ${edn(view.uuid)}]`)
    if (!entity) throw new Unsupported('this table (its view was not found)')
    let rows
    if (view.kind === 'query') {
      const queryRef = entity[':logseq.property/query']
      const [queryEntity] = queryRef ? await pullRows(q, `[(ground ${queryRef.id}) ?b] [?b :block/uuid]`) : []
      const queryText = queryEntity && queryEntity.title
      if (!queryText) throw new Unsupported('this query (no query text)')
      const advanced = /^\s*[[{]/.test(queryText)
      const result = (await (advanced ? db.custom(queryText) : db.dsl(queryText))) || []
      const uuids = result.flat().map((b) => b && b.uuid).filter(Boolean)
      rows = uuids.length ? await pullRows(q, `[(ground ${ground(uuids.map((u) => `#uuid ${edn(u)}`))}) [?u ...]] [?b :block/uuid ?u]`) : []
      // Ties in the sort keep the order core got them in: the query's result order
      const at = new Map(uuids.map((u, i) => [u, i]))
      rows.sort((a, b) => at.get(a.uuid) - at.get(b.uuid))
    } else if (entity[':logseq.property.view/feature-type'] === 'class-objects') {
      const tags = await tagAndDescendants(q, entity[':logseq.property/view-for'].id)
      rows = (await pullRows(q, `[(ground ${ground(tags)}) [?t ...]] [?b :block/tags ?t]`)).sort((a, b) => a.id - b.id)
    } else {
      throw new Unsupported('this kind of table')
    }

    const propKeys = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k.startsWith(':'))))]
    const props = propKeys.length
      ? pulled(await q(`[:find (pull ?p [:db/ident :block/title :logseq.property/type]) :where [(ground ${ground(propKeys)}) [?i ...]] [?p :db/ident ?i]]`))
      : []
    const columns = mapColumns(view.titles, props)

    // Every entity a cell, filter or sort can point at, fetched once
    const filters = entity[':logseq.property.table/filters']
    const filterList = (filters && filters.filters) || []
    const refIds = new Set()
    for (const r of rows) for (const k of Object.keys(r)) for (const v of list(r[k])) if (v && typeof v === 'object' && v.id) refIds.add(v.id)
    for (const [, , m] of filterList) if (m && typeof m === 'object' && !Array.isArray(m) && m.id) refIds.add(m.id)
    const refPull = '[:db/id :block/uuid :block/title :logseq.property/value :block/journal-day]'
    const refList = refIds.size ? pulled(await q(`[:find (pull ?e ${refPull}) :where [(ground ${ground([...refIds])}) [?e ...]] [?e :block/uuid]]`)) : []
    const matchUuids = [...new Set(filterList.flatMap(([, , m]) => (Array.isArray(m) ? m.filter((x) => typeof x === 'string') : [])))]
    const matchList = matchUuids.length ? pulled(await q(`[:find (pull ?e ${refPull}) :where [(ground ${ground(matchUuids.map((u) => `#uuid ${edn(u)}`))}) [?u ...]] [?e :block/uuid ?u]]`)) : []
    const choices = (await q('[:find ?v ?order :where [?v :block/closed-value-property _] [?v :block/order ?order]]')) || []
    const ctx = {
      refs: new Map(refList.map((e) => [e.id, e])),
      byUuid: new Map(matchList.map((e) => [e.uuid, e])),
      choiceOrder: new Map(choices.map(([id, order]) => [id, order])),
      types: new Map(props.map((p) => [p.ident, p[':logseq.property/type']])),
    }

    const kept = sortRows(rows.filter((r) => rowMatches(r, filters, view.search, ctx)), entity[':logseq.property.table/sorting'], ctx)
    return {
      header: columns.map((c) => c.title),
      rows: kept.map((r) => columns.map((c) => resolve(r[c.key], c.type, ctx.refs))),
      uuids: kept.map((r) => r.uuid),
    }
  }

  // ---------- DOM: the button, its menu, delivery ----------

  /** The view a header belongs to, read from the page: {uuid, kind, titles, search, title, count} or null. */
  function readView(head) {
    const tab = [...head.querySelectorAll('[data-view-tab-id]')].find((b) => !b.classList.contains('text-muted-foreground'))
    let uuid, kind, title, countText
    if (tab) {
      uuid = tab.getAttribute('data-view-tab-id').replace(/^view-tab-/, '')
      kind = 'tab'
      const countEl = tab.querySelector('.text-xs')
      countText = countEl ? countEl.textContent : ''
      title = tab.textContent.slice(0, tab.textContent.length - countText.length).trim()
    } else {
      const result = head.closest('.query-result')
      const block = result && result.parentElement && result.parentElement.closest('[blockid]:not(.ls-table-row)')
      if (!block) return null
      uuid = block.getAttribute('blockid')
      kind = 'query'
      countText = head.textContent
      const content = block.querySelector('.block-title-wrap, .block-content')
      title = (content && content.textContent.trim()) || 'query'
    }
    let table = head.parentElement
    while (table && !table.querySelector('.ls-table-header-cell')) table = table.parentElement
    if (!table) return null
    const titles = [...table.querySelectorAll('.ls-table-header-cell')]
      .filter((c) => !c.className.includes('!border-0') && c.textContent.trim() !== '#')
      .map((c) => c.textContent.trim())
    const input = head.querySelector('.view-action-search input')
    return { uuid, kind, title, count: parseCount(countText), titles, search: input ? input.value.trim() : '' }
  }

  // `key` is the format's settings switch (an option of the feature in the Tweaks dialog)
  const FORMATS = [
    { key: 'tableExportCsv', option: 'CSV', label: 'Download CSV', ext: 'csv', type: 'text/csv;charset=utf-8', build: (d) => toCsv(d.header, d.rows) },
    { key: 'tableExportJson', option: 'JSON', label: 'Download JSON', ext: 'json', type: 'application/json', build: (d) => toJson(d.header, d.rows, d.uuids) },
    { key: 'tableExportTsv', option: 'Copy for spreadsheet', label: 'Copy for spreadsheet', build: (d) => toTsv(d.header, d.rows) },
  ]

  const feature = {
    id: 'tableExport',
    title: 'Export tables',
    description: 'Adds an Export button to tag and query tables: download CSV or JSON, or copy the rows for a spreadsheet.',
    category: 'Tables',
    options: FORMATS.map((f) => ({ key: f.key, label: f.option })),
    toCsv, toTsv, toJson, fileName, parseCount, refContent, resolve, matchesFilter, rowMatches, sortRows, mapColumns, collect, readView, Unsupported,
    start(host, sdk) {
      const doc = host.document
      const msg = (s, status) => sdk.UI.showMsg(s, status)
      const db = {
        q: (query) => sdk.DB.datascriptQuery(query),
        dsl: (query) => sdk.DB.q(query),
        custom: (query) => sdk.DB.customQuery(query),
      }

      // A link in Logseq's page, clicked as the page's own code (bound with its bind, fired by its timer): the way
      // core's own exports save files. Clicked from the plugin frame's code, no Save sheet showed in testing.
      const save = (content, name, type) => {
        const a = doc.createElement('a')
        a.href = host.URL.createObjectURL(new host.Blob([content], { type }))
        a.download = name
        a.style.display = 'none'
        doc.body.appendChild(a)
        host.setTimeout(host.Function.prototype.bind.call(host.HTMLElement.prototype.click, a), 0)
        setTimeout(() => { a.remove(); host.URL.revokeObjectURL(a.href) }, 10000)
      }

      const run = async (head, format) => {
        const view = readView(head)
        if (!view) return msg('Inkwell Companion: could not read this table.', 'warning')
        try {
          const data = await collect(view, db)
          if (view.count != null && data.rows.length !== view.count) {
            return msg(`Export stopped: it found ${data.rows.length} rows but the table shows ${view.count}. This table uses something the export can't match yet.`, 'warning')
          }
          const content = format.build(data)
          if (format.ext) {
            save(content, fileName(view.title, format.ext), format.type)
          } else {
            await host.navigator.clipboard.writeText(content)
            msg(`Copied ${data.rows.length} rows. Paste them into Excel or Sheets.`, 'success')
          }
        } catch (e) {
          if (e instanceof Unsupported) msg(`Export can't handle ${e.message} yet.`, 'warning')
          else { console.error('[inkwell-companion] export', e); msg('Export failed; see the console.', 'error') }
        }
      }

      let menu = null
      const closeMenu = () => { if (menu) { menu.remove(); menu = null } }
      const onDocDown = (e) => { if (menu && !menu.contains(e.target) && !e.target.closest('.' + BUTTON)) closeMenu() }
      const onKey = (e) => { if (e.key === 'Escape') closeMenu() }

      const openMenu = (button, head) => {
        closeMenu()
        menu = doc.createElement('div')
        menu.className = MENU
        menu.setAttribute('role', 'menu')
        menu.setAttribute('aria-label', 'Export')
        const r = button.getBoundingClientRect()
        Object.assign(menu.style, {
          position: 'fixed', top: `${r.bottom + 4}px`, left: `${Math.max(8, r.right - 220)}px`, width: '220px', zIndex: 999,
          padding: '4px', borderRadius: '8px', background: 'var(--ls-primary-background-color, #fff)',
          border: '1px solid var(--ls-border-color, rgba(0,0,0,.12))', boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          display: 'flex', flexDirection: 'column',
        })
        const formats = FORMATS.filter((f) => !sdk.settings || sdk.settings[f.key] !== false)
        if (!formats.length) {
          const note = doc.createElement('div')
          note.textContent = 'Every format is off. Turn one on in Inkwell Companion › Tweaks.'
          Object.assign(note.style, { padding: '8px 10px', fontSize: '13px', opacity: '.75' })
          menu.appendChild(note)
        }
        for (const format of formats) {
          const item = doc.createElement('button')
          item.type = 'button'
          item.setAttribute('role', 'menuitem')
          item.textContent = format.label
          Object.assign(item.style, {
            textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: '0', background: 'transparent',
            color: 'inherit', font: 'inherit', fontSize: '14px', cursor: 'pointer',
          })
          item.addEventListener('mouseenter', () => { item.style.background = 'var(--ls-quaternary-background-color, rgba(0,0,0,.06))' })
          item.addEventListener('mouseleave', () => { item.style.background = 'transparent' })
          item.addEventListener('click', () => { closeMenu(); run(head, format) })
          menu.appendChild(item)
        }
        doc.body.appendChild(menu)
        if (formats.length) menu.querySelector('button').focus()
      }

      // view uuid -> exportable? (tag tables and query tables are; All pages, references are not yet)
      const supported = new Map()
      const checking = new WeakSet()
      const isSupported = async (view) => {
        if (view.kind === 'query') return true
        if (!supported.has(view.uuid)) {
          const [entity] = await pullRows(db.q, `[?b :block/uuid #uuid ${edn(view.uuid)}]`).catch(() => [])
          supported.set(view.uuid, !!entity && entity[':logseq.property.view/feature-type'] === 'class-objects')
        }
        return supported.get(view.uuid)
      }

      const addButton = async (head) => {
        checking.add(head)
        const view = readView(head)
        const ok = view && view.titles.length && (await isSupported(view))
        checking.delete(head)
        const actions = head.querySelector('.view-actions')
        if (!ok || !actions || actions.querySelector('.' + BUTTON)) return
        const button = doc.createElement('button')
        button.type = 'button'
        button.className = `${BUTTON} ui__button inline-flex items-center justify-center rounded-md text-sm h-6 px-1`
        button.title = 'Export this table'
        button.setAttribute('aria-label', 'Export this table')
        button.setAttribute('aria-haspopup', 'menu')
        button.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
        button.addEventListener('click', (e) => { e.stopPropagation(); menu ? closeMenu() : openMenu(button, head) })
        const more = actions.querySelector('button:has(.ls-icon-dots)')
        actions.insertBefore(button, more || null)
      }

      // Runs after every DOM change: React can re-render a head without the button, so put it back
      const scan = () => {
        for (const head of doc.querySelectorAll('.ls-view-head')) {
          if (checking.has(head) || head.querySelector('.' + BUTTON)) continue
          const view = readView(head)
          if (view && supported.get(view.uuid) === false) continue
          addButton(head)
        }
      }

      let pending = 0
      const observer = new host.MutationObserver(() => {
        if (pending) return
        pending = host.requestAnimationFrame(() => { pending = 0; scan() })
      })
      observer.observe(doc.body, { childList: true, subtree: true })
      doc.addEventListener('mousedown', onDocDown, true)
      doc.addEventListener('keydown', onKey, true)
      scan()

      return () => {
        observer.disconnect()
        if (pending) host.cancelAnimationFrame(pending)
        doc.removeEventListener('mousedown', onDocDown, true)
        doc.removeEventListener('keydown', onKey, true)
        closeMenu()
        for (const b of doc.querySelectorAll('.' + BUTTON)) b.remove()
      }
    },
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = feature
  else (root.InkwellCompanion = root.InkwellCompanion || { features: [] }).features.push(feature)
})(typeof window !== 'undefined' ? window : globalThis)
