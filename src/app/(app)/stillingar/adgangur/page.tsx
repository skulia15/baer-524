import { logout } from '@/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ChangePasswordForm from './change-password-form'
import PhoneForm from './phone-form'

export default async function AdgangurPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profile')
    .select('*, household:household_id(*)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const household = profile.household as { name: string } | null

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/stillingar"
          className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-semibold text-stone-900">Aðgangur</h1>
      </div>
      <div className="mb-6 space-y-2 rounded-xl border border-stone-200 p-4">
        <p className="text-sm">
          <span className="text-stone-400">Nafn:</span>{' '}
          <span className="text-stone-800">{profile.name}</span>
        </p>
        <p className="text-sm">
          <span className="text-stone-400">Netfang:</span>{' '}
          <span className="text-stone-800">{profile.email}</span>
        </p>
        <p className="text-sm">
          <span className="text-stone-400">Fjölskylda:</span>{' '}
          <span className="text-stone-800">{household?.name ?? '—'}</span>
        </p>
        <p className="text-sm">
          <span className="text-stone-400">Hlutverk:</span>{' '}
          <span className="font-medium text-stone-800">
            {profile.role === 'head' ? 'Eigandi' : 'Meðlimur'}
          </span>
        </p>
        <div className="text-sm">
          <PhoneForm currentPhone={profile.phone} />
        </div>
      </div>
      <div className="mb-6 rounded-xl border border-stone-200 p-4">
        <h2 className="mb-3 text-sm font-medium text-stone-700">Breyta lykilorði</h2>
        <ChangePasswordForm />
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-xl border border-red-200 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Skrá út
        </button>
      </form>
    </div>
  )
}
