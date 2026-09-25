'use client'

import { markAllRead } from '@/actions/notifications'
import { NOTIFICATIONS_READ_EVENT } from '@/hooks/use-unread-count'
import { useEffect } from 'react'

// Marks notifications read once the list has actually been shown, rather than as a
// side effect of rendering (which also runs on prefetches and refreshes).
export function MarkAllRead() {
  useEffect(() => {
    markAllRead().then(() => window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT)))
  }, [])
  return null
}
