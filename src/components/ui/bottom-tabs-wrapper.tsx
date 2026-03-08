'use client'

import { BottomTabs } from './bottom-tabs'
import { useUnreadCount } from '@/hooks/use-unread-count'

export function BottomTabsWrapper() {
  const count = useUnreadCount()
  return <BottomTabs unreadCount={count} />
}
