// Output formats for an exported table. Pure.

/** A cell ready for output: text, number, boolean, empty, or many values. */
export type Out = string | number | boolean | null | undefined | Out[]

const text = (v: Out): string => (v == null ? '' : Array.isArray(v) ? v.map(text).join('; ') : String(v))

/**
 * Text a spreadsheet would run as a formula (=, +, -, @, tab, CR first) gets a leading ' so it stays text: a block
 * titled =HYPERLINK(...) must not become a live formula in Excel or Sheets. Numbers are left as they are.
 */
const cell = (c: Out, s = text(c)): string => (typeof c !== 'number' && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s)

/** RFC 4180 CSV with a UTF-8 BOM (so Excel reads accents) and CRLF line ends; formula-like text kept as text. */
export function toCsv(header: string[], rows: Out[][]): string {
  const quote = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  return `﻿${[header, ...rows].map((r) => r.map((c) => quote(cell(c))).join(',')).join('\r\n')}\r\n`
}

/** Tab-separated text that pastes into Excel or Sheets as cells; formula-like text kept as text. */
export function toTsv(header: string[], rows: Out[][]): string {
  const clean = (c: Out) => cell(c, text(c).replace(/[\t\r\n]+/g, ' '))
  return [header, ...rows].map((r) => r.map(clean).join('\t')).join('\n')
}

/** One object per row keyed by column title (repeated titles get " 2", " 3"), with the block uuid first. */
export function toJson(header: string[], rows: Out[][], uuids: (string | undefined)[]): string {
  const seen = new Map<string, number>()
  const keys = header.map((h) => {
    const n = (seen.get(h) ?? 0) + 1
    seen.set(h, n)
    return n === 1 ? h : `${h} ${n}`
  })
  const objects = rows.map((r, i) => Object.fromEntries([['uuid', uuids[i]], ...keys.map((k, j) => [k, r[j] ?? null])]))
  return `${JSON.stringify(objects, null, 2)}\n`
}

/** A file name from the view's title, safe on every OS. */
export function fileName(title: string, ext: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what it removes
  const unsafe = /[\\/:*?"<>|\u0000-\u001f]+/g
  const base = title.replace(unsafe, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  return `${base || 'table'}.${ext}`
}

/** The row count a view header shows: "All4" (title + count) or "Live query (4)". */
export function parseCount(s: string): number | null {
  const m = /(\d+)\D*$/.exec(s)
  return m ? Number(m[1]) : null
}
