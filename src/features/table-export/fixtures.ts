// Test data shared by the table-export suites. Shapes are what logseq.DB.datascriptQuery returned on Logseq-DB 2.0.2
// (2026-10-18): built-in attributes lose their namespace ("title", "tags", "created-at"), properties keep theirs,
// refs are {id}.
import type { Ctx, Ent } from './values'

export const refs = new Map<number, Ent>([
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

export const SHELF = ':user.property/shelf-x'
export const RATING = ':user.property/rating-x'
export const FINISHED = ':user.property/finished-x'
export const GENRES = ':user.property/genres-x'
export const READ = ':user.property/read-x'
export const AUTHOR = ':user.property/author-x'
export const STARTED = ':user.property/started-x'

export const ctx: Ctx = {
  refs,
  byUuid: new Map([...refs.values()].map((e) => [e.uuid ?? '', e])),
  choiceOrder: new Map([
    [11, 'a0'],
    [10, 'a1'],
  ]),
  types: new Map([
    [RATING, 'number'],
    [FINISHED, 'date'],
    [GENRES, 'node'],
  ]),
}

// Markup trimmed from Logseq-DB 2.0.2 (2026-10-18): a tag page's table and a query block's table.
export const TAG_TABLE = `
<div class="ls-table">
  <div class="ls-view-head">
    <div class="views">
      <button data-view-tab-id="view-tab-v1">All<span class="text-xs">2</span></button>
      <button data-view-tab-id="view-tab-v2" class="text-muted-foreground">Reading<span class="text-xs">1</span></button>
    </div>
    <div class="view-actions">
      <span class="view-action-search"><input value=" mid "></span>
      <button class="more"><span class="ls-icon-dots"></span></button>
    </div>
  </div>
  <div class="ls-table-header-cell !border-0"></div>
  <div class="ls-table-header-cell">Name</div>
  <div class="ls-table-header-cell">Rating</div>
  <div class="ls-table-header-cell !border-0">New property</div>
</div>`

export const QUERY_TABLE = `
<div blockid="q1">
  <div class="block-title-wrap">Books I finished</div>
  <div>
    <div class="query-result">
      <div class="ls-view-head">Live query (3)<div class="view-actions"></div></div>
      <div class="ls-table-header-cell">Name</div>
    </div>
  </div>
</div>`
