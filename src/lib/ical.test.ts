import { beforeAll, describe, expect, it } from 'vitest'
import { feedToken, householdCalendar, isValidFeedToken } from './ical'

beforeAll(() => {
  process.env.INVITE_SECRET = 'test-secret-that-is-at-least-32-characters-long'
})

const households = [
  { id: 'A', name: 'Arnar' },
  { id: 'B', name: 'Maggi' },
]
const weeks = [
  { id: 'w10', week_start: '2026-03-05', type: 'household', household_id: 'A' },
  { id: 'w11', week_start: '2026-03-12', type: 'household', household_id: 'B' },
  { id: 'w31', week_start: '2026-07-30', type: 'shared_verslunarmannahelgi', household_id: null },
]
const NOW = new Date('2026-03-01T12:00:00Z')

const events = (ics: string) =>
  ics
    .split('BEGIN:VEVENT')
    .slice(1)
    .map((e) => ({
      start: e.match(/DTSTART;VALUE=DATE:(\d+)/)?.[1],
      end: e.match(/DTEND;VALUE=DATE:(\d+)/)?.[1],
      summary: e.match(/SUMMARY:(.*)\r\n/)?.[1],
    }))

describe('householdCalendar', () => {
  it('has an all-day event per own week, plus the shared weeks', () => {
    const ics = householdCalendar({ householdId: 'A', households, weeks, claims: [], now: NOW })

    expect(events(ics)).toEqual([
      { start: '20260305', end: '20260312', summary: 'Bær 524' },
      { start: '20260730', end: '20260806', summary: 'Bær 524 – sameiginleg vika (Versló)' },
    ])
  })

  it('leaves out days given away and adds days received', () => {
    const claims = [{ week_allocation_id: 'w10', date: '2026-03-07', claimed_by_household_id: 'B' }]

    const forA = householdCalendar({ householdId: 'A', households, weeks, claims, now: NOW })
    const forB = householdCalendar({ householdId: 'B', households, weeks, claims, now: NOW })

    expect(events(forA).slice(0, 2)).toEqual([
      { start: '20260305', end: '20260307', summary: 'Bær 524' },
      { start: '20260308', end: '20260312', summary: 'Bær 524' },
    ])
    expect(events(forB).slice(0, 2)).toEqual([
      { start: '20260307', end: '20260308', summary: 'Bær 524 (frá Arnar)' },
      { start: '20260312', end: '20260319', summary: 'Bær 524' },
    ])
  })

  it('is a valid calendar document with CRLF lines and escaped text', () => {
    const ics = householdCalendar({
      householdId: 'A',
      households: [{ id: 'A', name: 'Arnar; og co, ehf' }],
      weeks: [weeks[0]],
      claims: [],
      now: NOW,
    })

    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('X-WR-CALNAME:Bær 524 – Arnar\\; og co\\, ehf\r\n')
    expect(ics).toContain('DTSTAMP:20260301T120000Z\r\n')
    expect(ics).toMatch(/UID:A-20260305-own@baer524\r\n/)
  })
})

describe('feed token', () => {
  it('is valid only for the household it was made for', () => {
    const token = feedToken('A')

    expect(isValidFeedToken('A', token)).toBe(true)
    expect(isValidFeedToken('B', token)).toBe(false)
    expect(isValidFeedToken('A', 'nonsense')).toBe(false)
  })
})
