// The Tweaks dialog: a card per feature (search, category filters, the feature's options on its card when it is on).
// It reads and writes the plugin's settings, which stay the store; the settings page shows the same switches.
// Drawn in the plugin's own frame (logseq.showMainUI), not in Logseq's page.
import { ALL, categories, isOn, matches } from '../tweaks/model'
import type { Feature, Settings } from '../types'
import { el, type Props } from './dom'
import CSS from './tweaks.css?inline'

const CLOSE_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
const SEARCH_ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'

export interface TweaksOptions {
  features: readonly Feature[]
  getSettings(): Settings
  set(key: string, value: boolean): void
  onClose(): void
  dark: boolean
  font?: string
}

/** Draws the dialog into `doc` (the plugin frame's document). Call refresh when the settings change. */
export function mountTweaks(doc: Document, { features, getSettings, set, onClose, dark, font }: TweaksOptions) {
  const h = <K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props, ...children: (Node | string | null)[]) =>
    el(doc, tag, props, ...children)
  let query = ''
  let category = ALL
  // updateSettings is fire-and-forget: show a value at once, until onSettingsChanged echoes it back (refresh)
  const pending: Record<string, boolean> = {}
  const settings = (): Settings => ({ ...getSettings(), ...pending })
  const toggle = (key: string) => {
    const value = !isOn(settings(), key)
    pending[key] = value
    set(key, value)
    draw()
  }

  const style = h('style', { 'data-ikw': '' }, CSS)
  const search = h('input', {
    type: 'search',
    placeholder: 'Search tweaks',
    'aria-label': 'Search tweaks',
    oninput: (e: Event) => {
      query = (e.target as HTMLInputElement).value.trim()
      draw()
    },
  })
  const cats = h('div', { class: 'ikw-cats', role: 'group', 'aria-label': 'Category' })
  const grid = h('div', { class: 'ikw-grid' })
  const count = h('span')
  const dialog = h(
    'div',
    { class: 'ikw-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ikw-title' },
    h(
      'div',
      { class: 'ikw-head' },
      h(
        'div',
        {},
        h('h1', { id: 'ikw-title' }, 'Tweaks'),
        h('p', {}, 'Inkwell Companion. Turn on the fixes you want; each one applies right away.'),
      ),
      h('button', { type: 'button', class: 'ikw-close', 'aria-label': 'Close', html: CLOSE_ICON, onclick: onClose }),
    ),
    h('div', { class: 'ikw-bar' }, h('label', { class: 'ikw-search', html: SEARCH_ICON }, search), cats),
    grid,
    h('div', { class: 'ikw-foot' }, h('span', {}, 'Saved in Settings › Plugins › Inkwell Companion too.'), count),
  )
  const overlay = h(
    'div',
    { class: `ikw-tweaks${dark ? ' dark' : ''}`, style: font ? { fontFamily: font } : undefined },
    dialog,
  )
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) onClose()
  })

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
    if (e.key !== 'Tab') return
    // keep Tab inside the dialog: past the last control back to the first, and the other way
    const items = [...dialog.querySelectorAll<HTMLElement>('button, input')]
    const edge = e.shiftKey ? items[0] : items.at(-1)
    if (doc.activeElement !== edge) return
    e.preventDefault()
    ;(e.shiftKey ? items.at(-1) : items[0])?.focus()
  }
  doc.addEventListener('keydown', onKey)

  const pill = (key: string, label: string, pressed: boolean, onclick: () => void) =>
    h('button', { type: 'button', class: 'ikw-pill', 'aria-pressed': String(pressed), 'data-key': key, onclick }, label)

  const card = (f: Feature, s: Settings) => {
    const on = isOn(s, f.id)
    const options = on && f.options?.length ? f.options : []
    return h(
      'div',
      { class: 'ikw-card' },
      h(
        'div',
        { class: 'ikw-card-top' },
        h('span', { class: 'ikw-cat' }, f.category),
        h(
          'button',
          {
            type: 'button',
            role: 'switch',
            class: 'ikw-switch',
            'aria-checked': String(on),
            'aria-label': f.title,
            'data-key': f.id,
            onclick: () => toggle(f.id),
          },
          h('span'),
        ),
      ),
      h('div', { class: 'ikw-title' }, f.title),
      h('div', { class: 'ikw-desc' }, f.description),
      options.length
        ? h(
            'div',
            { class: 'ikw-options', role: 'group', 'aria-label': `${f.title} options` },
            h('span', { class: 'ikw-options-label' }, 'Options'),
            ...options.map((o) => pill(o.key, o.label, isOn(s, o.key), () => toggle(o.key))),
          )
        : null,
    )
  }

  function draw() {
    const s = settings()
    const focused = (doc.activeElement as HTMLElement | null)?.dataset?.key
    cats.replaceChildren(
      ...categories(features).map((c) =>
        pill(`cat:${c}`, c, c === category, () => {
          category = c
          draw()
        }),
      ),
    )
    const shown = features.filter((f) => matches(f, query, category))
    grid.replaceChildren(...shown.map((f) => card(f, s)))
    if (!shown.length) {
      grid.append(
        h('div', { class: 'ikw-empty' }, query ? `No tweaks match "${query}".` : 'No tweaks in this category.'),
      )
    }
    count.textContent = `${features.filter((f) => isOn(s, f.id)).length} of ${features.length} on`
    if (focused) doc.querySelector<HTMLElement>(`[data-key="${focused}"]`)?.focus()
  }

  doc.head.append(style)
  doc.body.append(overlay)
  draw()
  // the host shows and focuses the frame after this runs
  const focusTimer = setTimeout(() => {
    doc.defaultView?.focus()
    search.focus()
  }, 60)

  return {
    refresh(): void {
      for (const k of Object.keys(pending)) delete pending[k]
      draw()
    },
    destroy(): void {
      clearTimeout(focusTimer)
      doc.removeEventListener('keydown', onKey)
      overlay.remove()
      style.remove()
    },
  }
}
