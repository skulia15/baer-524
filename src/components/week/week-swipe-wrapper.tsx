'use client'

import { useSwipe } from '@/hooks/use-swipe'
import { weekHref } from '@/lib/rotation-year'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

interface WeekSwipeWrapperProps {
  children: ReactNode
  year: number
  prevWeek: number | null
  nextWeek: number | null
}

export function WeekSwipeWrapper({ children, year, prevWeek, nextWeek }: WeekSwipeWrapperProps) {
  const router = useRouter()

  const { onTouchStart, onTouchEnd } = useSwipe(
    () => {
      if (nextWeek) router.push(weekHref(year, nextWeek))
    },
    () => {
      if (prevWeek) router.push(weekHref(year, prevWeek))
    },
  )

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="min-h-screen">
      {children}
    </div>
  )
}
