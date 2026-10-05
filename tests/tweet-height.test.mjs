import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const feature = createRequire(import.meta.url)('../src/features/tweet-height.js')
const resize = (height) => JSON.stringify({ 'twttr.embed': { jsonrpc: '2.0', method: 'twttr.private.resize', id: 'embed-0', params: [{ width: 550, height }] } })

describe('tweet-height parseResize', () => {
  test('reads the height of a Twitter resize message (JSON string, as the embed sends it)', () => {
    assert.equal(feature.parseResize(resize(833)), 833)
  })
  test('accepts an already-parsed object and rounds up', () => {
    assert.equal(feature.parseResize(JSON.parse(resize(832.2))), 833)
  })
  test('ignores other twttr.embed methods, bad heights and unrelated data', () => {
    const initialized = JSON.stringify({ 'twttr.embed': { method: 'twttr.private.initialized', params: [{}] } })
    for (const data of [initialized, resize(0), resize(-5), resize('tall'), 'not json', null, undefined, 42, {}]) {
      assert.equal(feature.parseResize(data), null, String(data))
    }
  })
})

describe('tweet-height start/stop', () => {
  const makeHost = (frame) => {
    const listeners = new Set()
    return {
      listeners,
      addEventListener: (_, fn) => listeners.add(fn),
      removeEventListener: (_, fn) => listeners.delete(fn),
      document: { querySelectorAll: () => [frame] },
    }
  }
  const frame = () => ({ contentWindow: {}, style: {} })
  const send = (host, data, over) => host.listeners.forEach((fn) => fn({ origin: 'https://platform.twitter.com', data, ...over }))

  test('sets the height on the iframe that sent the message, and only that one', () => {
    const mine = frame(), other = frame()
    const host = makeHost(mine)
    feature.start(host)
    send(host, resize(700), { source: other.contentWindow })
    assert.equal(mine.style.height, undefined)
    send(host, resize(700), { source: mine.contentWindow })
    assert.equal(mine.style.height, '700px')
  })
  test('ignores messages from any other origin', () => {
    const mine = frame(), host = makeHost(mine)
    feature.start(host)
    send(host, resize(700), { source: mine.contentWindow, origin: 'https://evil.example' })
    assert.equal(mine.style.height, undefined)
  })
  test('stop removes the listener', () => {
    const host = makeHost(frame())
    const stop = feature.start(host)
    assert.equal(host.listeners.size, 1)
    stop()
    assert.equal(host.listeners.size, 0)
  })
})
