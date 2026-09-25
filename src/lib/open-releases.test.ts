import { describe, expect, it } from 'vitest'
import { openReleases } from './open-releases'

const weeks = [
  {
    id: 'w10',
    week_number: 10,
    week_start: '2026-03-05',
    week_end: '2026-03-11',
    household_id: 'A',
  },
  {
    id: 'w11',
    week_number: 11,
    week_start: '2026-03-12',
    week_end: '2026-03-18',
    household_id: 'B',
  },
  {
    id: 'w12',
    week_number: 12,
    week_start: '2026-03-19',
    week_end: '2026-03-25',
    household_id: 'C',
  },
]
const released = (week: string, date: string, status = 'released') => ({
  week_allocation_id: week,
  date,
  status,
})

describe('openReleases', () => {
  it("lists other households' released days from today on, grouped by week in order", () => {
    const result = openReleases({
      weeks,
      releases: [
        released('w12', '2026-03-20'),
        released('w11', '2026-03-13'),
        released('w11', '2026-03-12'),
        released('w11', '2026-03-10'), // before today
        released('w10', '2026-03-10'), // own week
        released('w12', '2026-03-19', 'claimed'),
      ],
      householdId: 'A',
      today: '2026-03-11',
    })

    expect(result).toEqual([
      { week: weeks[1], dates: ['2026-03-12', '2026-03-13'] },
      { week: weeks[2], dates: ['2026-03-20'] },
    ])
  })
})
