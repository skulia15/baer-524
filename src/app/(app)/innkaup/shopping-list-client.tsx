'use client'

import { addShoppingItem, deleteShoppingItem, markAsBought } from '@/actions/shopping'
import { formatRelativeTime } from '@/lib/dates'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type ItemWithJoins = {
  id: string
  name: string
  created_by: string
  bought_at: string | null
  reported_by_household: { name: string } | null
  bought_by_household: { name: string } | null
}

type LogEntry = {
  id: string
  action: 'added' | 'bought' | 'deleted'
  item_name: string
  created_at: string
  household: { name: string } | null
}

const ACTION_LABEL: Record<LogEntry['action'], string> = {
  added: 'bætti við',
  bought: 'keypti',
  deleted: 'eyddi',
}

export function ShoppingListClient({ items, log }: { items: ItemWithJoins[]; log: LogEntry[] }) {
  const router = useRouter()
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const pending = items.filter((i) => !i.bought_at)
  const bought = items.filter((i) => i.bought_at)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim()) return
    setAdding(true)
    setError('')
    const result = await addShoppingItem(newItem.trim())
    if ('error' in result) {
      setError(result.error)
    } else {
      setNewItem('')
      router.refresh()
    }
    setAdding(false)
  }

  async function handleMarkBought(id: string) {
    const result = await markAsBought(id)
    if ('error' in result) setError(result.error)
    else router.refresh()
  }

  async function handleDelete(id: string) {
    const result = await deleteShoppingItem(id)
    if ('error' in result) setError(result.error)
    else router.refresh()
  }

  return (
    <div>
      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 border-b border-stone-100 px-4 py-3">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Vara..."
          className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
        />
        <button
          type="submit"
          disabled={adding || !newItem.trim()}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:opacity-50"
        >
          {adding ? '...' : 'Bæta við'}
        </button>
      </form>

      {error && (
        <p className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Pending items */}
      {pending.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Vantar
          </p>
          <div className="divide-y divide-stone-100">
            {pending.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900">{item.name}</p>
                  {item.reported_by_household && (
                    <p className="text-xs text-stone-400">
                      Tilkynnt af: {item.reported_by_household.name}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleMarkBought(item.id)}
                  className="shrink-0 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                >
                  Keypt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && bought.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-stone-400">Engar vörur á lista</p>
      )}

      {/* Bought items */}
      {bought.length > 0 && (
        <div className="mt-2">
          <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Keypt
          </p>
          <div className="divide-y divide-stone-100">
            {bought.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-500 line-through">{item.name}</p>
                  <p className="text-xs text-stone-400">
                    {item.bought_by_household
                      ? `Keypt af: ${item.bought_by_household.name} · `
                      : ''}
                    {item.bought_at ? formatRelativeTime(item.bought_at) : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100"
                >
                  Eyða
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity log */}
      {log.length > 0 && (
        <div className="mt-4 border-t border-stone-100">
          <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Saga
          </p>
          <div className="divide-y divide-stone-50">
            {log.map((entry) => (
              <div key={entry.id} className="flex items-baseline justify-between px-4 py-2">
                <p className="text-sm text-stone-600">
                  <span className="font-medium">{entry.household?.name ?? '—'}</span>{' '}
                  {ACTION_LABEL[entry.action]} <span className="italic">{entry.item_name}</span>
                </p>
                <p className="ml-3 shrink-0 text-xs text-stone-400">
                  {formatRelativeTime(entry.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
