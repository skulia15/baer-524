'use server'

import { notificationEmailHtml, sendEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

function emailHtml(requestId: string, message: string, senderMessage?: string | null) {
  return notificationEmailHtml(message, `/tilkynningar/beidni/${requestId}`, senderMessage)
}

export async function createRequest(
  targetAllocationId: string,
  requestedDays: string[],
  senderMessage?: string,
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

  const { data: allocation } = await supabase
    .from('week_allocation')
    .select('year_id, household_id, week_number')
    .eq('id', targetAllocationId)
    .single()
  if (!allocation) return { error: 'Vika ekki fundin' }

  if (allocation.household_id === profile.household_id) return { error: 'Þetta er þín vika' }
  if (requestedDays.length === 0) return { error: 'Veldu að minnsta kosti einn dag' }

  const { data: releasedDays } = await supabase
    .from('day_release')
    .select('date')
    .eq('week_allocation_id', targetAllocationId)
    .eq('status', 'released')
    .in('date', requestedDays)
  if (new Set((releasedDays ?? []).map((r) => r.date)).size !== new Set(requestedDays).size) {
    return { error: 'Einn eða fleiri dagar eru ekki lausir' }
  }

  const isHead = profile.role === 'head'
  const status = isHead ? 'pending_releasing_head' : 'pending_own_head'

  const { data: request, error } = await createServiceClient()
    .from('request')
    .insert({
      year_id: allocation.year_id,
      requesting_household_id: profile.household_id,
      target_week_allocation_id: targetAllocationId,
      requested_days: requestedDays,
      status,
      created_by: user.id,
      sender_message: senderMessage ?? null,
    })
    .select()
    .single()
  if (error) return { error: error.message }

  if (isHead) {
    const { data: releasingHead } = await supabase
      .from('profile')
      .select('id, email')
      .eq('household_id', allocation.household_id)
      .eq('role', 'head')
      .single()

    if (releasingHead) {
      const message = `Beiðni um daga í viku ${allocation.week_number}`
      await createServiceClient()
        .from('notification')
        .insert({
          user_id: releasingHead.id,
          type: 'request_received' as const,
          reference_id: request.id,
          reference_type: 'request',
          message,
          read: false,
        })
      void sendEmail(
        releasingHead.email,
        'Beiðni um daga',
        emailHtml(request.id, message, senderMessage),
      )
    }
  } else {
    const { data: ownHead } = await supabase
      .from('profile')
      .select('id, email')
      .eq('household_id', profile.household_id)
      .eq('role', 'head')
      .single()

    if (ownHead) {
      const message = 'Fjölskyldumeðlimur sendi beiðni – bíður samþykkis'
      await createServiceClient()
        .from('notification')
        .insert({
          user_id: ownHead.id,
          type: 'member_action_pending' as const,
          reference_id: request.id,
          reference_type: 'request',
          message,
          read: false,
        })
      void sendEmail(
        ownHead.email,
        'Fjölskyldumeðlimur bíður samþykkis',
        emailHtml(request.id, message, senderMessage),
      )
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
  if (!profile || profile.role !== 'head') return { error: 'Aðeins eigendur geta samþykkt' }

  const { data: request } = await supabase
    .from('request')
    .select(
      '*, sender_message, allocation:target_week_allocation_id(household_id, week_number, year_id)',
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

    await createServiceClient()
      .from('request')
      .update({ status: 'pending_releasing_head' })
      .eq('id', requestId)

    const { data: releasingHead } = await supabase
      .from('profile')
      .select('id, email')
      .eq('household_id', allocation.household_id)
      .eq('role', 'head')
      .single()

    if (releasingHead) {
      const message = `Beiðni um daga í viku ${allocation.week_number}`
      await createServiceClient()
        .from('notification')
        .insert({
          user_id: releasingHead.id,
          type: 'request_received' as const,
          reference_id: requestId,
          reference_type: 'request',
          message,
          read: false,
        })
      void sendEmail(
        releasingHead.email,
        'Beiðni um daga',
        emailHtml(requestId, message, request.sender_message),
      )
    }

    return { success: true }
  }

  if (request.status === 'pending_releasing_head') {
    if (profile.household_id !== allocation.household_id) {
      return { error: 'Þú getur ekki samþykkt þessa beiðni' }
    }

    const { data: releasedDays } = await supabase
      .from('day_release')
      .select('date')
      .eq('week_allocation_id', request.target_week_allocation_id)
      .eq('status', 'released')
      .in('date', request.requested_days)

    if (!releasedDays || releasedDays.length !== request.requested_days.length) {
      return { error: 'Einn eða fleiri dagar eru ekki lengur lausir' }
    }

    const { error: claimErr } = await createServiceClient()
      .from('day_release')
      .upsert(
        request.requested_days.map((date: string) => ({
          week_allocation_id: request.target_week_allocation_id,
          date,
          status: 'claimed' as const,
          claimed_by_household_id: request.requesting_household_id,
        })),
        { onConflict: 'week_allocation_id,date' },
      )

    if (claimErr) return { error: claimErr.message }

    await createServiceClient()
      .from('request')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', requestId)

    const { data: conflicting } = await supabase
      .from('request')
      .select('id, created_by')
      .eq('target_week_allocation_id', request.target_week_allocation_id)
      .in('status', ['pending_own_head', 'pending_releasing_head'])
      .overlaps('requested_days', request.requested_days)
      .neq('id', requestId)

    if (conflicting && conflicting.length > 0) {
      await createServiceClient()
        .from('request')
        .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
        .in(
          'id',
          conflicting.map((r) => r.id),
        )

      const userIds = conflicting.map((r) => r.created_by)
      if (userIds.length > 0) {
        await createServiceClient()
          .from('notification')
          .insert(
            userIds.map((uid) => ({
              user_id: uid,
              type: 'auto_cancelled' as const,
              message: 'Beiðni þín var sjálfkrafa afturkölluð vegna annars samþykkis',
              read: false,
            })),
          )
      }
    }

    const approveMessage = 'Beiðni þín var samþykkt'
    await createServiceClient()
      .from('notification')
      .insert({
        user_id: request.created_by,
        type: 'request_resolved' as const,
        reference_id: requestId,
        reference_type: 'request',
        message: approveMessage,
        read: false,
      })

    const { data: creator } = await supabase
      .from('profile')
      .select('email')
      .eq('id', request.created_by)
      .single()
    if (creator)
      void sendEmail(creator.email, 'Beiðni þín samþykkt', emailHtml(requestId, approveMessage))

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
    .select('role, household_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'head') return { error: 'Aðeins eigendur geta hafnað' }

  const { data: request } = await supabase
    .from('request')
    .select(
      'created_by, requesting_household_id, allocation:target_week_allocation_id(household_id)',
    )
    .eq('id', requestId)
    .single()
  if (!request) return { error: 'Beiðni ekki fundin' }

  const releasingHouseholdId = (request.allocation as unknown as { household_id: string } | null)
    ?.household_id
  if (
    profile.household_id !== request.requesting_household_id &&
    profile.household_id !== releasingHouseholdId
  ) {
    return { error: 'Þú getur ekki hafnað þessari beiðni' }
  }

  const { data: declined, error: declineErr } = await createServiceClient()
    .from('request')
    .update({
      status: 'declined',
      decline_reason: reason ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .in('status', ['pending_own_head', 'pending_releasing_head'])
    .select('id')
  if (declineErr) return { error: declineErr.message }
  if (!declined?.length) return { error: 'Beiðni er ekki í bíðstöðu' }

  const declineMessage = reason ? `Beiðni hafnað: ${reason}` : 'Beiðni hafnað'
  await createServiceClient()
    .from('notification')
    .insert({
      user_id: request.created_by,
      type: 'request_resolved' as const,
      reference_id: requestId,
      reference_type: 'request',
      message: declineMessage,
      read: false,
    })

  const { data: creator } = await supabase
    .from('profile')
    .select('email')
    .eq('id', request.created_by)
    .single()
  if (creator)
    void sendEmail(creator.email, 'Beiðni þín hafnað', emailHtml(requestId, declineMessage))

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

  const { error } = await createServiceClient()
    .from('request')
    .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('requesting_household_id', profile.household_id)
    .in('status', ['pending_own_head', 'pending_releasing_head'])

  if (error) return { error: error.message }
  return { success: true }
}
