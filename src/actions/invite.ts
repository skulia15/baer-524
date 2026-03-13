'use server'

import { signInviteToken } from '@/lib/invite'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

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
    .select('role, household_id, email')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.email === process.env.ADMIN_EMAIL
  if (!profile || (profile.role !== 'head' && !isAdmin))
    return { error: 'Aðeins eigendur geta búið til boðshlekk' }
  if (profile.household_id !== householdId)
    return { error: 'Þú getur aðeins boðið í þína fjölskyldu' }

  const token = await signInviteToken(householdId)

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const url = `${protocol}://${host}/signup?token=${token}`

  return { url }
}
