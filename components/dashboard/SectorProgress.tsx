import type { SectorProgress } from '@/lib/types'

interface SectorProgressProps {
  sectors: SectorProgress[]
}

export default function SectorProgressList({ sectors }: SectorProgressProps) {
  if (sectors.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Nenhum setor com tarefas encontrado.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sectors.map(({ sector, total, completed, percentage }) => (
        <div key={sector.id} className="flex items-center gap-4">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: sector.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">{sector.icon}</span>
                <span className="text-sm font-medium text-slate-200 truncate">{sector.name}</span>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                {completed} de {total}
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: sector.color,
                }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-300 w-10 text-right flex-shrink-0">
            {percentage}%
          </span>
        </div>
      ))}
    </div>
  )
}
