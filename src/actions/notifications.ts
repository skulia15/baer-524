'use server'

import { createClient } from '@/lib/supabase/server'

export async function markRead(notificationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { error } = await supabase
    .from('notification')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function markAllRead() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Ekki innskráður' }

  const { error } = await supabase
    .from('notification')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) return { error: error.message }
  return { success: true }
}
