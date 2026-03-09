import type { ProfileWithHousehold } from '@/actions/admin'
import { createClient } from '@/lib/supabase/server'
import type { Household } from '@/types/db'
import { redirect } from 'next/navigation'
import { AdminClient } from './admin-client'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profile')
    .select('email, household:household_id(house_id)')
    .eq('id', user.id)
    .single()

  if (profile?.email !== process.env.ADMIN_EMAIL) redirect('/dagatal')

  const houseId = (profile?.household as unknown as { house_id: string } | null)?.house_id

  const { data: profiles } = await supabase
    .from('profile')
    .select('*, household:household_id(id, name, color)')
    .order('name')

  const { data: households } = await supabase
    .from('household')
    .select('*')
    .eq('house_id', houseId ?? '')
    .order('name')

  return (
    <AdminClient
      profiles={(profiles ?? []) as ProfileWithHousehold[]}
      households={(households ?? []) as Household[]}
    />
  )
}
