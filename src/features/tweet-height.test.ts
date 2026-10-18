import { describe, expect, it } from 'vitest'
import type { Host, Sdk } from '../types'
import { parseResize, tweetHeight } from './tweet-height'

const resize = (height: unknown) =>
  JSON.stringify({
    'twttr.embed': { jsonrpc: '2.0', method: 'twttr.private.resize', id: 'embed-0', params: [{ width: 550, height }] },
  })

describe('tweet-height parseResize', () => {
  it('reads the height of a Twitter resize message (JSON string, as the embed sends it)', () => {
    expect(parseResize(resize(833))).toBe(833)
  })

  it('accepts an already-parsed object and rounds up', () => {
    expect(parseResize(JSON.parse(resize(832.2)))).toBe(833)
  })

  it('ignores other twttr.embed methods, bad heights and unrelated data', () => {
    const initialized = JSON.stringify({ 'twttr.embed': { method: 'twttr.private.initialized', params: [{}] } })
    for (const data of [initialized, resize(0), resize(-5), resize('tall'), 'not json', null, undefined, 42, {}]) {
      expect(parseResize(data), String(data)).toBeNull()
    }
  })
})

describe('tweet-height start/stop', () => {
  type Frame = { contentWindow: object; style: { height?: string } }
  const frame = (): Frame => ({ contentWindow: {}, style: {} })
  const makeHost = (f: Frame) => {
    const listeners = new Set<(e: object) => void>()
    const host = {
      addEventListener: (_: string, fn: (e: object) => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: (e: object) => void) => listeners.delete(fn),
      document: { querySelectorAll: () => [f] },
    }
    return { listeners, host: host as unknown as Host }
  }
  const sdk = {} as Sdk
  const send = (listeners: Set<(e: object) => void>, data: string, over: object) => {
    for (const fn of listeners) fn({ origin: 'https://platform.twitter.com', data, ...over })
  }

  it('sets the height on the iframe that sent the message, and only that one', () => {
    const mine = frame()
    const other = frame()
    const { host, listeners } = makeHost(mine)
    tweetHeight.start(host, sdk)
    send(listeners, resize(700), { source: other.contentWindow })
    expect(mine.style.height).toBeUndefined()
    send(listeners, resize(700), { source: mine.contentWindow })
    expect(mine.style.height).toBe('700px')
  })

  it('ignores messages from any other origin', () => {
    const mine = frame()
    const { host, listeners } = makeHost(mine)
    tweetHeight.start(host, sdk)
    send(listeners, resize(700), { source: mine.contentWindow, origin: 'https://evil.example' })
    expect(mine.style.height).toBeUndefined()
  })

  it('stop removes the listener and gives the tweets it sized back their own height', () => {
    const mine = frame()
    const { host, listeners } = makeHost(mine)
    const stop = tweetHeight.start(host, sdk)
    send(listeners, resize(700), { source: mine.contentWindow })
    expect(listeners.size).toBe(1)
    stop()
    expect(listeners.size).toBe(0)
    expect(mine.style.height).toBe('')
  })
})
