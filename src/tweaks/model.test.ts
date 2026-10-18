import { describe, expect, it } from 'vitest'
import { features } from '../features'
import type { Feature } from '../types'
import { categories, isOn, matches, settingsSchema } from './model'

const feature = (over: Partial<Feature>): Feature => ({
  id: 'x',
  title: 'X',
  description: '',
  category: 'Other',
  start: () => () => {},
  ...over,
})

describe('tweaks model', () => {
  it('a switch is on unless the settings say false', () => {
    expect(isOn(undefined, 'x')).toBe(true)
    expect(isOn({}, 'x')).toBe(true)
    expect(isOn({ x: true }, 'x')).toBe(true)
    expect(isOn({ x: false }, 'x')).toBe(false)
  })

  it('categories: All first, then in the order features list them, each once', () => {
    const fs = [feature({ category: 'Tables' }), feature({ category: 'Embeds' }), feature({ category: 'Tables' })]
    expect(categories(fs)).toEqual(['All', 'Tables', 'Embeds'])
  })

  it('search matches every word in title, description, category or option labels; category narrows', () => {
    const f = feature({
      title: 'Export tables',
      description: 'Download CSV',
      category: 'Tables',
      options: [{ key: 'k', label: 'Copy for spreadsheet' }],
    })
    expect(matches(f, '', 'All')).toBe(true)
    expect(matches(f, 'export csv', 'All')).toBe(true)
    expect(matches(f, 'SPREADSHEET', 'Tables')).toBe(true)
    expect(matches(f, 'tweet', 'All')).toBe(false)
    expect(matches(f, '', 'Embeds')).toBe(false)
  })

  it('settings schema: the Open Tweaks button first, then per category a heading, the feature, its options', () => {
    const schema = settingsSchema(features)
    expect(schema[0]).toMatchObject({
      key: 'openTweaks',
      type: 'button',
      buttonText: 'Open Tweaks',
      buttonAction: 'openTweaks',
    })
    expect(schema.slice(1).map((s) => `${s.type}:${s.key}`)).toEqual([
      'heading:headingTables',
      'boolean:tableExport',
      'boolean:tableExportCsv',
      'boolean:tableExportJson',
      'boolean:tableExportTsv',
      'heading:headingEmbeds',
      'boolean:tweetHeight',
    ])
    for (const s of schema.filter((x) => x.type === 'boolean')) expect(s.default).toBe(true)
  })

  it('no two switches share a settings key, and none is the button', () => {
    const keys = features.flatMap((f) => [f.id, ...(f.options ?? []).map((o) => o.key)])
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).not.toContain('openTweaks')
  })
})
