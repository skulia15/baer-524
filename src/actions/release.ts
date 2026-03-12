'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function releaseDays(weekAllocationId: string, dates: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('role, household_id, email')
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

  const canRelease = profile.role === 'head' || profile.email === process.env.ADMIN_EMAIL
  if (!canRelease) {
    return { error: 'Aðeins eigendur geta losað daga' }
  }

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
      await createServiceClient()
        .from('notification')
        .insert(
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
}

export async function setDayPlans(weekAllocationId: string, dates: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('household_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Prófíll ekki fundinn' }

  const { data: alloc } = await supabase
    .from('week_allocation')
    .select('household_id')
    .eq('id', weekAllocationId)
    .single()
  if (!alloc || alloc.household_id !== profile.household_id) return { error: 'Ekki heimild' }

  await supabase.from('day_plan').delete().eq('week_allocation_id', weekAllocationId)

  if (dates.length > 0) {
    const { error } = await supabase.from('day_plan').insert(
      dates.map((date) => ({
        week_allocation_id: weekAllocationId,
        date,
        household_id: profile.household_id,
      })),
    )
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function retractRelease(dayReleaseIds: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('household_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Prófíll ekki fundinn' }

  // Verify all rows belong to the caller's household before deleting
  const { data: rows } = await supabase
    .from('day_release')
    .select('id, week_allocation:week_allocation_id(household_id)')
    .in('id', dayReleaseIds)
    .eq('status', 'released')

  if (!rows || rows.length !== dayReleaseIds.length) {
    return { error: 'Einn eða fleiri dagar fundust ekki eða eru þegar teknir' }
  }

  const allOwned = rows.every(
    (r) =>
      (r.week_allocation as unknown as { household_id: string } | null)?.household_id ===
      profile.household_id,
  )
  if (!allOwned) return { error: 'Þetta eru ekki þínir dagar' }

  const { error } = await supabase.from('day_release').delete().in('id', dayReleaseIds)

  if (error) return { error: error.message }
  return { success: true }
}
