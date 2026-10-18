import { describe, expect, it, vi } from 'vitest'
import { createLoader } from './loader'
import type { Feature, Host, Sdk } from './types'

const feature = (id: string) => {
  const stop = vi.fn()
  const f: Feature = { id, title: id, description: '', category: 'Other', start: vi.fn(() => stop) }
  return { f, stop }
}
const host = {} as Host
const sdk = {} as Sdk

describe('loader', () => {
  it('starts every feature that is on (all are, by default), once', () => {
    const a = feature('a')
    const b = feature('b')
    const loader = createLoader([a.f, b.f], host, sdk)
    loader.sync({})
    loader.sync({})
    expect(a.f.start).toHaveBeenCalledTimes(1)
    expect(a.f.start).toHaveBeenCalledWith(host, sdk)
    expect(b.f.start).toHaveBeenCalledTimes(1)
  })

  it('stops a feature switched off and starts it again when switched on', () => {
    const a = feature('a')
    const loader = createLoader([a.f], host, sdk)
    loader.sync({ a: false })
    expect(a.f.start).not.toHaveBeenCalled()
    loader.sync({ a: true })
    loader.sync({ a: false })
    expect(a.stop).toHaveBeenCalledTimes(1)
    loader.sync({})
    expect(a.f.start).toHaveBeenCalledTimes(2)
  })

  it('stopAll stops what is running', () => {
    const a = feature('a')
    const b = feature('b')
    const loader = createLoader([a.f, b.f], host, sdk)
    loader.sync({ b: false })
    loader.stopAll()
    expect(a.stop).toHaveBeenCalledTimes(1)
    expect(b.stop).not.toHaveBeenCalled()
  })
})
