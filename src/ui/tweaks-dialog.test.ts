// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { Feature, Settings } from '../types'
import { mountTweaks, type TweaksOptions } from './tweaks-dialog'

const features: Feature[] = [
  {
    id: 'tableExport',
    title: 'Export tables',
    description: 'CSV or JSON',
    category: 'Tables',
    options: [{ key: 'tableExportCsv', label: 'CSV' }],
    start: () => () => {},
  },
  { id: 'tweetHeight', title: 'Fit embedded tweets', description: 'Tweets', category: 'Embeds', start: () => () => {} },
]

let settings: Settings
let set: Mock<TweaksOptions['set']>
let onClose: Mock<TweaksOptions['onClose']>
let dialog: ReturnType<typeof mountTweaks>

const cards = () => [...document.querySelectorAll('.ikw-card .ikw-title')].map((n) => n.textContent)
const toggle = (key: string) => document.querySelector<HTMLButtonElement>(`[data-key="${key}"]`)
const search = (text: string) => {
  const input = document.querySelector('input[type=search]') as HTMLInputElement
  input.value = text
  input.dispatchEvent(new Event('input'))
}

describe('Tweaks dialog', () => {
  beforeEach(() => {
    settings = {}
    set = vi.fn<TweaksOptions['set']>()
    onClose = vi.fn<TweaksOptions['onClose']>()
    dialog = mountTweaks(document, { features, getSettings: () => settings, set, onClose, dark: false })
  })
  afterEach(() => dialog.destroy())

  it('shows a card per feature with its switch, and how many are on', () => {
    expect(cards()).toEqual(['Export tables', 'Fit embedded tweets'])
    expect(toggle('tweetHeight')?.getAttribute('role')).toBe('switch')
    expect(toggle('tweetHeight')?.getAttribute('aria-checked')).toBe('true')
    expect(document.querySelector('.ikw-foot')?.textContent).toMatch('2 of 2 on')
  })

  it('a switch saves the new value and shows it at once; options show only while the feature is on', () => {
    expect(toggle('tableExportCsv')).not.toBeNull()
    toggle('tableExport')?.click()
    expect(set).toHaveBeenCalledWith('tableExport', false)
    expect(toggle('tableExport')?.getAttribute('aria-checked')).toBe('false')
    expect(toggle('tableExportCsv')).toBeNull()
    expect(document.querySelector('.ikw-foot')?.textContent).toMatch('1 of 2 on')
  })

  it('an option is a pressed pill that saves its own key', () => {
    expect(toggle('tableExportCsv')?.getAttribute('aria-pressed')).toBe('true')
    toggle('tableExportCsv')?.click()
    expect(set).toHaveBeenCalledWith('tableExportCsv', false)
  })

  it('refresh shows settings changed elsewhere', () => {
    settings = { tweetHeight: false }
    dialog.refresh()
    expect(toggle('tweetHeight')?.getAttribute('aria-checked')).toBe('false')
  })

  it('search and the category pills narrow the cards; no match says so', () => {
    search('tweets')
    expect(cards()).toEqual(['Fit embedded tweets'])
    search('zzz')
    expect(document.querySelector('.ikw-empty')?.textContent).toBe('No tweaks match "zzz".')
    search('')
    toggle('cat:Tables')?.click()
    expect(cards()).toEqual(['Export tables'])
    expect(toggle('cat:Tables')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('Escape, the close button and a click on the backdrop close it', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    document.querySelector<HTMLButtonElement>('.ikw-close')?.click()
    document.querySelector('.ikw-tweaks')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('destroy removes everything it added', () => {
    dialog.destroy()
    expect(document.querySelector('.ikw-tweaks')).toBeNull()
    expect(document.head.querySelector('style[data-ikw]')).toBeNull()
  })
})
