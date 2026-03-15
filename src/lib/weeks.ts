import { addDays, getDay, startOfYear, getYear, format } from 'date-fns'
import type { WeekAllocation, Year, Household } from '@/types/db'

// Set to false to revert to unattributed shared weeks (original behaviour).
export const SHARED_WEEK_HAS_OWNER = true

export interface Week {
  week_number: number
  week_start: Date // Thursday
  week_end: Date // Wednesday
}

// Week 1 = first Thu–Wed block whose Thursday falls in `year`
export function generateThursdayWeeks(year: number): Week[] {
  const weeks: Week[] = []

  // Find first Thursday on or after Jan 1 of `year`
  const jan1 = startOfYear(new Date(year, 0, 1))
  let thursday = jan1
  while (getDay(thursday) !== 4) {
    // 4 = Thursday
    thursday = addDays(thursday, 1)
  }

  let weekNumber = 1
  while (getYear(thursday) === year) {
    const wednesday = addDays(thursday, 6)
    weeks.push({
      week_number: weekNumber,
      week_start: thursday,
      week_end: wednesday,
    })
    thursday = addDays(thursday, 7)
    weekNumber++
  }

  return weeks
}

// First Monday of August → find the Thu–Wed block containing it
export function findVerslunarmannahelgiWeek(weeks: Week[]): number {
  const year = getYear(weeks[0].week_start)
  const aug1 = new Date(year, 7, 1) // August 1
  let firstMonday = aug1
  while (getDay(firstMonday) !== 1) {
    // 1 = Monday
    firstMonday = addDays(firstMonday, 1)
  }

  const target = firstMonday
  for (const week of weeks) {
    if (week.week_start <= target && target <= week.week_end) {
      return week.week_number
    }
  }
  return -1
}

export function generateAllocations(
  yearRecord: Year,
  households: Household[],
): Omit<WeekAllocation, 'id'>[] {
  const weeks = generateThursdayWeeks(yearRecord.year)
  const verslunarWeekNum = findVerslunarmannahelgiWeek(weeks)
  const springWeekNum = yearRecord.spring_shared_week_number

  let rotationIndex = 0

  return weeks.map((week) => {
    const base = {
      year_id: yearRecord.id,
      week_number: week.week_number,
      week_start: format(week.week_start, 'yyyy-MM-dd'),
      week_end: format(week.week_end, 'yyyy-MM-dd'),
    }

    if (week.week_number === verslunarWeekNum) {
      if (SHARED_WEEK_HAS_OWNER) {
        const householdId = yearRecord.rotation_order[rotationIndex % yearRecord.rotation_order.length]
        rotationIndex++ // household sacrifices their slot
        return { ...base, type: 'shared_verslunarmannahelgi' as const, household_id: householdId }
      }
      return { ...base, type: 'shared_verslunarmannahelgi' as const, household_id: null }
    }
    if (springWeekNum && week.week_number === springWeekNum) {
      if (SHARED_WEEK_HAS_OWNER) {
        const householdId = yearRecord.rotation_order[rotationIndex % yearRecord.rotation_order.length]
        rotationIndex++ // household sacrifices their slot
        return { ...base, type: 'shared_spring' as const, household_id: householdId }
      }
      return { ...base, type: 'shared_spring' as const, household_id: null }
    }

    const householdId =
      yearRecord.rotation_order[rotationIndex % yearRecord.rotation_order.length]
    rotationIndex++
    return { ...base, type: 'household' as const, household_id: householdId }
  })
}
