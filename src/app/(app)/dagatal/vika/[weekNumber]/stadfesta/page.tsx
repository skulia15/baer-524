'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DayPicker } from '@/components/forms/day-picker'
import { setDayPlans } from '@/actions/release'
import { useBanner } from '@/hooks/use-banner'
import { createClient } from '@/lib/supabase/client'
import { addDays } from 'date-fns'
import type { WeekAllocation } from '@/types/db'

export default function StadfestaDagaPage() {
  const { weekNumber } = useParams<{ weekNumber: string }>()
  const router = useRouter()
  const { showBanner } = useBanner()
  const [allocation, setAllocation] = useState<WeekAllocation | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const year = new Date().getFullYear()
      const { data: yr } = await supabase.from('year').select('id').eq('year', year).single()
      if (!yr) return
      const { data: alloc } = await supabase
        .from('week_allocation')
        .select('*')
        .eq('year_id', yr.id)
        .eq('week_number', Number.parseInt(weekNumber))
        .single()
      if (!alloc) return
      setAllocation(alloc)

      // Pre-load existing plans
      const { data: plans } = await supabase
        .from('day_plan')
        .select('date')
        .eq('week_allocation_id', alloc.id)
      setSelected((plans ?? []).map((p) => p.date))
    }
    load()
  }, [weekNumber])

  if (!allocation) return <div className="p-4">Hleður...</div>

  const days: string[] = []
  const start = new Date(allocation.week_start)
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i).toISOString().split('T')[0])
  }

  async function handleSubmit() {
    if (!allocation) return
    setLoading(true)
    const result = await setDayPlans(allocation.id, selected)
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner('Dagar staðfestir')
      router.push(`/dagatal/vika/${weekNumber}`)
    }
    setLoading(false)
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="text-blue-600">
          ←
        </button>
        <h1 className="font-semibold">Staðfesta nýtingu — Vika {weekNumber}</h1>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Merktu dagana sem þú ætlar að vera í Bæ. Þetta er sýnilegt öllum fjölskyldum.
      </p>
      <DayPicker days={days} value={selected} onChange={setSelected} />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="mt-6 w-full rounded bg-blue-600 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? 'Vistar...' : 'Vista staðfestingar'}
      </button>
    </div>
  )
}
