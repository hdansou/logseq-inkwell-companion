import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const tweaks = require('../src/tweaks.js')
const features = [require('../src/features/table-export.js'), require('../src/features/tweet-height.js')]

describe('tweaks', () => {
  test('a switch is on unless the settings say false', () => {
    assert.equal(tweaks.isOn(undefined, 'x'), true)
    assert.equal(tweaks.isOn({}, 'x'), true)
    assert.equal(tweaks.isOn({ x: true }, 'x'), true)
    assert.equal(tweaks.isOn({ x: false }, 'x'), false)
  })
  test('categories: All first, then in the order features list them, each once', () => {
    const fs = [{ category: 'Tables' }, { category: 'Embeds' }, { category: 'Tables' }, {}]
    assert.deepEqual(tweaks.categories(fs), ['All', 'Tables', 'Embeds', 'Other'])
  })
  test('search matches every word in title, description, category or option labels; category narrows', () => {
    const f = { title: 'Export tables', description: 'Download CSV', category: 'Tables', options: [{ key: 'k', label: 'Copy for spreadsheet' }] }
    assert.equal(tweaks.matches(f, '', 'All'), true)
    assert.equal(tweaks.matches(f, 'export csv', 'All'), true)
    assert.equal(tweaks.matches(f, 'SPREADSHEET', 'Tables'), true)
    assert.equal(tweaks.matches(f, 'tweet', 'All'), false)
    assert.equal(tweaks.matches(f, '', 'Embeds'), false)
  })
  test('settings schema: the Open Tweaks button first, then per category a heading, the feature, its options', () => {
    const schema = tweaks.settingsSchema(features)
    assert.deepEqual(schema[0], { key: 'openTweaks', type: 'button', title: 'Tweaks', description: schema[0].description, buttonText: 'Open Tweaks', buttonAction: 'openTweaks' })
    assert.deepEqual(schema.slice(1).map((s) => `${s.type}:${s.key}`), [
      'heading:headingTables', 'boolean:tableExport', 'boolean:tableExportCsv', 'boolean:tableExportJson', 'boolean:tableExportTsv',
      'heading:headingEmbeds', 'boolean:tweetHeight',
    ])
    for (const s of schema.filter((x) => x.type === 'boolean')) assert.equal(s.default, true)
  })
  test('every feature has a category, and no two switches share a settings key', () => {
    const keys = features.flatMap((f) => [f.id, ...(f.options || []).map((o) => o.key)])
    for (const f of features) assert.ok(f.category, `${f.id}: category`)
    assert.equal(new Set(keys).size, keys.length)
    assert.ok(!keys.includes('openTweaks'))
  })
})
