import { CheckCircle2, Plus, AlertTriangle } from 'lucide-react'
import type { WeeklySummary } from '@/lib/types'

export default function WeeklySummaryCard({ data }: { data: WeeklySummary }) {
  const items = [
    {
      label: 'Concluídas esta semana',
      value: data.completedThisWeek,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Criadas esta semana',
      value: data.createdThisWeek,
      icon: Plus,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Atrasadas',
      value: data.overdue,
      icon: AlertTriangle,
      color: data.overdue > 0 ? 'text-red-600' : 'text-slate-400',
      bg: data.overdue > 0 ? 'bg-red-50' : 'bg-slate-50',
    },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Resumo da Semana</p>
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        {items.map(item => {
          const Icon = item.icon
          return (
            <div key={item.label} className="flex flex-col items-center gap-1 px-4 first:pl-0 last:pr-0">
              <div className={`${item.bg} rounded-lg p-2 mb-1`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
              <span className="text-xs text-slate-400 text-center leading-tight">{item.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
