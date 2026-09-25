'use client'

import { useEffect, useState } from 'react'

export const NOTIFICATIONS_READ_EVENT = 'notifications-read'

export function useUnreadCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/unread-count')
        if (res.ok) {
          const data = await res.json()
          setCount(data.count)
        }
      } catch {
        // Silently fail - polling will retry
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    window.addEventListener(NOTIFICATIONS_READ_EVENT, fetchCount)
    return () => {
      clearInterval(interval)
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, fetchCount)
    }
  }, [])

  return count
}
