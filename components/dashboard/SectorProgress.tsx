import type { SectorProgress } from '@/lib/types'

export default function SectorProgressList({ sectors }: { sectors: SectorProgress[] }) {
  if (sectors.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-sm">Nenhum setor com tarefas.</div>
  }

  return (
    <div className="space-y-4">
      {sectors.map(({ sector, total, completed, percentage }) => (
        <div key={sector.id}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sector.color }} />
              <span className="text-sm font-medium text-slate-700">{sector.icon} {sector.name}</span>
            </div>
            <span className="text-xs text-slate-400">{completed}/{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: sector.color }} />
            </div>
            <span className="text-xs font-semibold text-slate-600 w-9 text-right">{percentage}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}
