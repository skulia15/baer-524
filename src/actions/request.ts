'use server'

import { createClient } from '@/lib/supabase/server'

export async function createRequest(targetAllocationId: string, requestedDays: string[]) {
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
    .select('year_id, household_id, week_number')
    .eq('id', targetAllocationId)
    .single()
  if (!allocation) return { error: 'Vika ekki fundin' }

  const isHead = profile.role === 'head'
  const status = isHead ? 'pending_releasing_head' : 'pending_own_head'

  const { data: request, error } = await supabase
    .from('request')
    .insert({
      year_id: allocation.year_id,
      requesting_household_id: profile.household_id,
      target_week_allocation_id: targetAllocationId,
      requested_days: requestedDays,
      status,
      created_by: user.id,
    })
    .select()
    .single()
  if (error) return { error: error.message }

  if (isHead) {
    const { data: releasingHead } = await supabase
      .from('profile')
      .select('id')
      .eq('household_id', allocation.household_id)
      .eq('role', 'head')
      .single()

    if (releasingHead) {
      await supabase.from('notification').insert({
        user_id: releasingHead.id,
        type: 'request_received' as const,
        reference_id: request.id,
        reference_type: 'request',
        message: `Beiðni um daga í viku ${allocation.week_number}`,
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
        reference_id: request.id,
        reference_type: 'request',
        message: 'Meðlimur sendi beiðni – bíður samþykkis',
        read: false,
      })
    }
  }

  return { success: true }
}

export async function approveRequest(requestId: string) {
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
  if (!profile || profile.role !== 'head') return { error: 'Aðeins yfirmenn geta samþykkt' }

  const { data: request } = await supabase
    .from('request')
    .select(
      '*, allocation:target_week_allocation_id(household_id, week_number, year_id)',
    )
    .eq('id', requestId)
    .single()
  if (!request) return { error: 'Beiðni ekki fundin' }

  const allocation = request.allocation as {
    household_id: string
    week_number: number
    year_id: string
  }

  if (request.status === 'pending_own_head') {
    if (profile.household_id !== request.requesting_household_id) {
      return { error: 'Þú getur ekki samþykkt þessa beiðni' }
    }

    await supabase
      .from('request')
      .update({ status: 'pending_releasing_head' })
      .eq('id', requestId)

    const { data: releasingHead } = await supabase
      .from('profile')
      .select('id')
      .eq('household_id', allocation.household_id)
      .eq('role', 'head')
      .single()

    if (releasingHead) {
      await supabase.from('notification').insert({
        user_id: releasingHead.id,
        type: 'request_received' as const,
        reference_id: requestId,
        reference_type: 'request',
        message: `Beiðni um daga í viku ${allocation.week_number}`,
        read: false,
      })
    }

    return { success: true }
  }

  if (request.status === 'pending_releasing_head') {
    if (profile.household_id !== allocation.household_id) {
      return { error: 'Þú getur ekki samþykkt þessa beiðni' }
    }

    const { error: claimErr } = await supabase
      .from('day_release')
      .update({
        status: 'claimed',
        claimed_by_household_id: request.requesting_household_id,
      })
      .eq('week_allocation_id', request.target_week_allocation_id)
      .in('date', request.requested_days)

    if (claimErr) return { error: claimErr.message }

    await supabase
      .from('request')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', requestId)

    const { data: conflicting } = await supabase
      .from('request')
      .select('id, created_by')
      .eq('target_week_allocation_id', request.target_week_allocation_id)
      .in('status', ['pending_own_head', 'pending_releasing_head'])
      .neq('id', requestId)

    if (conflicting && conflicting.length > 0) {
      await supabase
        .from('request')
        .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
        .in(
          'id',
          conflicting.map((r) => r.id),
        )

      const userIds = conflicting.map((r) => r.created_by)
      if (userIds.length > 0) {
        await supabase.from('notification').insert(
          userIds.map((uid) => ({
            user_id: uid,
            type: 'auto_cancelled' as const,
            message: 'Beiðni þín var sjálfkrafa afturkölluð vegna annars samþykkis',
            read: false,
          })),
        )
      }
    }

    await supabase.from('notification').insert({
      user_id: request.created_by,
      type: 'request_resolved' as const,
      reference_id: requestId,
      reference_type: 'request',
      message: 'Beiðni þín var samþykkt',
      read: false,
    })

    return { success: true }
  }

  return { error: 'Beiðni er ekki í bíðstöðu' }
}

export async function declineRequest(requestId: string, reason?: string) {
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
  if (!profile || profile.role !== 'head') return { error: 'Aðeins yfirmenn geta hafnað' }

  const { data: request } = await supabase
    .from('request')
    .select('created_by')
    .eq('id', requestId)
    .single()
  if (!request) return { error: 'Beiðni ekki fundin' }

  await supabase
    .from('request')
    .update({
      status: 'declined',
      decline_reason: reason ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  await supabase.from('notification').insert({
    user_id: request.created_by,
    type: 'request_resolved' as const,
    reference_id: requestId,
    reference_type: 'request',
    message: reason ? `Beiðni hafnað: ${reason}` : 'Beiðni hafnað',
    read: false,
  })

  return { success: true }
}

export async function cancelRequest(requestId: string) {
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
    .from('request')
    .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('requesting_household_id', profile.household_id)
    .in('status', ['pending_own_head', 'pending_releasing_head'])

  if (error) return { error: error.message }
  return { success: true }
}
