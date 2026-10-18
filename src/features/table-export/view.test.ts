// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { QUERY_TABLE, TAG_TABLE } from './fixtures'
import { readView } from './view'

const head = () => document.querySelector('.ls-view-head') as Element

describe('table-export readView', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('a tag table: the current tab gives the view uuid, title and count; columns skip select and New property', () => {
    document.body.innerHTML = TAG_TABLE
    expect(readView(head())).toEqual({
      uuid: 'v1',
      kind: 'tab',
      title: 'All',
      count: 2,
      titles: ['Name', 'Rating'],
      search: 'mid',
    })
  })

  it('a query table: the query block is the view; its title and "Live query (n)" count', () => {
    document.body.innerHTML = QUERY_TABLE
    expect(readView(head())).toEqual({
      uuid: 'q1',
      kind: 'query',
      title: 'Books I finished',
      count: 3,
      titles: ['Name'],
      search: '',
    })
  })

  it('a head with no tab and no query block, or no header cells, is not a view', () => {
    document.body.innerHTML = '<div class="ls-view-head"><div class="view-actions"></div></div>'
    expect(readView(head())).toBeNull()
  })
})
