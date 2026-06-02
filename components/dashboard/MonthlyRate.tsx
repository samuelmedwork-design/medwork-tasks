import type { MonthlyStats } from '@/lib/types'

export default function MonthlyRate({ stats }: { stats: MonthlyStats }) {
  const { created, completed, rate } = stats
  const color = rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${rate} ${100 - rate}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{rate}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Taxa de Entrega</p>
        <p className="text-xs text-slate-400 mt-0.5">{completed} de {created} tarefas concluídas este mês</p>
        <div className="flex items-center gap-1 mt-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium" style={{ color }}>
            {rate >= 70 ? 'Ótimo' : rate >= 40 ? 'Regular' : 'Precisa melhorar'}
          </span>
        </div>
      </div>
    </div>
  )
}
