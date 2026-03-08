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

  await supabase.auth.updateUser({
    data: { needs_password_reset: false },
  })

  redirect('/dagatal')
}

export async function signupViaInvite(
  token: string,
  name: string,
  email: string,
  password: string,
) {
  const payload = await verifyInviteToken(token)
  if (!payload) return { error: 'Ógilt eða útrunnið boðshlekkur' }

  const service = createServiceClient()

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

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
