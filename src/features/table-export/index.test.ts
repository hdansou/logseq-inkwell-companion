// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { Db, Host, Sdk, Settings } from '../../types'
import { QUERY_TABLE, TAG_TABLE } from './fixtures'
import { tableExport } from './index'
import type { Ent } from './values'

const view: Ent = {
  id: 99,
  uuid: 'v1',
  ':logseq.property.view/feature-type': 'class-objects',
  ':logseq.property/view-for': { id: 210 },
}
const rows: Ent[] = [
  { id: 1, uuid: 'r1', title: 'Middlemarch', ':user.property/rating': 5, 'updated-at': 5 },
  { id: 2, uuid: 'r2', title: 'Midnight', ':user.property/rating': 3, 'updated-at': 9 },
]

const fakeDb = (entity: Ent): Db => ({
  q: async (query) => {
    if (query.includes('#uuid "v1"')) return [[entity]]
    if (query.includes('[?b :block/tags ?t]')) return rows.map((r) => [r])
    if (query.includes('pull ?p'))
      return [[{ ident: ':user.property/rating', title: 'Rating', ':logseq.property/type': 'number' }]]
    return []
  },
  dsl: async () => [],
  custom: async () => [],
})

let settings: Settings
let sdk: Sdk & { showMsg: Mock<Sdk['showMsg']> }
let stop: () => void

const button = () => document.querySelector<HTMLButtonElement>('.inkwell-export-button')
const items = () => [...document.querySelectorAll('.inkwell-export-menu [role=menuitem]')].map((b) => b.textContent)
const start = async (markup = TAG_TABLE, entity = view) => {
  document.body.innerHTML = markup
  sdk = { settings: () => settings, showMsg: vi.fn<Sdk['showMsg']>(), db: fakeDb(entity) }
  stop = tableExport.start(window as Host, sdk)
  await vi.waitFor(() => expect(button()).not.toBeNull())
}

describe('table-export button and menu', () => {
  beforeEach(() => {
    settings = {}
  })
  afterEach(() => stop?.())

  it('adds an Export button before the "⋯" button of a tag table', async () => {
    await start()
    const actions = document.querySelector('.view-actions')
    expect(button()?.getAttribute('aria-label')).toBe('Export this table')
    expect(button()?.nextElementSibling?.className).toBe('more')
    expect(actions?.querySelectorAll('.inkwell-export-button')).toHaveLength(1)
  })

  it('adds one to a query table too', async () => {
    await start(QUERY_TABLE)
    expect(button()).not.toBeNull()
  })

  it('adds none to other tables (All pages, references)', async () => {
    document.body.innerHTML = TAG_TABLE
    const q = vi.fn(async () => [[{ id: 99, ':logseq.property.view/feature-type': 'all-pages' }]])
    stop = tableExport.start(window as Host, { settings: () => settings, showMsg: vi.fn(), db: { ...fakeDb(view), q } })
    await vi.waitFor(() => expect(q).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    expect(button()).toBeNull()
  })

  it('the menu offers only the formats switched on', async () => {
    settings = { tableExportJson: false }
    await start()
    button()?.click()
    expect(items()).toEqual(['Download CSV', 'Copy for spreadsheet'])
  })

  it('with every format off, the menu says where to turn one on', async () => {
    settings = { tableExportCsv: false, tableExportJson: false, tableExportTsv: false }
    await start()
    button()?.click()
    expect(items()).toEqual([])
    expect(document.querySelector('.inkwell-export-menu')?.textContent).toMatch(/Tweaks/)
  })

  it('Copy for spreadsheet puts the rows on the clipboard as TSV, newest update first', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true })
    await start()
    button()?.click()
    ;[...document.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
      .find((b) => b.textContent === 'Copy for spreadsheet')
      ?.click()
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('Name\tRating\nMidnight\t3\nMiddlemarch\t5'))
    expect(sdk.showMsg).toHaveBeenCalledWith('Copied 2 rows. Paste them into Excel or Sheets.', 'success')
  })

  it('stops with a message when its row count differs from the count the table shows', async () => {
    await start(TAG_TABLE.replace('<span class="text-xs">2</span>', '<span class="text-xs">3</span>'))
    button()?.click()
    ;[...document.querySelectorAll<HTMLButtonElement>('[role=menuitem]')][0]?.click()
    await vi.waitFor(() => expect(sdk.showMsg).toHaveBeenCalled())
    expect(sdk.showMsg.mock.calls[0]?.[0]).toMatch(/found 2 rows but the table shows 3/)
  })

  it('stop removes the buttons and the open menu', async () => {
    await start()
    button()?.click()
    stop()
    expect(button()).toBeNull()
    expect(document.querySelector('.inkwell-export-menu')).toBeNull()
  })
})
