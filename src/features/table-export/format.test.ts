import { describe, expect, it } from 'vitest'
import { fileName, parseCount, toCsv, toJson, toTsv } from './format'

describe('table-export formats', () => {
  it('CSV has a BOM, CRLF lines, RFC 4180 quoting, and joins many values with "; "', () => {
    const csv = toCsv(
      ['Name', 'Genres', 'Rating'],
      [
        ['Notes, "quoted"', ['Fiction', 'Classic'], 5],
        ['Line\nbreak', [], null],
      ],
    )
    expect(csv).toBe('﻿Name,Genres,Rating\r\n"Notes, ""quoted""",Fiction; Classic,5\r\n"Line\nbreak",,\r\n')
  })

  it('TSV flattens tabs and line breaks so each row stays one spreadsheet row', () => {
    expect(
      toTsv(
        ['A', 'B'],
        [
          ['x\ty', 'one\ntwo'],
          [true, ['p', 'q']],
        ],
      ),
    ).toBe('A\tB\nx y\tone two\ntrue\tp; q')
  })

  it("formula-like text stays text in CSV and TSV (leading '), numbers and JSON untouched", () => {
    const rows = [['=HYPERLINK("http://x")', '+1', '-y', '@SUM(A1)', -5, 'plain', ['=a', 'b']]]
    const header = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    expect(toTsv(header, rows).split('\n')[1]?.split('\t')).toEqual([
      `'=HYPERLINK("http://x")`,
      "'+1",
      "'-y",
      "'@SUM(A1)",
      '-5',
      'plain',
      "'=a; b",
    ])
    expect(toCsv(header, rows).split('\r\n')[1]).toBe(`"'=HYPERLINK(""http://x"")",'+1,'-y,'@SUM(A1),-5,plain,'=a; b`)
    expect(JSON.parse(toJson(header, rows, ['u']))[0].A).toBe('=HYPERLINK("http://x")')
  })

  it('JSON keeps types and arrays, puts the uuid first, and numbers repeated titles', () => {
    const rows = JSON.parse(toJson(['Name', 'Rating', 'Name'], [['Kindred', null, 'dup']], ['u1']))
    expect(rows).toEqual([{ uuid: 'u1', Name: 'Kindred', Rating: null, 'Name 2': 'dup' }])
    expect(Object.keys(rows[0])).toEqual(['uuid', 'Name', 'Rating', 'Name 2'])
  })

  it('file names drop characters that are unsafe on any OS', () => {
    expect(fileName('Books: 2026/Q3 "draft"', 'csv')).toBe('Books 2026 Q3 draft.csv')
    expect(fileName('', 'json')).toBe('table.json')
  })

  it('parseCount reads a tab count and a query title count', () => {
    expect(parseCount('4')).toBe(4)
    expect(parseCount('Live query (12)')).toBe(12)
    expect(parseCount('')).toBeNull()
  })
})
