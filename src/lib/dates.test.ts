import { describe, expect, it } from 'vitest'
import { formatDay, formatRelativeTime, formatWeekRange, weekDates } from './dates'

// Use local midnight to avoid UTC timezone parsing issues
const date = (year: number, month: number, day: number) => new Date(year, month - 1, day)

describe('formatWeekRange', () => {
  it('formats a Thu–Wed range in Icelandic', () => {
    // Thu Jan 1 – Wed Jan 7, 2026
    const result = formatWeekRange(date(2026, 1, 1), date(2026, 1, 7))
    expect(result).toBe('fim 1. jan – mið 7. jan')
  })

  it('formats a range spanning two months', () => {
    // Thu Jul 30 – Wed Aug 5, 2026
    const result = formatWeekRange(date(2026, 7, 30), date(2026, 8, 5))
    expect(result).toBe('fim 30. júl – mið 5. ágú')
  })

  it('accepts ISO date strings', () => {
    // Use a fixed date to avoid timezone issues: create ISO string from local date
    const start = date(2026, 6, 4) // Thu Jun 4, 2026
    const end = date(2026, 6, 10) // Wed Jun 10, 2026
    const startStr = `2026-06-04`
    const endStr = `2026-06-10`
    // Compare both forms produce same result
    expect(formatWeekRange(start, end)).toBe(formatWeekRange(startStr, endStr))
  })

  it('uses correct Icelandic month abbreviations for all months', () => {
    const monthAbbr = [
      'jan',
      'feb',
      'mar',
      'apr',
      'maí',
      'jún',
      'júl',
      'ágú',
      'sep',
      'okt',
      'nóv',
      'des',
    ]
    for (let m = 1; m <= 12; m++) {
      // Use 1st of each month (any weekday is fine for this test)
      const result = formatWeekRange(date(2026, m, 1), date(2026, m, 7))
      expect(result).toContain(monthAbbr[m - 1])
    }
  })
})

describe('formatDay', () => {
  it('formats Thursday correctly', () => {
    // Jan 1, 2026 is a Thursday
    const result = formatDay(date(2026, 1, 1))
    expect(result).toBe('Fim 1. jan')
  })

  it('formats Wednesday correctly', () => {
    // Jan 7, 2026 is a Wednesday
    const result = formatDay(date(2026, 1, 7))
    expect(result).toBe('Mið 7. jan')
  })

  it('capitalizes the first letter of day abbreviation', () => {
    const result = formatDay(date(2026, 1, 5)) // Monday
    expect(result[0]).toBe(result[0].toUpperCase())
    expect(result[1]).toBe(result[1].toLowerCase())
  })

  it('formats all Icelandic day abbreviations correctly', () => {
    // Jan 2026: Thu 1, Fri 2, Sat 3, Sun 4, Mon 5, Tue 6, Wed 7
    const expected = ['Fim', 'Fös', 'Lau', 'Sun', 'Mán', 'Þri', 'Mið']
    for (let i = 0; i < 7; i++) {
      const result = formatDay(date(2026, 1, i + 1))
      expect(result.startsWith(expected[i])).toBe(true)
    }
  })
})

describe('formatRelativeTime', () => {
  it('returns "Í gær" for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(formatRelativeTime(yesterday)).toBe('Í gær')
  })

  it('returns minutes for recent times today', () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
    const result = formatRelativeTime(recent)
    expect(result).toBe('Fyrir 30 mín.')
  })

  it('returns hours for times earlier today', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const result = formatRelativeTime(twoHoursAgo)
    expect(result).toBe('Fyrir 2 klst.')
  })

  it('returns days for older dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(threeDaysAgo)
    expect(result).toBe('Fyrir 3 dögum')
  })

  it('accepts ISO string input', () => {
    const d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(d.toISOString())
    expect(result).toBe('Fyrir 3 dögum')
  })
})

describe('weekDates', () => {
  it('returns the 7 ISO dates of a Thu–Wed week, crossing month and year ends', () => {
    expect(weekDates('2026-12-31')).toEqual([
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
      '2027-01-04',
      '2027-01-05',
      '2027-01-06',
    ])
  })
})
