'use server'

import { isAdmin } from '@/lib/admin'
import { INVITE_TTL_DAYS, signInviteToken } from '@/lib/invite'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Records a single-use invite and returns its sign-up link. The base URL comes from
// config, never from the request's Host header, so links can't point elsewhere.
async function createInviteUrl(
  householdId: string,
  createdBy: string,
): Promise<{ url?: string; error?: string }> {
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  const { data: invite, error } = await createServiceClient()
    .from('invite')
    .insert({
      household_id: householdId,
      created_by: createdBy,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()
  if (error || !invite) return { error: error?.message ?? 'Ekki tókst að búa til boðshlekk' }

  const token = await signInviteToken(householdId, invite.id)
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return { url: `${base}/signup?token=${token}` }
}

export async function adminGenerateInviteLink(
  householdId: string,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  if (!isAdmin(user))
    return { error: 'Aðeins admin getur búið til boðshlekk fyrir aðrar fjölskyldur' }

  return createInviteUrl(householdId, user.id)
}

export async function generateInviteLink(
  householdId: string,
): Promise<{ url?: string; error?: string }> {
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
  if (!profile || (profile.role !== 'head' && !isAdmin(user)))
    return { error: 'Aðeins eigendur geta búið til boðshlekk' }
  if (profile.household_id !== householdId)
    return { error: 'Þú getur aðeins boðið í þína fjölskyldu' }

  return createInviteUrl(householdId, user.id)
}
