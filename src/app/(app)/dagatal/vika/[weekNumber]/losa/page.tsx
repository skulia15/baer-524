import { isAdmin } from '@/lib/admin'
import { weekHref, yearFromParam } from '@/lib/rotation-year'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LosaClient } from './losa-client'

export default async function LosaPage({
  params,
  searchParams,
}: {
  params: Promise<{ weekNumber: string }>
  searchParams: Promise<{ ar?: string }>
}) {
  const { weekNumber } = await params
  const year = yearFromParam((await searchParams).ar)
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

  const canRelease = profile.role === 'head' || isAdmin(user)
  if (!canRelease) redirect(weekHref(year, weekNumber))

  return <LosaClient />
}
