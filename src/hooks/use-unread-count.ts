'use client'

import { useState, useEffect } from 'react'

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
    return () => clearInterval(interval)
  }, [])

  return count
}
