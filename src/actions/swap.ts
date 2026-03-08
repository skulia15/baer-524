'use server'

import { createClient } from '@/lib/supabase/server'

export async function createSwap(
  allocationAId: string,
  daysA: string[],
  allocationBId: string,
  daysB: string[],
) {
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

  const { data: allocationA } = await supabase
    .from('week_allocation')
    .select('year_id, household_id, week_number')
    .eq('id', allocationAId)
    .single()
  if (!allocationA) return { error: 'Vika A ekki fundin' }

  const { data: allocationB } = await supabase
    .from('week_allocation')
    .select('household_id, week_number')
    .eq('id', allocationBId)
    .single()
  if (!allocationB) return { error: 'Vika B ekki fundin' }

  const isHead = profile.role === 'head'
  const status = isHead ? 'pending_other_head' : 'pending_own_head'

  const { data: swap, error } = await supabase
    .from('swap_proposal')
    .insert({
      year_id: allocationA.year_id,
      household_a_id: profile.household_id,
      allocation_a_id: allocationAId,
      days_a: daysA,
      household_b_id: allocationB.household_id,
      allocation_b_id: allocationBId,
      days_b: daysB,
      status,
      created_by: user.id,
    })
    .select()
    .single()
  if (error) return { error: error.message }

  if (isHead) {
    const { data: otherHead } = await supabase
      .from('profile')
      .select('id')
      .eq('household_id', allocationB.household_id)
      .eq('role', 'head')
      .single()

    if (otherHead) {
      await supabase.from('notification').insert({
        user_id: otherHead.id,
        type: 'swap_received' as const,
        reference_id: swap.id,
        reference_type: 'swap_proposal',
        message: `Skiptatillaga fyrir viku ${allocationA.week_number} / ${allocationB.week_number}`,
        read: false,
      })
    }
  } else {
    const { data: ownHead } = await supabase
      .from('profile')
      .select('id')
      .eq('household_id', profile.household_id)
      .eq('role', 'head')
      .single()

    if (ownHead) {
      await supabase.from('notification').insert({
        user_id: ownHead.id,
        type: 'member_action_pending' as const,
        reference_id: swap.id,
        reference_type: 'swap_proposal',
        message: 'Meðlimur sendi skiptatillögu – bíður samþykkis',
        read: false,
      })
    }
  }

  return { success: true }
}

export async function approveSwap(swapId: string) {
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
  if (!profile || profile.role !== 'head') return { error: 'Aðeins eigendur geta samþykkt' }

  const { data: swap } = await supabase.from('swap_proposal').select('*').eq('id', swapId).single()
  if (!swap) return { error: 'Skiptatillaga ekki fundin' }

  if (swap.status === 'pending_own_head') {
    if (profile.household_id !== swap.household_a_id) {
      return { error: 'Þú getur ekki samþykkt þessa tillögu' }
    }

    await supabase.from('swap_proposal').update({ status: 'pending_other_head' }).eq('id', swapId)

    const { data: otherHead } = await supabase
      .from('profile')
      .select('id')
      .eq('household_id', swap.household_b_id)
      .eq('role', 'head')
      .single()

    if (otherHead) {
      await supabase.from('notification').insert({
        user_id: otherHead.id,
        type: 'swap_received' as const,
        reference_id: swapId,
        reference_type: 'swap_proposal',
        message: 'Skiptatillaga bíður samþykkis þíns',
        read: false,
      })
    }

    return { success: true }
  }

  if (swap.status === 'pending_other_head') {
    if (profile.household_id !== swap.household_b_id) {
      return { error: 'Þú getur ekki samþykkt þessa tillögu' }
    }

    const { data: allocA } = await supabase
      .from('week_allocation')
      .select('household_id')
      .eq('id', swap.allocation_a_id)
      .single()
    const { data: allocB } = await supabase
      .from('week_allocation')
      .select('household_id')
      .eq('id', swap.allocation_b_id)
      .single()

    if (!allocA || !allocB) return { error: 'Vikur ekki fundnar' }

    await supabase
      .from('week_allocation')
      .update({ household_id: allocB.household_id })
      .eq('id', swap.allocation_a_id)

    await supabase
      .from('week_allocation')
      .update({ household_id: allocA.household_id })
      .eq('id', swap.allocation_b_id)

    await supabase
      .from('swap_proposal')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', swapId)

    await supabase.from('notification').insert({
      user_id: swap.created_by,
      type: 'swap_resolved' as const,
      reference_id: swapId,
      reference_type: 'swap_proposal',
      message: 'Skiptatillaga þín var samþykkt',
      read: false,
    })

    return { success: true }
  }

  return { error: 'Tillaga er ekki í bíðstöðu' }
}

export async function declineSwap(swapId: string, reason?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase.from('profile').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'head') return { error: 'Aðeins eigendur geta hafnað' }

  const { data: swap } = await supabase
    .from('swap_proposal')
    .select('created_by')
    .eq('id', swapId)
    .single()
  if (!swap) return { error: 'Tillaga ekki fundin' }

  await supabase
    .from('swap_proposal')
    .update({
      status: 'declined',
      decline_reason: reason ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', swapId)

  await supabase.from('notification').insert({
    user_id: swap.created_by,
    type: 'swap_resolved' as const,
    reference_id: swapId,
    reference_type: 'swap_proposal',
    message: reason ? `Skiptatillögu hafnað: ${reason}` : 'Skiptatillögu hafnað',
    read: false,
  })

  return { success: true }
}

export async function cancelSwap(swapId: string) {
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

  const { error } = await supabase
    .from('swap_proposal')
    .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
    .eq('id', swapId)
    .eq('household_a_id', profile.household_id)
    .in('status', ['pending_own_head', 'pending_other_head'])

  if (error) return { error: error.message }
  return { success: true }
}
