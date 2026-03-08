'use server'

import { createClient } from '@/lib/supabase/server'

export async function releaseDays(weekAllocationId: string, dates: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('role, household_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Prófíll ekki fundinn' }

  const { data: allocation } = await supabase
    .from('week_allocation')
    .select('*, year:year_id(house_id)')
    .eq('id', weekAllocationId)
    .single()
  if (!allocation) return { error: 'Vika ekki fundin' }

  if (allocation.household_id !== profile.household_id) {
    return { error: 'Þetta er ekki þín vika' }
  }

  if (profile.role === 'head') {
    const { error } = await supabase.from('day_release').insert(
      dates.map((date) => ({
        week_allocation_id: weekAllocationId,
        date,
        status: 'released' as const,
        claimed_by_household_id: null,
      })),
    )
    if (error) return { error: error.message }

    const { data: households } = await supabase
      .from('household')
      .select('id')
      .eq('house_id', (allocation.year as { house_id: string }).house_id)
      .neq('id', profile.household_id)

    if (households) {
      const { data: profiles } = await supabase
        .from('profile')
        .select('id')
        .in(
          'household_id',
          households.map((h) => h.id),
        )

      if (profiles) {
        await supabase.from('notification').insert(
          profiles.map((p) => ({
            user_id: p.id,
            type: 'release' as const,
            reference_id: weekAllocationId,
            reference_type: 'week_allocation',
            message: `${dates.length} dagur/dagar losaðir í viku ${allocation.week_number}`,
            read: false,
          })),
        )
      }
    }

    return { success: true }
  } else {
    const { error } = await supabase.from('request').insert({
      year_id: allocation.year_id,
      requesting_household_id: profile.household_id,
      target_week_allocation_id: weekAllocationId,
      requested_days: dates,
      status: 'pending_own_head' as const,
      created_by: user.id,
    })
    if (error) return { error: error.message }

    const { data: headProfile } = await supabase
      .from('profile')
      .select('id')
      .eq('household_id', profile.household_id)
      .eq('role', 'head')
      .single()

    if (headProfile) {
      await supabase.from('notification').insert({
        user_id: headProfile.id,
        type: 'member_action_pending' as const,
        message: 'Meðlimur óskar eftir að losa daga – bíður samþykkis',
        read: false,
      })
    }

    return { success: true }
  }
}

export async function retractRelease(dayReleaseIds: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { error } = await supabase
    .from('day_release')
    .delete()
    .in('id', dayReleaseIds)
    .eq('status', 'released')

  if (error) return { error: error.message }
  return { success: true }
}
