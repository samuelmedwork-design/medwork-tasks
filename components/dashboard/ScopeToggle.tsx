'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { User, Users } from 'lucide-react'

export default function ScopeToggle({ current }: { current: 'mine' | 'all' }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setView(view: 'mine' | 'all') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
      <button
        onClick={() => setView('mine')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          current === 'mine'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <User className="w-4 h-4" />
        Minhas
      </button>
      <button
        onClick={() => setView('all')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          current === 'all'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Users className="w-4 h-4" />
        Geral
      </button>
    </div>
  )
}
