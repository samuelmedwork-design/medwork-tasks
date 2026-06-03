'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Building2, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/lib/types'

export default function BottomNav({ currentUser }: { currentUser: TeamMember }) {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  const items = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tasks', label: 'Tarefas', icon: ClipboardList },
    ...(currentUser.role === 'admin' ? [
      { href: '/admin/members', label: 'Membros', icon: Users },
      { href: '/admin/settings', label: 'Config', icon: Settings },
    ] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900 border-t border-slate-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 px-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 flex-1 py-2 px-1 rounded-xl transition-colors',
                active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <div className={cn('p-1.5 rounded-lg transition-colors', active && 'bg-indigo-600/20')}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
