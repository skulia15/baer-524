import { createClient } from '@/lib/supabase/server'
import { CalendarDays, ChevronRight, KeyRound, Phone, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function StillingarPage() {
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
  if (!profile) redirect('/login')

  const household = profile.household as { name: string; color: string } | null
  const isHead = profile.role === 'head'

  return (
    <div>
      <div className="border-b border-stone-100 px-4 py-3">
        <h1 className="font-semibold text-stone-900">Stillingar</h1>
      </div>
      <div className="divide-y divide-stone-100">
        {isHead && (
          <>
            <Link
              href="/stillingar/uppsetning"
              className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-stone-50"
            >
              <span className="flex items-center gap-3 text-sm text-stone-800">
                <CalendarDays className="h-4 w-4 text-stone-400" />
                Uppsetning árs
              </span>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </Link>
            <Link
              href="/stillingar/bjoda"
              className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-stone-50"
            >
              <span className="flex items-center gap-3 text-sm text-stone-800">
                <UserPlus className="h-4 w-4 text-stone-400" />
                Bjóða notanda
              </span>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </Link>
          </>
        )}
        <Link
          href="/stillingar/tengilidir"
          className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-stone-50"
        >
          <span className="flex items-center gap-3 text-sm text-stone-800">
            <Phone className="h-4 w-4 text-stone-400" />
            Tengiliðir
          </span>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </Link>
        <Link
          href="/stillingar/adgangur"
          className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-stone-50"
        >
          <span className="flex items-center gap-3 text-sm text-stone-800">
            <KeyRound className="h-4 w-4 text-stone-400" />
            Aðgangur
          </span>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </Link>
      </div>
      <div className="px-4 py-4">
        <p className="text-xs text-stone-400">
          {profile.name} · {household?.name} ·{' '}
          <span className="font-medium">{isHead ? 'Eigandi' : 'Meðlimur'}</span>
        </p>
      </div>
    </div>
  )
}
