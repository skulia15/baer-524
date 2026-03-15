import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function TengiliðirPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all head profiles with their household
  const { data: heads } = await supabase
    .from('profile')
    .select('*, household:household_id(*)')
    .eq('role', 'head')
    .order('name')

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/stillingar"
          className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-semibold text-stone-900">Tengiliðir</h1>
      </div>
      <div className="space-y-3">
        {heads?.map((head) => {
          const household = head.household as { name: string; color: string } | null
          return (
            <div key={head.id} className="rounded-xl border border-stone-200 p-4">
              <div className="mb-2 flex items-center gap-2">
                {household && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: household.color }}
                  />
                )}
                <p className="font-medium text-stone-900">{head.name}</p>
                {household?.name && household.name !== head.name && (
                  <p className="text-xs text-stone-400">{household.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <a
                  href={`mailto:${head.email}`}
                  className="flex items-center gap-2 text-sm text-stone-600 hover:text-green-700"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                  {head.email}
                </a>
                {head.phone && (
                  <a
                    href={`tel:${head.phone}`}
                    className="flex items-center gap-2 text-sm text-stone-600 hover:text-green-700"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                    {head.phone}
                  </a>
                )}
                {!head.phone && (
                  <p className="flex items-center gap-2 text-sm text-stone-400">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    Símanúmer skráð ekki
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
