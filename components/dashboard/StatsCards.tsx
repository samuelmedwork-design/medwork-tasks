import { ClipboardList, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { DashboardStats } from '@/lib/types'

interface StatsCardsProps {
  stats: DashboardStats
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total de Tarefas',
      value: stats.total,
      icon: ClipboardList,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      description: 'tarefas cadastradas',
    },
    {
      label: 'Em Andamento',
      value: stats.in_progress,
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      description: 'em execução agora',
    },
    {
      label: 'Concluídas',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      description: 'finalizadas com sucesso',
    },
    {
      label: 'Atrasadas',
      value: stats.overdue,
      icon: AlertTriangle,
      color: stats.overdue > 0 ? 'text-red-400' : 'text-slate-400',
      bg: stats.overdue > 0 ? 'bg-red-500/10' : 'bg-slate-500/10',
      border: stats.overdue > 0 ? 'border-red-500/20' : 'border-slate-600',
      description: 'precisam de atenção',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`bg-slate-800 border ${card.border} rounded-xl p-5 flex items-start gap-4`}
          >
            <div className={`${card.bg} rounded-lg p-2.5 flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">{card.label}</p>
              <p className="text-3xl font-bold text-white mt-0.5">{card.value}</p>
              <p className="text-slate-500 text-xs mt-1">{card.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
