'use server'

import { createClient } from '@/lib/supabase/server'

export async function addShoppingItem(
  name: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('household_id, household:household_id(house_id)')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Prófíll ekki fundinn' }

  const household = profile.household as unknown as { house_id: string } | null
  if (!household) return { error: 'Heimili ekki fundið' }

  const trimmed = name.trim()
  const { error } = await supabase.from('shopping_item').insert({
    house_id: household.house_id,
    name: trimmed,
    reported_by_household_id: profile.household_id as string,
    created_by: user.id,
  })
  if (error) return { error: error.message }

  await supabase.from('shopping_item_log').insert({
    house_id: household.house_id,
    action: 'added',
    item_name: trimmed,
    household_id: profile.household_id as string,
    created_by: user.id,
  })

  return { success: true }
}

export async function markAsBought(id: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('household_id, household:household_id(house_id)')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Prófíll ekki fundinn' }

  const household = profile.household as unknown as { house_id: string } | null
  if (!household) return { error: 'Heimili ekki fundið' }

  const { data: item } = await supabase.from('shopping_item').select('name').eq('id', id).single()

  const { error } = await supabase
    .from('shopping_item')
    .update({
      bought_at: new Date().toISOString(),
      bought_by_household_id: profile.household_id as string,
    })
    .eq('id', id)
  if (error) return { error: error.message }

  if (item) {
    await supabase.from('shopping_item_log').insert({
      house_id: household.house_id,
      action: 'bought',
      item_name: item.name,
      household_id: profile.household_id as string,
      created_by: user.id,
    })
  }

  return { success: true }
}

export async function deleteShoppingItem(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { data: profile } = await supabase
    .from('profile')
    .select('household_id, household:household_id(house_id)')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Prófíll ekki fundinn' }

  const household = profile.household as unknown as { house_id: string } | null
  if (!household) return { error: 'Heimili ekki fundið' }

  const { data: item } = await supabase.from('shopping_item').select('name').eq('id', id).single()

  const { error } = await supabase.from('shopping_item').delete().eq('id', id)
  if (error) return { error: error.message }

  if (item) {
    await supabase.from('shopping_item_log').insert({
      house_id: household.house_id,
      action: 'deleted',
      item_name: item.name,
      household_id: profile.household_id as string,
      created_by: user.id,
    })
  }

  return { success: true }
}
