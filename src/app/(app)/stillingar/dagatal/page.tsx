import { feedToken } from '@/lib/ical'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CopyButton } from './copy-button'

export default async function DagatalAskriftPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profile')
    .select('household_id, household:household_id(name)')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const householdName = (profile.household as unknown as { name: string } | null)?.name ?? ''
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://baer524.vercel.app').replace(/\/$/, '')
  const feedPath = `/api/ical/${profile.household_id}?token=${feedToken(profile.household_id)}`
  const httpsUrl = `${base}${feedPath}`
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, 'webcal://')

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/stillingar"
          className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100"
          aria-label="Stillingar"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-semibold text-stone-900">Dagatal í síma</h1>
      </div>

      <p className="mb-4 text-sm text-stone-600">
        Gerðu áskrift að dögum {householdName} í Bæ í dagatalinu þínu (iPhone, Google, Outlook).
        Dagatalið uppfærist sjálfkrafa: þínar vikur, dagar sem þið fáið eða gefið, og sameiginlegar
        vikur.
      </p>

      <a
        href={webcalUrl}
        className="mb-3 block w-full rounded-xl bg-green-700 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-green-800"
      >
        Bæta við dagatal
      </a>
      <CopyButton text={httpsUrl} />

      <p className="mt-4 text-xs text-stone-400">
        Google Calendar: Stillingar → Bæta við dagatali → Af slóð, og límdu slóðina inn. Slóðin er
        einkaslóð fjölskyldunnar — ekki deila henni utan hennar.
      </p>
    </div>
  )
}
