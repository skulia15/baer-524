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

  // Pre-load this household's existing plans (shared weeks hold other households' too)
  useEffect(() => {
    if (!allocation) return
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profile')
        .select('household_id')
        .eq('id', user.id)
        .single()
      if (!profile) return
      const { data: plans } = await supabase
        .from('day_plan')
        .select('date')
        .eq('week_allocation_id', allocation.id)
        .eq('household_id', profile.household_id)
      setSelected((plans ?? []).map((p) => p.date))
    }
    load()
  }, [allocation])

  if (!allocation) return <div className="p-4">Hleður...</div>

  const isShared = allocation.type !== 'household'

  async function handleSubmit() {
    if (!allocation) return
    setLoading(true)
    const result = await setDayPlans(allocation.id, selected)
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner(isShared ? 'Skráning vistuð' : 'Dagar staðfestir')
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
        <h1 className="font-semibold">
          {isShared ? 'Skrá mætingu' : 'Staðfesta nýtingu'} — Vika {weekNumber}
        </h1>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        {isShared
          ? 'Sameiginleg vika: merktu dagana sem fjölskyldan þín ætlar að vera í Bæ. Allar fjölskyldur sjá hverjir koma.'
          : 'Merktu dagana sem þú ætlar að vera í Bæ. Þetta er sýnilegt öllum fjölskyldum.'}
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
