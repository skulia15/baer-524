import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LosaClient } from './losa-client'

export default async function LosaPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>
}) {
  const { weekNumber } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profile')
    .select('role, email')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const canRelease = profile.role === 'head' || profile.email === process.env.ADMIN_EMAIL
  if (!canRelease) redirect(`/dagatal/vika/${weekNumber}`)

  return <LosaClient />
}
