import { ClipboardList, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { DashboardStats } from '@/lib/types'

export default function StatsCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: 'Total de Tarefas', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', description: 'tarefas cadastradas' },
    { label: 'Em Andamento', value: stats.in_progress, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', description: 'em execução agora' },
    { label: 'Concluídas', value: stats.completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', description: 'finalizadas com sucesso' },
    {
      label: 'Atrasadas', value: stats.overdue, icon: AlertTriangle,
      color: stats.overdue > 0 ? 'text-red-600' : 'text-slate-400',
      bg: stats.overdue > 0 ? 'bg-red-50' : 'bg-slate-50',
      border: stats.overdue > 0 ? 'border-red-100' : 'border-slate-200',
      description: 'precisam de atenção',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div key={card.label} className={`bg-white dark:bg-slate-800 border ${card.border} dark:border-slate-700 rounded-xl p-5 flex items-start gap-4 shadow-sm`}>
            <div className={`${card.bg} rounded-lg p-2.5 flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{card.label}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-0.5">{card.value}</p>
              <p className="text-slate-400 text-xs mt-1">{card.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
