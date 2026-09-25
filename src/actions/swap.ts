'use server'

import { areDaysInWeek, weekDates } from '@/lib/dates'
import { notificationEmailHtml, sendEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

function emailHtml(swapId: string, message: string, senderMessage?: string | null) {
  return notificationEmailHtml(message, `/tilkynningar/skipti/${swapId}`, senderMessage)
}

export async function createSwap(
  allocationAId: string,
  daysA: string[],
  allocationBId: string,
  daysB: string[],
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

  const { data: allocationA } = await supabase
    .from('week_allocation')
    .select('year_id, household_id, week_number, week_start')
    .eq('id', allocationAId)
    .single()
  if (!allocationA) return { error: 'Vika A ekki fundin' }
  if (allocationA.household_id !== profile.household_id) return { error: 'Þetta er ekki þín vika' }

  const { data: allocationB } = await supabase
    .from('week_allocation')
    .select('household_id, week_number, week_start')
    .eq('id', allocationBId)
    .single()
  if (!allocationB) return { error: 'Vika B ekki fundin' }
  if (!allocationB.household_id || allocationB.household_id === profile.household_id) {
    return { error: 'Veldu viku annarrar fjölskyldu' }
  }

  if (
    !areDaysInWeek(daysA, allocationA.week_start) ||
    !areDaysInWeek(daysB, allocationB.week_start)
  ) {
    return { error: 'Dagar verða að vera innan viðkomandi viku' }
  }

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
      sender_message: senderMessage ?? null,
    })
    .select()
    .single()
  if (error) return { error: error.message }

  if (isHead) {
    const { data: otherHead } = await supabase
      .from('profile')
      .select('id, email')
      .eq('household_id', allocationB.household_id)
      .eq('role', 'head')
      .single()

    if (otherHead) {
      const message = `Skiptatillaga fyrir viku ${allocationA.week_number} / ${allocationB.week_number}`
      await createServiceClient()
        .from('notification')
        .insert({
          user_id: otherHead.id,
          type: 'swap_received' as const,
          reference_id: swap.id,
          reference_type: 'swap_proposal',
          message,
          read: false,
        })
      void sendEmail(
        otherHead.email,
        'Skiptatillaga móttekin',
        emailHtml(swap.id, message, senderMessage),
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
      const message = 'Fjölskyldumeðlimur sendi skiptatillögu – bíður samþykkis'
      await createServiceClient()
        .from('notification')
        .insert({
          user_id: ownHead.id,
          type: 'member_action_pending' as const,
          reference_id: swap.id,
          reference_type: 'swap_proposal',
          message,
          read: false,
        })
      void sendEmail(
        ownHead.email,
        'Fjölskyldumeðlimur bíður samþykkis',
        emailHtml(swap.id, message, senderMessage),
      )
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
      .select('id, email')
      .eq('household_id', swap.household_b_id)
      .eq('role', 'head')
      .single()

    if (otherHead) {
      const message = 'Skiptatillaga bíður samþykkis þíns'
      await createServiceClient()
        .from('notification')
        .insert({
          user_id: otherHead.id,
          type: 'swap_received' as const,
          reference_id: swapId,
          reference_type: 'swap_proposal',
          message,
          read: false,
        })
      void sendEmail(
        otherHead.email,
        'Skiptatillaga bíður samþykkis þíns',
        emailHtml(swapId, message),
      )
    }

    return { success: true }
  }

  if (swap.status === 'pending_other_head') {
    if (profile.household_id !== swap.household_b_id) {
      return { error: 'Þú getur ekki samþykkt þessa tillögu' }
    }

    const { data: allocA } = await supabase
      .from('week_allocation')
      .select('household_id, week_start')
      .eq('id', swap.allocation_a_id)
      .single()
    const { data: allocB } = await supabase
      .from('week_allocation')
      .select('household_id, week_start')
      .eq('id', swap.allocation_b_id)
      .single()

    if (!allocA || !allocB) return { error: 'Vikur ekki fundnar' }

    const daysA: string[] = swap.days_a
    const daysB: string[] = swap.days_b

    const [{ data: takenA }, { data: takenB }] = await Promise.all([
      supabase
        .from('day_release')
        .select('id')
        .eq('week_allocation_id', swap.allocation_a_id)
        .eq('status', 'claimed')
        .in('date', daysA),
      supabase
        .from('day_release')
        .select('id')
        .eq('week_allocation_id', swap.allocation_b_id)
        .eq('status', 'claimed')
        .in('date', daysB),
    ])
    if (takenA?.length || takenB?.length) {
      return { error: 'Einn eða fleiri dagar eru þegar teknir' }
    }
    const isFullWeek = (days: string[], weekStart: string) =>
      weekDates(weekStart).every((d) => days.includes(d))

    if (isFullWeek(daysA, allocA.week_start) && isFullWeek(daysB, allocB.week_start)) {
      // Whole weeks traded: move ownership so the calendar shows the new owner
      await supabase
        .from('week_allocation')
        .update({ household_id: allocB.household_id })
        .eq('id', swap.allocation_a_id)

      await supabase
        .from('week_allocation')
        .update({ household_id: allocA.household_id })
        .eq('id', swap.allocation_b_id)
    } else {
      // Partial: each side's chosen days are claimed by the other household
      const claim = (allocationId: string, days: string[], householdId: string) =>
        days.map((date) => ({
          week_allocation_id: allocationId,
          date,
          status: 'claimed' as const,
          claimed_by_household_id: householdId,
        }))
      const { error: claimErr } = await supabase
        .from('day_release')
        .upsert(
          [
            ...claim(swap.allocation_a_id, daysA, swap.household_b_id),
            ...claim(swap.allocation_b_id, daysB, swap.household_a_id),
          ],
          { onConflict: 'week_allocation_id,date' },
        )
      if (claimErr) return { error: claimErr.message }
    }

    await supabase
      .from('swap_proposal')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', swapId)

    const message = 'Skiptatillaga þín var samþykkt'
    await createServiceClient()
      .from('notification')
      .insert({
        user_id: swap.created_by,
        type: 'swap_resolved' as const,
        reference_id: swapId,
        reference_type: 'swap_proposal',
        message,
        read: false,
      })

    const { data: creator } = await supabase
      .from('profile')
      .select('email')
      .eq('id', swap.created_by)
      .single()
    if (creator)
      void sendEmail(creator.email, 'Skiptatillaga þín samþykkt', emailHtml(swapId, message))

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

  const { data: profile } = await supabase
    .from('profile')
    .select('role, household_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'head') return { error: 'Aðeins eigendur geta hafnað' }

  const { data: swap } = await supabase
    .from('swap_proposal')
    .select('created_by, household_a_id, household_b_id')
    .eq('id', swapId)
    .single()
  if (!swap) return { error: 'Tillaga ekki fundin' }

  if (
    profile.household_id !== swap.household_a_id &&
    profile.household_id !== swap.household_b_id
  ) {
    return { error: 'Þú getur ekki hafnað þessari tillögu' }
  }

  const { data: declined, error: declineErr } = await supabase
    .from('swap_proposal')
    .update({
      status: 'declined',
      decline_reason: reason ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', swapId)
    .in('status', ['pending_own_head', 'pending_other_head'])
    .select('id')
  if (declineErr) return { error: declineErr.message }
  if (!declined?.length) return { error: 'Tillaga er ekki í bíðstöðu' }

  const declineMessage = reason ? `Skiptatillögu hafnað: ${reason}` : 'Skiptatillögu hafnað'
  await createServiceClient()
    .from('notification')
    .insert({
      user_id: swap.created_by,
      type: 'swap_resolved' as const,
      reference_id: swapId,
      reference_type: 'swap_proposal',
      message: declineMessage,
      read: false,
    })

  const { data: creator } = await supabase
    .from('profile')
    .select('email')
    .eq('id', swap.created_by)
    .single()
  if (creator)
    void sendEmail(creator.email, 'Skiptatillögu hafnað', emailHtml(swapId, declineMessage))

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
