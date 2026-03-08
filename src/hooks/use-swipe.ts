'use client'

import { useRef, useCallback } from 'react'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void): SwipeHandlers {
  const touchStartX = useRef<number | null>(null)
  const SWIPE_THRESHOLD = 50

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const diff = touchStartX.current - e.changedTouches[0].clientX
      if (Math.abs(diff) >= SWIPE_THRESHOLD) {
        if (diff > 0) {
          onSwipeLeft()
        } else {
          onSwipeRight()
        }
      }
      touchStartX.current = null
    },
    [onSwipeLeft, onSwipeRight],
  )

  return { onTouchStart, onTouchEnd }
}
