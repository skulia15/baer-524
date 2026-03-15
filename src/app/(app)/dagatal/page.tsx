import { CalendarViewClient } from '@/components/calendar/calendar-view-client'
import { ActionBar } from '@/components/ui/action-bar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DagatalPage({
  searchParams,
}: {
  searchParams: Promise<{ ar?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const currentYear = params.ar ? Number.parseInt(params.ar) : new Date().getFullYear()

  // Wave 1: profile + year (independent)
  const [{ data: profile }, { data: yearRecord }] = await Promise.all([
    supabase.from('profile').select('*, household:household_id(*)').eq('id', user.id).single(),
    supabase.from('year').select('*').eq('year', currentYear).single(),
  ])

  if (!profile) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  // Wave 2: allocations + households (allocations needs yearId, households needs house_id)
  const [{ data: allocations }, { data: households }] = await Promise.all([
    supabase
      .from('week_allocation')
      .select('*')
      .eq('year_id', yearRecord?.id ?? '')
      .order('week_number'),
    supabase
      .from('household')
      .select('*')
      .eq('house_id', (profile.household as { house_id: string }).house_id),
  ])

  // Wave 3: releases + approvedSwaps (releases needs alloc IDs, swaps needs yearId)
  const [{ data: releases }, { data: approvedSwaps }] = await Promise.all([
    supabase
      .from('day_release')
      .select('*')
      .in(
        'week_allocation_id',
        (allocations ?? []).map((a) => a.id),
      ),
    supabase
      .from('swap_proposal')
      .select('allocation_a_id, allocation_b_id, household_a_id, household_b_id')
      .eq('year_id', yearRecord?.id ?? '')
      .eq('status', 'approved'),
  ])

  let pendingCount = 0
  if (profile.role === 'head') {
    // Only count requests targeting weeks owned by THIS household
    const myAllocationIds = (allocations ?? [])
      .filter((a) => a.household_id === profile.household_id)
      .map((a) => a.id)

    // Wave 4: both head counts in parallel
    const [{ count: reqCount }, { count: swapCount }] = await Promise.all([
      myAllocationIds.length
        ? supabase
            .from('request')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_releasing_head')
            .in('target_week_allocation_id', myAllocationIds)
        : Promise.resolve({ count: 0 }),
      supabase
        .from('swap_proposal')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_other_head')
        .eq('household_b_id', profile.household_id),
    ])

    pendingCount = (reqCount ?? 0) + (swapCount ?? 0)
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h1 className="font-display text-xl font-semibold text-stone-900">Bær 524</h1>
        </div>
        {profile.role === 'head' && <ActionBar pendingCount={pendingCount} />}
      </div>
      <CalendarViewClient
        allocations={allocations ?? []}
        releases={releases ?? []}
        households={(households ?? []).sort(
          (a, b) =>
            (yearRecord?.rotation_order ?? []).indexOf(a.id) -
            (yearRecord?.rotation_order ?? []).indexOf(b.id),
        )}
        currentHouseholdId={profile.household_id}
        year={currentYear}
        approvedSwaps={approvedSwaps ?? []}
      />
    </div>
  )
}
