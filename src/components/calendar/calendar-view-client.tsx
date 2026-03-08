'use client'

import { useRouter } from 'next/navigation'
import { CalendarView } from './calendar-view'
import type { WeekAllocation, DayRelease, Household } from '@/types/db'

interface Props {
  allocations: WeekAllocation[]
  releases: DayRelease[]
  households: Household[]
  currentHouseholdId: string
  year: number
}

export function CalendarViewClient(props: Props) {
  const router = useRouter()

  return (
    <CalendarView
      {...props}
      onYearChange={(y) => router.push(`/dagatal?ar=${y}`)}
    />
  )
}
