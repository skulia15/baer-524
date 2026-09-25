'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      }}
      className="w-full rounded-xl border border-stone-200 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
    >
      {copied ? 'Afritað!' : 'Afrita slóð'}
    </button>
  )
}
