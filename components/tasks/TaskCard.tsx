'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  Archive,
  ArchiveRestore,
} from 'lucide-react'
import { cn, formatDate, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel, calculateProgress, getInitials, isOverdue } from '@/lib/utils'
import type { TaskWithRelations } from '@/lib/types'

interface TaskCardProps {
  task: TaskWithRelations
  onToggleSubtask: (subtaskId: string, currentStatus: 'pending' | 'completed') => void
  onEdit: (task: TaskWithRelations) => void
  onDelete: (taskId: string) => void
  onArchive: (taskId: string, archive: boolean) => void
}

export default function TaskCard({ task, onToggleSubtask, onEdit, onDelete, onArchive }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)

  const progress = calculateProgress(task.subtasks)
  const overdue = isOverdue(task.due_date, task.status)
  const completedSubtasks = task.subtasks.filter((s) => s.status === 'completed').length

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden transition-all">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Sector color bar */}
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: task.sector?.color ?? '#475569' }}
        />

        {/* Expand icon */}
        <div className="text-slate-500 flex-shrink-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-100')}>
            {task.title}
          </p>
          {task.sector && (
            <p className="text-xs text-slate-500 mt-0.5">{task.sector.icon} {task.sector.name}</p>
          )}
        </div>

        {/* Responsible */}
        <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5" title={task.responsible?.name}>
          {task.responsible ? (
            <>
              <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {getInitials(task.responsible.name)}
              </div>
              <span className="text-xs text-slate-400 hidden md:block truncate max-w-[100px]">
                {task.responsible.name}
              </span>
            </>
          ) : (
            <User className="w-4 h-4 text-slate-600" />
          )}
        </div>

        {/* Priority badge */}
        <div className="flex-shrink-0">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-semibold',
              getPriorityColor(task.priority),
              task.priority === 'urgent' && 'animate-pulse-urgent'
            )}
          >
            {getPriorityLabel(task.priority)}
          </span>
        </div>

        {/* Due date */}
        <div className={cn('flex-shrink-0 hidden md:flex items-center gap-1 text-xs', overdue ? 'text-red-400' : 'text-slate-500')}>
          <Calendar className="w-3 h-3" />
          {formatDate(task.due_date)}
        </div>

        {/* Progress bar */}
        {task.subtasks.length > 0 && (
          <div className="flex-shrink-0 hidden lg:flex items-center gap-2 w-24">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{progress}%</span>
          </div>
        )}

        {/* Status badge */}
        <div className="flex-shrink-0">
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(task.status))}>
            {getStatusLabel(task.status)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {!task.archived && (
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onArchive(task.id, !task.archived)}
            className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors"
            title={task.archived ? 'Restaurar' : 'Arquivar'}
          >
            {task.archived ? (
              <ArchiveRestore className="w-3.5 h-3.5" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded subtasks */}
      {expanded && (
        <div className="border-t border-slate-700/50 bg-slate-900/30 px-4 py-3">
          {task.description && (
            <p className="text-sm text-slate-400 mb-3">{task.description}</p>
          )}

          {task.subtasks.length === 0 ? (
            <p className="text-sm text-slate-600 italic">Nenhuma subtarefa cadastrada.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Subtarefas
                </p>
                <span className="text-xs text-slate-500">
                  {completedSubtasks}/{task.subtasks.length} concluídas
                </span>
              </div>
              {task.subtasks
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 transition-colors group"
                  >
                    <button
                      onClick={() => onToggleSubtask(subtask.id, subtask.status)}
                      className="flex-shrink-0 text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                      {subtask.status === 'completed' ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        'flex-1 text-sm',
                        subtask.status === 'completed'
                          ? 'line-through text-slate-600'
                          : 'text-slate-300'
                      )}
                    >
                      {subtask.title}
                    </span>
                    {subtask.responsible && (
                      <span className="text-xs text-slate-500 hidden sm:block">
                        {subtask.responsible.name}
                      </span>
                    )}
                    {subtask.due_date && (
                      <span className="text-xs text-slate-600 hidden md:flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(subtask.due_date)}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
