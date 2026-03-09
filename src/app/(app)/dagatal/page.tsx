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

  const { data: profile } = await supabase
    .from('profile')
    .select('*, household:household_id(*)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const { data: yearRecord } = await supabase
    .from('year')
    .select('*')
    .eq('year', currentYear)
    .single()

  const { data: allocations } = await supabase
    .from('week_allocation')
    .select('*')
    .eq('year_id', yearRecord?.id ?? '')
    .order('week_number')

  const { data: releases } = await supabase
    .from('day_release')
    .select('*')
    .in(
      'week_allocation_id',
      (allocations ?? []).map((a) => a.id),
    )

  const { data: households } = await supabase
    .from('household')
    .select('*')
    .eq('house_id', (profile.household as { house_id: string }).house_id)

  const { data: approvedSwaps } = await supabase
    .from('swap_proposal')
    .select('allocation_a_id, allocation_b_id, household_a_id, household_b_id')
    .eq('year_id', yearRecord?.id ?? '')
    .eq('status', 'approved')

  let pendingCount = 0
  if (profile.role === 'head') {
    // Only count requests targeting weeks owned by THIS household
    const myAllocationIds = (allocations ?? [])
      .filter((a) => a.household_id === profile.household_id)
      .map((a) => a.id)

    const { count: reqCount } = myAllocationIds.length
      ? await supabase
          .from('request')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_releasing_head')
          .in('target_week_allocation_id', myAllocationIds)
      : { count: 0 }

    const { count: swapCount } = await supabase
      .from('swap_proposal')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_other_head')
      .eq('household_b_id', profile.household_id)

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
        households={households ?? []}
        currentHouseholdId={profile.household_id}
        year={currentYear}
        approvedSwaps={approvedSwaps ?? []}
      />
    </div>
  )
}
