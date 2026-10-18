// Which view a table header on screen belongs to, read from Logseq's page (Logseq-DB 2.0.2 markup).
import { parseCount } from './format'

export interface View {
  uuid: string
  kind: 'tab' | 'query'
  title: string
  count: number | null
  titles: string[]
  search: string
}

/** The view of a `.ls-view-head`, or null when the header is not a tag or query table's. */
export function readView(head: Element): View | null {
  let uuid: string
  let kind: View['kind']
  let title: string
  let countText: string
  // Tag tables render tabs; the current one is the tab without the muted class
  const tab = [...head.querySelectorAll('[data-view-tab-id]')].find(
    (b) => !b.classList.contains('text-muted-foreground'),
  )
  if (tab) {
    uuid = (tab.getAttribute('data-view-tab-id') ?? '').replace(/^view-tab-/, '')
    kind = 'tab'
    countText = tab.querySelector('.text-xs')?.textContent ?? ''
    const text = tab.textContent ?? ''
    title = text.slice(0, text.length - countText.length).trim()
  } else {
    // Query tables have no tabs: the view is the query block itself
    const block = head.closest('.query-result')?.parentElement?.closest('[blockid]:not(.ls-table-row)')
    if (!block) return null
    uuid = block.getAttribute('blockid') ?? ''
    kind = 'query'
    countText = head.textContent ?? ''
    title = block.querySelector('.block-title-wrap, .block-content')?.textContent?.trim() || 'query'
  }
  let table = head.parentElement
  while (table && !table.querySelector('.ls-table-header-cell')) table = table.parentElement
  if (!table) return null
  // Skip the select-all checkbox and "New property" cells (both !border-0)
  const titles = [...table.querySelectorAll('.ls-table-header-cell')]
    .filter((c) => !c.className.includes('!border-0') && c.textContent?.trim() !== '#')
    .map((c) => c.textContent?.trim() ?? '')
  const search = head.querySelector<HTMLInputElement>('.view-action-search input')?.value.trim() ?? ''
  return { uuid, kind, title, count: parseCount(countText), titles, search }
}
