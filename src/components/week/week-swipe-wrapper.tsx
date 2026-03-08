'use client'

import { useRouter } from 'next/navigation'
import { useSwipe } from '@/hooks/use-swipe'
import type { ReactNode } from 'react'

interface WeekSwipeWrapperProps {
  children: ReactNode
  prevWeek: number | null
  nextWeek: number | null
}

export function WeekSwipeWrapper({ children, prevWeek, nextWeek }: WeekSwipeWrapperProps) {
  const router = useRouter()

  const { onTouchStart, onTouchEnd } = useSwipe(
    () => {
      if (nextWeek) router.push(`/dagatal/vika/${nextWeek}`)
    },
    () => {
      if (prevWeek) router.push(`/dagatal/vika/${prevWeek}`)
    },
  )

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="min-h-screen">
      {children}
    </div>
  )
}
