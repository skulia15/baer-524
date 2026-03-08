'use server'

import { createClient } from '@/lib/supabase/server'
import { generateAllocations } from '@/lib/weeks'
import type { Year, Household } from '@/types/db'

async function notifyAllUsers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  houseId: string,
  message: string,
) {
  const { data: households } = await supabase
    .from('household')
    .select('id')
    .eq('house_id', houseId)

  if (!households) return

  const { data: profiles } = await supabase
    .from('profile')
    .select('id')
    .in(
      'household_id',
      households.map((h) => h.id),
    )

  if (!profiles) return

  await supabase.from('notification').insert(
    profiles.map((p) => ({
      user_id: p.id,
      type: 'allocation_changed' as const,
      message,
      read: false,
    })),
  )
}

export async function saveRotation(yearId: string, rotationOrder: string[]) {
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
  if (!profile || profile.role !== 'head')
    return { error: 'Aðeins yfirmenn geta breytt snúningsröð' }

  const { data: yearRecord } = await supabase
    .from('year')
    .select('*')
    .eq('id', yearId)
    .single()
  if (!yearRecord) return { error: 'Ár ekki fundið' }

  const { data: households } = await supabase
    .from('household')
    .select('*')
    .eq('house_id', yearRecord.house_id)
  if (!households) return { error: 'Fjölskyldur ekki fundnar' }

  await supabase.from('allocation_change').insert({
    year_id: yearId,
    changed_by: user.id,
    change_type: 'rotation_order',
    old_value: yearRecord.rotation_order,
    new_value: rotationOrder,
  })

  const { error: updateErr } = await supabase
    .from('year')
    .update({ rotation_order: rotationOrder })
    .eq('id', yearId)
  if (updateErr) return { error: updateErr.message }

  await supabase.from('week_allocation').delete().eq('year_id', yearId)

  const updatedYear: Year = { ...yearRecord, rotation_order: rotationOrder }
  const allocations = generateAllocations(updatedYear, households as Household[])

  const { error: insertErr } = await supabase.from('week_allocation').insert(allocations)
  if (insertErr) return { error: insertErr.message }

  await supabase
    .from('request')
    .update({ status: 'cancelled' })
    .eq('year_id', yearId)
    .in('status', ['pending_own_head', 'pending_releasing_head'])

  await supabase
    .from('swap_proposal')
    .update({ status: 'cancelled' })
    .eq('year_id', yearId)
    .in('status', ['pending_own_head', 'pending_other_head'])

  await notifyAllUsers(
    supabase,
    yearRecord.house_id,
    'Snúningsröð ' + yearRecord.year + ' uppfærð',
  )

  return { success: true }
}

export async function setSpringWeek(yearId: string, weekNumber: number | null) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'head')
    return { error: 'Aðeins yfirmenn geta stillt vorsviku' }

  const { data: yearRecord } = await supabase
    .from('year')
    .select('*')
    .eq('id', yearId)
    .single()
  if (!yearRecord) return { error: 'Ár ekki fundið' }

  const { data: households } = await supabase
    .from('household')
    .select('*')
    .eq('house_id', yearRecord.house_id)
  if (!households) return { error: 'Fjölskyldur ekki fundnar' }

  await supabase.from('allocation_change').insert({
    year_id: yearId,
    changed_by: user.id,
    change_type: 'spring_week',
    old_value: yearRecord.spring_shared_week_number,
    new_value: weekNumber,
  })

  await supabase
    .from('year')
    .update({ spring_shared_week_number: weekNumber })
    .eq('id', yearId)

  await supabase.from('week_allocation').delete().eq('year_id', yearId)
  const updatedYear: Year = { ...yearRecord, spring_shared_week_number: weekNumber }
  const allocations = generateAllocations(updatedYear, households as Household[])
  await supabase.from('week_allocation').insert(allocations)

  await notifyAllUsers(
    supabase,
    yearRecord.house_id,
    'Sameiginleg vika (vor) ' + yearRecord.year + ' uppfærð',
  )

  return { success: true }
}
