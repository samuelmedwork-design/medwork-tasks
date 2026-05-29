'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Building2, Users, LogOut, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import type { TeamMember } from '@/lib/types'

interface SidebarProps { currentUser: TeamMember }

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tarefas', icon: ClipboardList },
]

const adminItems = [
  { href: '/admin/sectors', label: 'Setores', icon: Building2 },
  { href: '/admin/members', label: 'Membros', icon: Users },
]

export default function Sidebar({ currentUser }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full fixed left-0 top-0 bottom-0 shadow-lg">
      {/* Logo */}
      <div className="flex flex-col items-center px-6 py-5 border-b border-slate-800 gap-1">
        <Image src="/logo.png" alt="MedWork" width={140} height={48} className="object-contain brightness-0 invert" priority />
        <span className="text-[10px] text-slate-500 tracking-widest font-semibold uppercase">Tasks</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
            {isActive(href) && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400" />}
          </Link>
        ))}

        {currentUser.role === 'admin' && (
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Administração
            </p>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(href)
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {isActive(href) && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400" />}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-xs font-bold">
            {getInitials(currentUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">
              {currentUser.role === 'admin' ? 'Administrador' : 'Membro'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex-shrink-0 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
