'use client'

import type { ProfileWithHousehold } from '@/actions/admin'
import {
  adminCreateUser,
  adminUpdateEmail,
  adminUpdateHousehold,
  adminUpdatePassword,
  adminUpdateRole,
} from '@/actions/admin'
import type { Household } from '@/types/db'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface Props {
  profiles: ProfileWithHousehold[]
  households: Household[]
}

export function AdminClient({ profiles, households }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-stone-900">Admin</h1>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {showCreate ? 'Loka' : 'Nýr notandi'}
        </button>
      </div>

      {showCreate && (
        <CreateUserForm
          households={households}
          onSuccess={() => {
            setShowCreate(false)
            router.refresh()
          }}
        />
      )}

      <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
        {profiles.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            >
              {p.household && (
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: p.household.color }}
                />
              )}
              <span className="flex-1 font-medium text-stone-900">{p.name}</span>
              <span className="text-sm text-stone-500">{p.email}</span>
              <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {p.role === 'head' ? 'Eigandi' : 'Meðlimur'}
              </span>
            </button>

            {expandedId === p.id && (
              <UserEditPanel user={p} households={households} onSuccess={() => router.refresh()} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CreateUserForm({
  households,
  onSuccess,
}: { households: Household[]; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    householdId: households[0]?.id ?? '',
    role: 'member' as 'head' | 'member',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = await adminCreateUser(
        form.name,
        form.email,
        form.password,
        form.householdId,
        form.role,
      )
      if ('error' in res) setError(res.error)
      else onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-stone-200 p-4">
      <h2 className="mb-4 font-semibold text-stone-800">Nýr notandi</h2>
      <div className="grid gap-3">
        <Field label="Nafn">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Netfang">
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Lykilorð">
          <input
            name="password"
            type="text"
            value={form.password}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Fjölskylda">
          <select
            name="householdId"
            value={form.householdId}
            onChange={handleChange}
            className={inputCls}
          >
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hlutverk">
          <select name="role" value={form.role} onChange={handleChange} className={inputCls}>
            <option value="member">Meðlimur</option>
            <option value="head">Eigandi</option>
          </select>
        </Field>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Býr til…' : 'Búa til notanda'}
      </button>
    </form>
  )
}

function UserEditPanel({
  user,
  households,
  onSuccess,
}: { user: ProfileWithHousehold; households: Household[]; onSuccess: () => void }) {
  return (
    <div className="border-t border-stone-100 bg-stone-50 px-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <EditField
          label="Breyta netfangi"
          initialValue={user.email}
          onSave={async (v) => adminUpdateEmail(user.id, v)}
          onSuccess={onSuccess}
        />
        <EditField
          label="Breyta lykilorði"
          initialValue=""
          placeholder="Nýtt lykilorð"
          onSave={async (v) => adminUpdatePassword(user.id, v)}
          onSuccess={onSuccess}
        />
        <SelectField
          label="Breyta fjölskyldu"
          value={user.household_id}
          options={households.map((h) => ({ value: h.id, label: h.name }))}
          onSave={async (v) => adminUpdateHousehold(user.id, v)}
          onSuccess={onSuccess}
        />
        <SelectField
          label="Breyta hlutverki"
          value={user.role}
          options={[
            { value: 'member', label: 'Meðlimur' },
            { value: 'head', label: 'Eigandi' },
          ]}
          onSave={async (v) => adminUpdateRole(user.id, v as 'head' | 'member')}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  )
}

function EditField({
  label,
  initialValue,
  placeholder,
  onSave,
  onSuccess,
}: {
  label: string
  initialValue: string
  placeholder?: string
  onSave: (v: string) => Promise<{ success: true } | { error: string }>
  onSuccess: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<string>('')

  function handleSave() {
    setStatus('')
    startTransition(async () => {
      const res = await onSave(value)
      if ('error' in res) setStatus(res.error)
      else {
        setStatus('Vista!')
        onSuccess()
      }
    })
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">
        {label}
        <div className="flex gap-2 font-normal">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className={inputCls}
          />
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="shrink-0 rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Vista
          </button>
        </div>
      </label>
      {status && (
        <p className={`mt-1 text-xs ${status === 'Vista!' ? 'text-green-600' : 'text-red-600'}`}>
          {status}
        </p>
      )}
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onSave,
  onSuccess,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onSave: (v: string) => Promise<{ success: true } | { error: string }>
  onSuccess: () => void
}) {
  const [selected, setSelected] = useState(value)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<string>('')

  function handleSave() {
    setStatus('')
    startTransition(async () => {
      const res = await onSave(selected)
      if ('error' in res) setStatus(res.error)
      else {
        setStatus('Vista!')
        onSuccess()
      }
    })
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">
        {label}
        <div className="flex gap-2 font-normal">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={inputCls}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="shrink-0 rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Vista
          </button>
        </div>
      </label>
      {status && (
        <p className={`mt-1 text-xs ${status === 'Vista!' ? 'text-green-600' : 'text-red-600'}`}>
          {status}
        </p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-stone-600">{label}</p>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400'
