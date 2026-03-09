'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Household, Profile } from '@/types/db'

type Result = { success: true } | { error: string }

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Notandi ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('email')
    .eq('id', user.id)
    .single()

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return { error: 'Admin ekki stilltur' }

  if (profile?.email !== adminEmail) {
    return { error: 'Ekki heimild' }
  }

  return { userId: user.id }
}

export interface ProfileWithHousehold extends Profile {
  household: Household | null
}

export async function adminListUsers(): Promise<
  { data: ProfileWithHousehold[] } | { error: string }
> {
  const check = await verifyAdmin()
  if ('error' in check) return check

  const service = createServiceClient()
  const { data, error } = await service
    .from('profile')
    .select('*, household:household_id(id, name, color)')
    .order('name')

  if (error) return { error: error.message }
  return { data: (data ?? []) as ProfileWithHousehold[] }
}

export async function adminCreateUser(
  name: string,
  email: string,
  password: string,
  householdId: string,
  role: 'head' | 'member',
): Promise<Result> {
  const check = await verifyAdmin()
  if ('error' in check) return check

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
    household_id: householdId,
    role,
  })

  if (profileErr) {
    await service.auth.admin.deleteUser(authData.user.id)
    return { error: profileErr.message }
  }

  return { success: true }
}

export async function adminUpdateEmail(userId: string, email: string): Promise<Result> {
  const check = await verifyAdmin()
  if ('error' in check) return check

  const service = createServiceClient()

  const { error: authErr } = await service.auth.admin.updateUserById(userId, { email })
  if (authErr) return { error: authErr.message }

  const { error: profileErr } = await service.from('profile').update({ email }).eq('id', userId)
  if (profileErr) return { error: profileErr.message }

  return { success: true }
}

export async function adminUpdatePassword(userId: string, password: string): Promise<Result> {
  const check = await verifyAdmin()
  if ('error' in check) return check

  const service = createServiceClient()
  const { error } = await service.auth.admin.updateUserById(userId, { password })
  if (error) return { error: error.message }

  return { success: true }
}

export async function adminUpdateHousehold(userId: string, householdId: string): Promise<Result> {
  const check = await verifyAdmin()
  if ('error' in check) return check

  const service = createServiceClient()
  const { error } = await service
    .from('profile')
    .update({ household_id: householdId })
    .eq('id', userId)
  if (error) return { error: error.message }

  return { success: true }
}

export async function adminUpdatePhone(userId: string, phone: string): Promise<Result> {
  const check = await verifyAdmin()
  if ('error' in check) return check

  const digits = phone.replace(/\D/g, '')
  if (digits && digits.length !== 7) return { error: 'Símanúmer verður að vera 7 tölustafir' }

  const service = createServiceClient()
  const { error } = await service
    .from('profile')
    .update({ phone: digits || null })
    .eq('id', userId)
  if (error) return { error: error.message }

  return { success: true }
}

export async function adminUpdateRole(userId: string, role: 'head' | 'member'): Promise<Result> {
  const check = await verifyAdmin()
  if ('error' in check) return check

  const service = createServiceClient()
  const { error } = await service.from('profile').update({ role }).eq('id', userId)
  if (error) return { error: error.message }

  return { success: true }
}
