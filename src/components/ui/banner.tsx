'use client'

import { useContext } from 'react'
import { BannerContext } from '@/hooks/use-banner'

export function Banner() {
  const { banner } = useContext(BannerContext)

  if (!banner.visible) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium shadow-md ${
        banner.variant === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {banner.message}
    </div>
  )
}
