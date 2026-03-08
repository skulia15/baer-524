'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomTabsProps {
  unreadCount: number
}

export function BottomTabs({ unreadCount }: BottomTabsProps) {
  const pathname = usePathname()

  const tabs = [
    { href: '/dagatal', label: 'Dagatal', icon: '📅' },
    { href: '/tilkynningar', label: 'Tilkynningar', icon: '🔔' },
    { href: '/stillingar', label: 'Stillingar', icon: '⚙️' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[430px] items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          const isNotif = tab.href === '/tilkynningar'
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center py-2 text-xs ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="mt-0.5">{tab.label}</span>
              {isNotif && unreadCount > 0 && (
                <span className="absolute right-4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
