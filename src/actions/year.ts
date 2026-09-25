'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { continueRotation, generateAllocations } from '@/lib/weeks'
import type { Household, Year } from '@/types/db'
import { revalidatePath } from 'next/cache'

async function notifyAllUsers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  houseId: string,
  message: string,
) {
  const { data: households } = await supabase.from('household').select('id').eq('house_id', houseId)

  if (!households) return

  const { data: profiles } = await supabase
    .from('profile')
    .select('id')
    .in(
      'household_id',
      households.map((h) => h.id),
    )

  if (!profiles) return

  await createServiceClient()
    .from('notification')
    .insert(
      profiles.map((p) => ({
        user_id: p.id,
        type: 'allocation_changed' as const,
        message,
        read: false,
      })),
    )
}

export async function createYear(year: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('email, household:household_id(house_id)')
    .eq('id', user.id)
    .single()
  if (!profile || profile.email !== process.env.ADMIN_EMAIL)
    return { error: 'Aðeins stjórnandi getur búið til ár' }
  const houseId = (profile.household as unknown as { house_id: string } | null)?.house_id
  if (!houseId) return { error: 'Heimili ekki fundið' }

  const { data: existing } = await supabase
    .from('year')
    .select('id')
    .eq('house_id', houseId)
    .eq('year', year)
    .maybeSingle()
  if (existing) return { error: `Árið ${year} er þegar til` }

  const [{ data: previous }, { data: households }] = await Promise.all([
    supabase
      .from('year')
      .select('*')
      .eq('house_id', houseId)
      .eq('year', year - 1)
      .maybeSingle(),
    supabase.from('household').select('*').eq('house_id', houseId),
  ])
  if (!households?.length) return { error: 'Fjölskyldur ekki fundnar' }

  const rotationOrder = previous
    ? continueRotation(previous as Year, households as Household[])
    : households.map((h) => h.id)

  const { data: created, error: yearErr } = await supabase
    .from('year')
    .insert({
      house_id: houseId,
      year,
      rotation_order: rotationOrder,
      spring_shared_week_number: null,
    })
    .select()
    .single()
  if (yearErr || !created) return { error: yearErr?.message ?? 'Ekki tókst að búa til ár' }

  const allocations = generateAllocations(created as Year, households as Household[])
  const { error: allocErr } = await supabase.from('week_allocation').insert(allocations)
  if (allocErr) {
    await supabase.from('year').delete().eq('id', created.id)
    return { error: allocErr.message }
  }

  await notifyAllUsers(supabase, houseId, `Dagatal ${year} er tilbúið`)

  revalidatePath('/dagatal')
  return { success: true }
}

export async function saveRotation(yearId: string, rotationOrder: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('email, household_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.email !== process.env.ADMIN_EMAIL)
    return { error: 'Aðeins stjórnandi getur breytt snúningsröð' }

  const { data: yearRecord } = await supabase.from('year').select('*').eq('id', yearId).single()
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

  // Must delete referencing rows first — request and swap_proposal have non-cascading FKs to week_allocation.
  // No RLS delete policy exists on these tables so service client is required.
  const service = createServiceClient()
  await service.from('swap_proposal').delete().eq('year_id', yearId)
  await service.from('request').delete().eq('year_id', yearId)

  const { error: deleteErr } = await service.from('week_allocation').delete().eq('year_id', yearId)
  if (deleteErr) return { error: deleteErr.message }

  const updatedYear: Year = { ...yearRecord, rotation_order: rotationOrder }
  const allocations = generateAllocations(updatedYear, households as Household[])

  const { error: insertErr } = await supabase.from('week_allocation').insert(allocations)
  if (insertErr) return { error: insertErr.message }

  await notifyAllUsers(supabase, yearRecord.house_id, 'Snúningsröð ' + yearRecord.year + ' uppfærð')

  revalidatePath('/dagatal')
  return { success: true }
}

export async function updateSpringWeek(yearId: string, weekNumber: number | null) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('email')
    .eq('id', user.id)
    .single()
  if (!profile || profile.email !== process.env.ADMIN_EMAIL)
    return { error: 'Aðeins stjórnandi getur stillt vorsviku' }

  const { data: yearRecord } = await supabase.from('year').select('*').eq('id', yearId).single()
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

  await supabase.from('year').update({ spring_shared_week_number: weekNumber }).eq('id', yearId)

  const updatedYear: Year = { ...yearRecord, spring_shared_week_number: weekNumber }
  const allocations = generateAllocations(updatedYear, households as Household[])

  const service = createServiceClient()
  const { data: existingRows } = await service
    .from('week_allocation')
    .select('id, week_number')
    .eq('year_id', yearId)

  const rowById = new Map((existingRows ?? []).map((r) => [r.week_number, r.id]))

  for (const allocation of allocations) {
    const id = rowById.get(allocation.week_number)
    if (!id) continue
    await service
      .from('week_allocation')
      .update({ type: allocation.type, household_id: allocation.household_id })
      .eq('id', id)
  }

  revalidatePath('/dagatal')
  return { success: true }
}
