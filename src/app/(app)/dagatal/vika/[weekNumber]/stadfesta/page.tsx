'use client'

import { setDayPlans } from '@/actions/release'
import { DayPicker } from '@/components/forms/day-picker'
import { useBanner } from '@/hooks/use-banner'
import { useWeekAllocation } from '@/hooks/use-week-allocation'
import { weekHref } from '@/lib/rotation-year'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function StadfestaDagaPage() {
  const { weekNumber, year, allocation, days } = useWeekAllocation()
  const router = useRouter()
  const { showBanner } = useBanner()
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Pre-load existing plans
  useEffect(() => {
    if (!allocation) return
    createClient()
      .from('day_plan')
      .select('date')
      .eq('week_allocation_id', allocation.id)
      .then(({ data: plans }) => setSelected((plans ?? []).map((p) => p.date)))
  }, [allocation])

  if (!allocation) return <div className="p-4">Hleður...</div>

  async function handleSubmit() {
    if (!allocation) return
    setLoading(true)
    const result = await setDayPlans(allocation.id, selected)
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner('Dagar staðfestir')
      router.push(weekHref(year, weekNumber))
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
