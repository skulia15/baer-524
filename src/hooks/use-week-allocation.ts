'use client'

import { weekDates } from '@/lib/dates'
import { yearFromParam } from '@/lib/rotation-year'
import { createClient } from '@/lib/supabase/client'
import type { WeekAllocation } from '@/types/db'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// Week addressed by the current `/dagatal/vika/[weekNumber]/...?ar=` URL
export function useWeekAllocation() {
  const { weekNumber } = useParams<{ weekNumber: string }>()
  const year = yearFromParam(useSearchParams().get('ar'))
  const [allocation, setAllocation] = useState<WeekAllocation | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: yr } = await supabase.from('year').select('id').eq('year', year).single()
      if (!yr) return
      const { data } = await supabase
        .from('week_allocation')
        .select('*')
        .eq('year_id', yr.id)
        .eq('week_number', Number.parseInt(weekNumber))
        .single()
      setAllocation(data)
    }
    load()
  }, [weekNumber, year])

  return {
    weekNumber,
    year,
    allocation,
    days: allocation ? weekDates(allocation.week_start) : [],
  }
}
