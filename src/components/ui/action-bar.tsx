import Link from 'next/link'

interface ActionBarProps {
  pendingCount: number
}

export function ActionBar({ pendingCount }: ActionBarProps) {
  if (pendingCount === 0) return null

  return (
    <Link href="/tilkynningar">
      <div className="bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900">
        ⚠️ {pendingCount}{' '}
        {pendingCount === 1 ? 'beiðni/skipti bíður' : 'beiðnir/skipti bíða'} samþykkis →
      </div>
    </Link>
  )
}
