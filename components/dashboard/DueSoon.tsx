import { Calendar, User } from 'lucide-react'
import { formatDate, getInitials, getDueDateStatus } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { TaskWithRelations } from '@/lib/types'

export default function DueSoon({ tasks }: { tasks: TaskWithRelations[] }) {
  if (tasks.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-sm">Nenhuma tarefa vencendo nos próximos 7 dias.</div>
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => {
        const ds = getDueDateStatus(task.due_date, task.status)
        return (
          <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors">
            {task.sector && (
              <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: task.sector.color }} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {task.sector && <span className="text-xs text-slate-400">{task.sector.icon} {task.sector.name}</span>}
                {task.responsible && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[8px] font-bold">
                      {getInitials(task.responsible.name)}
                    </div>
                    {task.responsible.name}
                  </span>
                )}
                {!task.responsible && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <User className="w-3 h-3" /> Sem responsável
                  </span>
                )}
              </div>
            </div>
            <div className={cn(
              'flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-1 flex-shrink-0',
              ds === 'urgent' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
            )}>
              <Calendar className="w-3 h-3" />
              {formatDate(task.due_date)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
