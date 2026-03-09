import { describe, it, expect } from 'vitest'
import { generateThursdayWeeks, findVerslunarmannahelgiWeek, generateAllocations } from './weeks'
import type { Year, Household } from '@/types/db'

describe('generateThursdayWeeks', () => {
  it('week 1 starts on the first Thursday of the year', () => {
    const weeks2026 = generateThursdayWeeks(2026)
    // Jan 1, 2026 is a Thursday
    expect(weeks2026[0].week_number).toBe(1)
    expect(weeks2026[0].week_start.getDay()).toBe(4) // Thursday
    expect(weeks2026[0].week_start.getFullYear()).toBe(2026)
    expect(weeks2026[0].week_start.getMonth()).toBe(0) // January
    expect(weeks2026[0].week_start.getDate()).toBe(1)
  })

  it('week ends on Wednesday (6 days after Thursday)', () => {
    const weeks = generateThursdayWeeks(2026)
    for (const week of weeks) {
      expect(week.week_end.getDay()).toBe(3) // Wednesday
      const diff = week.week_end.getTime() - week.week_start.getTime()
      expect(diff).toBe(6 * 24 * 60 * 60 * 1000) // exactly 6 days
    }
  })

  it('all weeks have Thursdays start in the given year', () => {
    const weeks = generateThursdayWeeks(2026)
    for (const week of weeks) {
      expect(week.week_start.getFullYear()).toBe(2026)
      expect(week.week_start.getDay()).toBe(4)
    }
  })

  it('generates 52 or 53 weeks', () => {
    const weeks2026 = generateThursdayWeeks(2026)
    expect(weeks2026.length).toBeGreaterThanOrEqual(52)
    expect(weeks2026.length).toBeLessThanOrEqual(53)
  })

  it('week numbers are sequential starting at 1', () => {
    const weeks = generateThursdayWeeks(2026)
    weeks.forEach((week, i) => {
      expect(week.week_number).toBe(i + 1)
    })
  })

  it('consecutive weeks are exactly 7 days apart', () => {
    const weeks = generateThursdayWeeks(2026)
    for (let i = 1; i < weeks.length; i++) {
      const diff = weeks[i].week_start.getTime() - weeks[i - 1].week_start.getTime()
      expect(diff).toBe(7 * 24 * 60 * 60 * 1000)
    }
  })

  it('works for a year where Jan 1 is not Thursday (2025: Wednesday)', () => {
    const weeks2025 = generateThursdayWeeks(2025)
    // Jan 1, 2025 is Wednesday. First Thursday is Jan 2.
    expect(weeks2025[0].week_start.getDate()).toBe(2)
    expect(weeks2025[0].week_start.getMonth()).toBe(0)
    expect(weeks2025[0].week_start.getDay()).toBe(4)
  })
})

describe('findVerslunarmannahelgiWeek', () => {
  it('finds the week containing the first Monday of August in 2026', () => {
    const weeks = generateThursdayWeeks(2026)
    const weekNum = findVerslunarmannahelgiWeek(weeks)
    // First Monday of August 2026 = August 3
    // That week: Thu Jul 30 – Wed Aug 5
    const week = weeks.find((w) => w.week_number === weekNum)!
    expect(week).toBeDefined()
    const aug3 = new Date(2026, 7, 3) // August 3, 2026
    expect(week.week_start <= aug3 && aug3 <= week.week_end).toBe(true)
  })

  it('finds the week containing the first Monday of August in 2025', () => {
    const weeks = generateThursdayWeeks(2025)
    const weekNum = findVerslunarmannahelgiWeek(weeks)
    // First Monday of August 2025 = August 4
    const week = weeks.find((w) => w.week_number === weekNum)!
    expect(week).toBeDefined()
    const aug4 = new Date(2025, 7, 4) // August 4, 2025
    expect(week.week_start <= aug4 && aug4 <= week.week_end).toBe(true)
  })

  it('returned week starts on a Thursday', () => {
    const weeks = generateThursdayWeeks(2026)
    const weekNum = findVerslunarmannahelgiWeek(weeks)
    const week = weeks.find((w) => w.week_number === weekNum)!
    expect(week.week_start.getDay()).toBe(4)
  })
})

describe('generateAllocations', () => {
  const households: Household[] = [
    { id: 'hh-a', house_id: 'house-1', name: 'Arnar', color: '#22c55e' },
    { id: 'hh-b', house_id: 'house-1', name: 'Maggi', color: '#3b82f6' },
    { id: 'hh-c', house_id: 'house-1', name: 'Ketill', color: '#f97316' },
  ]

  const yearRecord: Year = {
    id: 'year-1',
    house_id: 'house-1',
    year: 2026,
    rotation_order: ['hh-a', 'hh-b', 'hh-c'],
    spring_shared_week_number: null,
  }

  it('generates one allocation per week', () => {
    const weeks = generateThursdayWeeks(2026)
    const allocations = generateAllocations(yearRecord, households)
    expect(allocations.length).toBe(weeks.length)
  })

  it('verslunarmannahelgi week has correct type', () => {
    const allocations = generateAllocations(yearRecord, households)
    const verslunar = allocations.find((a) => a.type === 'shared_verslunarmannahelgi')
    expect(verslunar).toBeDefined()
    expect(verslunar!.household_id).toBeNull()
  })

  it('only one verslunarmannahelgi week per year', () => {
    const allocations = generateAllocations(yearRecord, households)
    const count = allocations.filter((a) => a.type === 'shared_verslunarmannahelgi').length
    expect(count).toBe(1)
  })

  it('spring shared week is marked when set', () => {
    const withSpring: Year = { ...yearRecord, spring_shared_week_number: 18 }
    const allocations = generateAllocations(withSpring, households)
    const spring = allocations.find((a) => a.week_number === 18)
    expect(spring!.type).toBe('shared_spring')
    expect(spring!.household_id).toBeNull()
  })

  it('rotation cycles through households in order', () => {
    const allocations = generateAllocations(yearRecord, households)
    const household = allocations.filter((a) => a.type === 'household')
    expect(household[0].household_id).toBe('hh-a')
    expect(household[1].household_id).toBe('hh-b')
    expect(household[2].household_id).toBe('hh-c')
    expect(household[3].household_id).toBe('hh-a')
  })

  it('rotation resumes correctly after shared week', () => {
    const withSpring: Year = { ...yearRecord, spring_shared_week_number: 5 }
    const allocations = generateAllocations(withSpring, households)
    const household = allocations.filter((a) => a.type === 'household')
    // Rotation should continue uninterrupted across shared week
    const ids = household.map((a) => a.household_id)
    const expectedPattern = ['hh-a', 'hh-b', 'hh-c']
    ids.forEach((id, i) => {
      expect(id).toBe(expectedPattern[i % 3])
    })
  })

  it('week_start and week_end are ISO date strings', () => {
    const allocations = generateAllocations(yearRecord, households)
    for (const a of allocations) {
      expect(a.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(a.week_end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('all allocations reference the correct year_id', () => {
    const allocations = generateAllocations(yearRecord, households)
    for (const a of allocations) {
      expect(a.year_id).toBe('year-1')
    }
  })

  it('handles single-household rotation', () => {
    const singleHousehold = [households[0]]
    const singleYear: Year = { ...yearRecord, rotation_order: ['hh-a'] }
    const allocations = generateAllocations(singleYear, singleHousehold)
    const householdAllocs = allocations.filter((a) => a.type === 'household')
    expect(householdAllocs.every((a) => a.household_id === 'hh-a')).toBe(true)
  })
})
