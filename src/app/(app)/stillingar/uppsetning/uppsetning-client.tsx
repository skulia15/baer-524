'use client'

import { saveRotation, setSpringWeek } from '@/actions/year'
import { RotationSorter } from '@/components/forms/rotation-sorter'
import { useBanner } from '@/hooks/use-banner'
import { formatWeekRange } from '@/lib/dates'
import { createClient } from '@/lib/supabase/client'
import { generateAllocations } from '@/lib/weeks'
import type { Household, Year } from '@/types/db'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function UppsetningClient() {
  const router = useRouter()
  const { showBanner } = useBanner()
  const [households, setHouseholds] = useState<Household[]>([])
  const [yearRecord, setYearRecord] = useState<Year | null>(null)
  const [order, setOrder] = useState<string[]>([])
  const [springWeek, setSpringWeekState] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const year = new Date().getFullYear()
      const { data: yr } = await supabase.from('year').select('*').eq('year', year).single()
      if (!yr) return
      setYearRecord(yr)
      setOrder(yr.rotation_order)
      setSpringWeekState(yr.spring_shared_week_number)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: hh } = await supabase.from('household').select('*').eq('house_id', yr.house_id)
      setHouseholds(hh ?? [])
    }
    load()
  }, [])

  const preview =
    yearRecord && households.length > 0
      ? generateAllocations(
          { ...yearRecord, rotation_order: order, spring_shared_week_number: springWeek },
          households,
        )
      : []

  const householdMap = new Map(households.map((h) => [h.id, h]))

  async function handleSave() {
    if (!yearRecord) return
    setLoading(true)
    const result = await saveRotation(yearRecord.id, order)
    if (springWeek !== yearRecord.spring_shared_week_number) {
      await setSpringWeek(yearRecord.id, springWeek)
    }
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner('Snúningsröð vistuð')
      router.push('/dagatal')
    }
    setLoading(false)
  }

  return (
    <div className="px-4 py-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-stone-900">Uppsetning {new Date().getFullYear()}</h1>
      </div>

      <section className="mb-6">
        <p className="mb-3 text-sm font-medium text-stone-700">Snúningsröð:</p>
        <RotationSorter households={households} order={order} onChange={setOrder} />
      </section>

      <section className="mb-6">
        <p className="mb-2 text-sm font-medium text-stone-700">Vinnuvika:</p>
        <select
          value={springWeek ?? ''}
          onChange={(e) => setSpringWeekState(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
        >
          <option value="">Engin</option>
          {preview.map((a) => (
            <option key={a.week_number} value={a.week_number}>
              V.{a.week_number} {formatWeekRange(a.week_start, a.week_end)}
            </option>
          ))}
        </select>
      </section>

      {preview.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 text-sm font-medium text-stone-700">Forskoðun:</p>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-200">
            {preview.map((a) => {
              const hh = a.household_id ? householdMap.get(a.household_id) : null
              const isShared = a.type !== 'household'
              return (
                <div
                  key={a.week_number}
                  className="flex items-center gap-2 border-b border-stone-100 px-3 py-1.5 text-xs last:border-0"
                >
                  <span className="w-8 text-stone-400">V.{a.week_number}</span>
                  {isShared ? (
                    <span className="text-stone-500">
                      {a.type === 'shared_verslunarmannahelgi' ? 'Versló vika' : 'Vinnuvika'}
                    </span>
                  ) : (
                    <>
                      {hh && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: hh.color }}
                        />
                      )}
                      <span className="text-stone-700">{hh?.name ?? '—'}</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {confirming ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-1 text-sm font-semibold text-amber-900">Ertu viss?</p>
          <p className="mb-4 text-xs text-amber-800">
            Allar skipti- og dagabeiðnir, staðfestir notkunardagar og ónotaðir dagar verða
            fjarlægðir þegar uppsetningu ársins er breytt.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-lg border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-700"
            >
              Hætta við
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 rounded-lg bg-green-700 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Vistar...' : 'Já, vista'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={order.length === 0}
          className="w-full rounded-xl bg-green-700 py-3 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:opacity-50"
        >
          Vista
        </button>
      )}
    </div>
  )
}
