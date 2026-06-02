import { Clock, User } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { TaskWithRelations } from '@/lib/types'

export default function StaleTasks({ tasks }: { tasks: TaskWithRelations[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
          <Clock className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-slate-400 text-sm">Nenhuma tarefa parada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => {
        const days = Math.floor(
          (Date.now() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        return (
          <div key={task.id} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
            {task.sector && (
              <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: task.sector.color }} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {task.responsible ? (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[8px] font-bold">
                      {getInitials(task.responsible.name)}
                    </div>
                    {task.responsible.name}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <User className="w-3 h-3" /> Sem responsável
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-1 rounded-full flex-shrink-0">
              {days}d parada
            </span>
          </div>
        )
      })}
    </div>
  )
}
