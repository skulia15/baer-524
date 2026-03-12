import { WeekDetailView } from '@/components/week/week-detail-view'
import { WeekSwipeWrapper } from '@/components/week/week-swipe-wrapper'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export default async function WeekPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>
}) {
  const { weekNumber: wn } = await params
  const weekNumber = Number.parseInt(wn)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Wave 1: profile + year (independent)
  const [{ data: profile }, { data: yearRecord }] = await Promise.all([
    supabase.from('profile').select('*').eq('id', user.id).single(),
    supabase.from('year').select('id').eq('year', new Date().getFullYear()).single(),
  ])

  if (!profile) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  // Wave 2: allocation (needs yearId + weekNumber)
  const { data: allocation } = await supabase
    .from('week_allocation')
    .select('*')
    .eq('year_id', yearRecord?.id ?? '')
    .eq('week_number', weekNumber)
    .single()

  if (!allocation) notFound()

  // Wave 3: all queries that depend only on allocation.id / year_id
  const [{ data: household }, { data: releases }, { data: plans }, { data: approvedSwaps }, { data: allWeeks }] =
    await Promise.all([
      allocation.household_id
        ? supabase.from('household').select('*').eq('id', allocation.household_id).single()
        : Promise.resolve({ data: null }),
      supabase.from('day_release').select('*').eq('week_allocation_id', allocation.id),
      supabase.from('day_plan').select('*').eq('week_allocation_id', allocation.id),
      supabase
        .from('swap_proposal')
        .select('household_a_id, household_b_id, allocation_a_id, allocation_b_id, days_a, days_b')
        .eq('status', 'approved')
        .or(`allocation_a_id.eq.${allocation.id},allocation_b_id.eq.${allocation.id}`),
      supabase
        .from('week_allocation')
        .select('week_number')
        .eq('year_id', yearRecord?.id ?? '')
        .order('week_number'),
    ])

  // All household IDs referenced by swaps + claimed releases
  const householdIdSet = new Set<string>()
  if (allocation.household_id) householdIdSet.add(allocation.household_id)
  for (const s of approvedSwaps ?? []) {
    householdIdSet.add(s.household_a_id)
    householdIdSet.add(s.household_b_id)
  }
  for (const r of releases ?? []) {
    if (r.claimed_by_household_id) householdIdSet.add(r.claimed_by_household_id)
  }

  // Wave 4: transferHouseholds (depends on swap/release results)
  const { data: transferHouseholds } = householdIdSet.size
    ? await supabase.from('household').select('id, name, color').in('id', [...householdIdSet])
    : { data: [] }

  const householdMap = Object.fromEntries((transferHouseholds ?? []).map((h) => [h.id, h]))

  // Build per-day transfer: original owner → new owner
  type Transfer = { from: { name: string; color: string }; to: { name: string; color: string }; type: 'swap' | 'request' }
  const dayTransfers: Record<string, Transfer> = {}

  for (const swap of approvedSwaps ?? []) {
    const days = swap.allocation_a_id === allocation.id ? swap.days_a : swap.days_b
    const from = householdMap[swap.allocation_a_id === allocation.id ? swap.household_a_id : swap.household_b_id]
    const to = householdMap[swap.allocation_a_id === allocation.id ? swap.household_b_id : swap.household_a_id]
    if (from && to) {
      for (const date of days as string[]) {
        dayTransfers[date] = { from, to, type: 'swap' }
      }
    }
  }

  for (const r of releases ?? []) {
    if (r.status === 'claimed' && r.claimed_by_household_id) {
      const from = allocation.household_id ? householdMap[allocation.household_id] : null
      const to = householdMap[r.claimed_by_household_id]
      if (from && to) dayTransfers[r.date] = { from, to, type: 'request' }
    }
  }

  const weekNums = (allWeeks ?? []).map((w) => w.week_number)
  const currentIdx = weekNums.indexOf(weekNumber)
  const prevWeek = currentIdx > 0 ? weekNums[currentIdx - 1] : null
  const nextWeek = currentIdx < weekNums.length - 1 ? weekNums[currentIdx + 1] : null

  return (
    <WeekSwipeWrapper prevWeek={prevWeek} nextWeek={nextWeek}>
      <WeekDetailView
        allocation={allocation}
        household={household ?? null}
        releases={releases ?? []}
        plans={plans ?? []}
        profile={profile}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        dayTransfers={dayTransfers}
      />
    </WeekSwipeWrapper>
  )
}
