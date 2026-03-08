'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type BannerVariant = 'success' | 'error'

interface BannerState {
  message: string
  variant: BannerVariant
  visible: boolean
}

interface BannerContextValue {
  banner: BannerState
  showBanner: (message: string, variant?: BannerVariant) => void
}

export const BannerContext = createContext<BannerContextValue>({
  banner: { message: '', variant: 'success', visible: false },
  showBanner: () => {},
})

export function useBanner() {
  return useContext(BannerContext)
}

export function useBannerState(): BannerContextValue {
  const [banner, setBanner] = useState<BannerState>({
    message: '',
    variant: 'success',
    visible: false,
  })

  const showBanner = useCallback((message: string, variant: BannerVariant = 'success') => {
    setBanner({ message, variant, visible: true })
    setTimeout(() => {
      setBanner((prev) => ({ ...prev, visible: false }))
    }, 3000)
  }, [])

  return { banner, showBanner }
}
