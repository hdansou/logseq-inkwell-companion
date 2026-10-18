// Adds an Export button to tag and query tables: CSV, JSON, or copy for a spreadsheet. Core only copies a view as EDN.
// A table renders only the rows on screen, so rows come from the database: the tag's objects (tags that extend it
// included) or the query's results, with the view's filters, search and sort applied the way core applies them.
// Columns come from the header on screen (order and hidden columns as shown). The export stops when its row count
// differs from the count the table shows, instead of saving a file that quietly differs from the table.
import type { Feature, Host, Sdk } from '../../types'
import { el } from '../../ui/dom'
import { collect, pullByUuid, type Table } from './collect'
import { fileName, toCsv, toJson, toTsv } from './format'
import { Unsupported } from './values'
import { readView, type View } from './view'

const BUTTON = 'inkwell-export-button'
const MENU = 'inkwell-export-menu'
const ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'

interface Format {
  /** the format's settings switch (an option of the feature in the Tweaks dialog) */
  key: string
  option: string
  label: string
  build(t: Table): string
  /** a file to save; without it, the text goes to the clipboard */
  file?: { ext: string; type: string }
}

const FORMATS: Format[] = [
  {
    key: 'tableExportCsv',
    option: 'CSV',
    label: 'Download CSV',
    build: (t) => toCsv(t.header, t.rows),
    file: { ext: 'csv', type: 'text/csv;charset=utf-8' },
  },
  {
    key: 'tableExportJson',
    option: 'JSON',
    label: 'Download JSON',
    build: (t) => toJson(t.header, t.rows, t.uuids),
    file: { ext: 'json', type: 'application/json' },
  },
  {
    key: 'tableExportTsv',
    option: 'Copy for spreadsheet',
    label: 'Copy for spreadsheet',
    build: (t) => toTsv(t.header, t.rows),
  },
]

function start(host: Host, sdk: Sdk): () => void {
  const doc = host.document

  // A link in Logseq's page, clicked as the page's own code (bound with its bind, fired by its timer): the way core's
  // own exports save files. Clicked from the plugin frame's code, no Save sheet showed in testing.
  const save = (content: string, name: string, type: string) => {
    const a = el(doc, 'a', { href: host.URL.createObjectURL(new host.Blob([content], { type })), download: name })
    a.style.display = 'none'
    doc.body.append(a)
    host.setTimeout(host.Function.prototype.bind.call(host.HTMLElement.prototype.click, a) as () => void, 0)
    setTimeout(() => {
      a.remove()
      host.URL.revokeObjectURL(a.href)
    }, 10000)
  }

  const run = async (head: Element, format: Format) => {
    const view = readView(head)
    if (!view) return sdk.showMsg('Inkwell Companion: could not read this table.', 'warning')
    try {
      const table = await collect(view, sdk.db)
      if (view.count != null && table.rows.length !== view.count) {
        const why = "This table uses something the export can't match yet."
        return sdk.showMsg(
          `Export stopped: it found ${table.rows.length} rows but the table shows ${view.count}. ${why}`,
          'warning',
        )
      }
      const content = format.build(table)
      if (format.file) save(content, fileName(view.title, format.file.ext), format.file.type)
      else {
        await host.navigator.clipboard.writeText(content)
        sdk.showMsg(`Copied ${table.rows.length} rows. Paste them into Excel or Sheets.`, 'success')
      }
    } catch (e) {
      if (e instanceof Unsupported) sdk.showMsg(`Export can't handle ${e.message} yet.`, 'warning')
      else {
        console.error('[inkwell-companion] export', e)
        sdk.showMsg('Export failed; see the console.', 'error')
      }
    }
  }

  let menu: HTMLElement | null = null
  const closeMenu = () => {
    menu?.remove()
    menu = null
  }
  const onDocDown = (e: MouseEvent) => {
    const target = e.target as Element
    if (menu && !menu.contains(target) && !target.closest(`.${BUTTON}`)) closeMenu()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeMenu()
  }

  const openMenu = (button: HTMLElement, head: Element) => {
    closeMenu()
    const r = button.getBoundingClientRect()
    const formats = FORMATS.filter((f) => sdk.settings()?.[f.key] !== false)
    const item = (format: Format) =>
      el(
        doc,
        'button',
        {
          type: 'button',
          role: 'menuitem',
          style: {
            textAlign: 'left',
            padding: '8px 10px',
            borderRadius: '6px',
            border: '0',
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            fontSize: '14px',
            cursor: 'pointer',
          },
          onmouseenter: (e: Event) => {
            ;(e.currentTarget as HTMLElement).style.background =
              'var(--ls-quaternary-background-color, rgba(0,0,0,.06))'
          },
          onmouseleave: (e: Event) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          },
          onclick: () => {
            closeMenu()
            void run(head, format)
          },
        },
        format.label,
      )
    menu = el(
      doc,
      'div',
      {
        class: MENU,
        role: 'menu',
        'aria-label': 'Export',
        style: {
          position: 'fixed',
          top: `${r.bottom + 4}px`,
          left: `${Math.max(8, r.right - 220)}px`,
          width: '220px',
          zIndex: '999',
          padding: '4px',
          borderRadius: '8px',
          background: 'var(--ls-primary-background-color, #fff)',
          border: '1px solid var(--ls-border-color, rgba(0,0,0,.12))',
          boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          display: 'flex',
          flexDirection: 'column',
        },
      },
      formats.length
        ? null
        : el(
            doc,
            'div',
            { style: { padding: '8px 10px', fontSize: '13px', opacity: '.75' } },
            'Every format is off. Turn one on in Inkwell Companion › Tweaks.',
          ),
      ...formats.map(item),
    )
    doc.body.append(menu)
    menu.querySelector('button')?.focus()
  }

  // view uuid -> exportable? (tag tables and query tables are; All pages, references are not yet)
  const supported = new Map<string, boolean>()
  const checking = new WeakSet<Element>()
  const isSupported = async (view: View) => {
    if (view.kind === 'query') return true
    if (!supported.has(view.uuid)) {
      const entity = await pullByUuid(sdk.db, view.uuid).catch(() => undefined)
      supported.set(view.uuid, entity?.[':logseq.property.view/feature-type'] === 'class-objects')
    }
    return supported.get(view.uuid) === true
  }

  const addButton = async (head: Element) => {
    checking.add(head)
    const view = readView(head)
    const ok = view && view.titles.length > 0 && (await isSupported(view))
    checking.delete(head)
    const actions = head.querySelector('.view-actions')
    if (!ok || !actions || actions.querySelector(`.${BUTTON}`)) return
    const button = el(doc, 'button', {
      type: 'button',
      class: `${BUTTON} ui__button inline-flex items-center justify-center rounded-md text-sm h-6 px-1`,
      title: 'Export this table',
      'aria-label': 'Export this table',
      'aria-haspopup': 'menu',
      html: ICON,
      onclick: (e: Event) => {
        e.stopPropagation()
        if (menu) closeMenu()
        else openMenu(button, head)
      },
    })
    actions.insertBefore(button, actions.querySelector('button:has(.ls-icon-dots)'))
  }

  // Runs after every DOM change: React can re-render a head without the button, so put it back
  const scan = () => {
    for (const head of doc.querySelectorAll('.ls-view-head')) {
      if (checking.has(head) || head.querySelector(`.${BUTTON}`)) continue
      const view = readView(head)
      if (view && supported.get(view.uuid) === false) continue
      void addButton(head)
    }
  }

  let frame = 0
  const observer = new host.MutationObserver(() => {
    if (frame) return
    frame = host.requestAnimationFrame(() => {
      frame = 0
      scan()
    })
  })
  observer.observe(doc.body, { childList: true, subtree: true })
  doc.addEventListener('mousedown', onDocDown, true)
  doc.addEventListener('keydown', onKey, true)
  scan()

  return () => {
    observer.disconnect()
    if (frame) host.cancelAnimationFrame(frame)
    doc.removeEventListener('mousedown', onDocDown, true)
    doc.removeEventListener('keydown', onKey, true)
    closeMenu()
    for (const b of doc.querySelectorAll(`.${BUTTON}`)) b.remove()
  }
}

export const tableExport: Feature = {
  id: 'tableExport',
  title: 'Export tables',
  description:
    'Adds an Export button to tag and query tables: download CSV or JSON, or copy the rows for a spreadsheet.',
  category: 'Tables',
  options: FORMATS.map((f) => ({ key: f.key, label: f.option })),
  start,
}
