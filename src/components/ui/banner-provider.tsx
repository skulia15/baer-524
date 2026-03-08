'use client'

import type { ReactNode } from 'react'
import { BannerContext, useBannerState } from '@/hooks/use-banner'

export function BannerProviderClient({ children }: { children: ReactNode }) {
  const bannerState = useBannerState()
  return <BannerContext.Provider value={bannerState}>{children}</BannerContext.Provider>
}
