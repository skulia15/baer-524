import { formatDay, formatWeekRange } from '@/lib/dates'
import { openReleases } from '@/lib/open-releases'
import { rotationYear, weekHref } from '@/lib/rotation-year'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function LausirDagarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)
  const thisYear = rotationYear(today)

  const [{ data: profile }, { data: years }] = await Promise.all([
    supabase.from('profile').select('household_id').eq('id', user.id).single(),
    supabase
      .from('year')
      .select('id, year')
      .in('year', [thisYear, thisYear + 1]),
  ])
  if (!profile) redirect('/login')

  const yearById = new Map((years ?? []).map((y) => [y.id, y.year as number]))
  const { data: weeks } = yearById.size
    ? await supabase
        .from('week_allocation')
        .select('id, year_id, week_number, week_start, week_end, household_id')
        .in('year_id', [...yearById.keys()])
        .gte('week_end', today)
    : { data: [] }
  const weekIds = (weeks ?? []).map((w) => w.id)

  const [{ data: releases }, { data: households }] = await Promise.all([
    weekIds.length
      ? supabase
          .from('day_release')
          .select('week_allocation_id, date, status')
          .in('week_allocation_id', weekIds)
          .eq('status', 'released')
      : Promise.resolve({ data: [] }),
    supabase.from('household').select('id, name, color'),
  ])
  const householdById = new Map((households ?? []).map((h) => [h.id, h]))

  const open = openReleases({
    // Order across the year boundary: next year's weeks come after this year's
    weeks: (weeks ?? []).map((w) => ({
      ...w,
      week_number: w.week_number + ((yearById.get(w.year_id) ?? thisYear) - thisYear) * 100,
      displayWeek: w.week_number as number,
      year: yearById.get(w.year_id) ?? thisYear,
    })),
    releases: releases ?? [],
    householdId: profile.household_id,
    today,
  })

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
        <Link href="/dagatal" className="text-green-700" aria-label="Dagatal">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-semibold text-stone-900">Lausir dagar</h1>
      </div>

      {open.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-stone-400">Engir lausir dagar núna</p>
      )}

      <div className="divide-y divide-stone-100">
        {open.map(({ week, dates }) => {
          const hh = week.household_id ? householdById.get(week.household_id) : null
          return (
            <div key={week.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
                    {hh && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: hh.color }}
                      />
                    )}
                    Vika {week.displayWeek}
                    {hh && <span className="font-normal text-stone-500">— {hh.name}</span>}
                  </div>
                  <div className="text-xs text-stone-400">
                    {formatWeekRange(week.week_start, week.week_end)}
                  </div>
                </div>
                <Link
                  href={weekHref(week.year, week.displayWeek, 'beidni')}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-800"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Óska eftir
                </Link>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dates.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700"
                  >
                    {formatDay(d)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
