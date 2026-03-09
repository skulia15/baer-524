'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyInviteToken } from '@/lib/invite'

export async function login(email: string, password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  redirect('/dagatal')
}

export async function setPassword(newPassword: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return { error: 'Notandi ekki innskráður' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  const { error: metaErr } = await supabase.auth.updateUser({
    data: { needs_password_reset: false },
  })
  if (metaErr) return { error: metaErr.message }

  redirect('/dagatal')
}

export async function signupViaInvite(
  token: string,
  name: string,
  email: string,
  password: string,
) {
  const payload = await verifyInviteToken(token)
  if (!payload) return { error: 'Ógildur eða útrunnin boðshlekkur' }

  const service = createServiceClient()

  const { data: household } = await service
    .from('household')
    .select('id')
    .eq('id', payload.householdId)
    .single()
  if (!household) return { error: 'Ógildur boðshlekkur' }

  const { data: authData, error: authErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authErr) return { error: authErr.message }

  const { error: profileErr } = await service.from('profile').insert({
    id: authData.user.id,
    email,
    name,
    household_id: payload.householdId,
    role: 'member',
  })
  if (profileErr) {
    await service.auth.admin.deleteUser(authData.user.id)
    return { error: profileErr.message }
  }

  redirect('/login')
}

export async function updatePhone(phone: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return { error: 'Notandi ekki innskráður' }

  const digits = phone.replace(/\D/g, '')
  if (digits && digits.length !== 7) return { error: 'Símanúmer verður að vera 7 tölustafir' }

  const { error } = await supabase
    .from('profile')
    .update({ phone: digits || null })
    .eq('id', user.id)
  if (error) return { error: error.message }

  return { success: true }
}

export async function changePassword(newPassword: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return { error: 'Notandi ekki innskráður' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  // Cookie is cleared locally regardless of server-side error
  await supabase.auth.signOut()
  redirect('/login')
}
