import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UppsetningClient } from './uppsetning-client'

export default async function UppsetningPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profile')
    .select('email')
    .eq('id', user.id)
    .single()

  if (profile?.email !== process.env.ADMIN_EMAIL) redirect('/stillingar')

  return <UppsetningClient />
}
