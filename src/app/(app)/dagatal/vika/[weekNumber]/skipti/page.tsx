'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DayPicker } from '@/components/forms/day-picker'
import { createSwap } from '@/actions/swap'
import { useBanner } from '@/hooks/use-banner'
import { createClient } from '@/lib/supabase/client'
import { addDays } from 'date-fns'
import type { WeekAllocation, Household } from '@/types/db'

type AllocWithHousehold = WeekAllocation & { household: Household }

export default function SkiptiPage() {
  const { weekNumber } = useParams<{ weekNumber: string }>()
  const router = useRouter()
  const { showBanner } = useBanner()

  const [myAllocations, setMyAllocations] = useState<AllocWithHousehold[]>([])
  const [otherAllocations, setOtherAllocations] = useState<AllocWithHousehold[]>([])

  const [allocAId, setAllocAId] = useState('')
  const [allocBId, setAllocBId] = useState('')
  const [daysA, setDaysA] = useState<string[]>([])
  const [daysB, setDaysB] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
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

      const year = new Date().getFullYear()
      const { data: yr } = await supabase.from('year').select('id').eq('year', year).single()
      if (!yr) return

      const { data: allocs } = await supabase
        .from('week_allocation')
        .select('*, household:household_id(*)')
        .eq('year_id', yr.id)
        .eq('type', 'household')
        .order('week_number')

      const all = (allocs ?? []) as AllocWithHousehold[]
      const mine = all.filter((a) => a.household_id === profile.household_id)
      const others = all.filter((a) => a.household_id !== profile.household_id)

      setMyAllocations(mine)
      setOtherAllocations(others)

      // Pre-select the week we navigated from on the correct side
      const wn = Number.parseInt(weekNumber)
      const currentAlloc = all.find((a) => a.week_number === wn)
      if (currentAlloc) {
        if (currentAlloc.household_id === profile.household_id) {
          setAllocAId(currentAlloc.id)
        } else {
          setAllocBId(currentAlloc.id)
        }
      }

      setReady(true)
    }
    load()
  }, [weekNumber])

  if (!ready) return <div className="p-4">Hleður...</div>

  function getDays(allocId: string, list: AllocWithHousehold[]): string[] {
    const alloc = list.find((a) => a.id === allocId)
    if (!alloc) return []
    const days: string[] = []
    const s = new Date(alloc.week_start)
    for (let i = 0; i < 7; i++) days.push(addDays(s, i).toISOString().split('T')[0])
    return days
  }

  async function handleSubmit() {
    if (!allocAId || !allocBId || daysA.length === 0 || daysB.length === 0) return
    setLoading(true)
    const result = await createSwap(allocAId, daysA, allocBId, daysB)
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner('Tillaga send')
      router.push(`/dagatal/vika/${weekNumber}`)
    }
    setLoading(false)
  }

  const daysAList = getDays(allocAId, myAllocations)
  const daysBList = getDays(allocBId, otherAllocations)

  return (
    <div className="px-4 py-4 pb-24">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="text-blue-600">
          ←
        </button>
        <h1 className="font-semibold">Leggja til skipti</h1>
      </div>

      <section className="mb-6">
        <p className="mb-2 text-sm font-medium">Þín vika — veldu viku til að bjóða:</p>
        <select
          value={allocAId}
          onChange={(e) => { setAllocAId(e.target.value); setDaysA([]) }}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Veldu þína viku...</option>
          {myAllocations.map((a) => (
            <option key={a.id} value={a.id}>
              V.{a.week_number} ({a.week_start})
            </option>
          ))}
        </select>
        {allocAId && daysAList.length > 0 && (
          <DayPicker days={daysAList} value={daysA} onChange={setDaysA} />
        )}
      </section>

      <section className="mb-6">
        <p className="mb-2 text-sm font-medium">Skipti við — veldu viku annarra:</p>
        <select
          value={allocBId}
          onChange={(e) => { setAllocBId(e.target.value); setDaysB([]) }}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Veldu viku...</option>
          {otherAllocations.map((a) => (
            <option key={a.id} value={a.id}>
              V.{a.week_number} — {a.household?.name ?? '—'} ({a.week_start})
            </option>
          ))}
        </select>
        {allocBId && daysBList.length > 0 && (
          <DayPicker days={daysBList} value={daysB} onChange={setDaysB} />
        )}
      </section>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !allocAId || !allocBId || daysA.length === 0 || daysB.length === 0}
        className="w-full rounded bg-blue-600 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? 'Sendir...' : 'Senda tillögu'}
      </button>
    </div>
  )
}
