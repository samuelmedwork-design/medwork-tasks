'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronRight, Calendar, User, Pencil, Trash2,
  CheckSquare, Square, Archive, ArchiveRestore, Plus, X, Check,
} from 'lucide-react'
import { cn, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel, calculateProgress, getInitials, formatDate, getDueDateStatus } from '@/lib/utils'
import type { TaskWithRelations, TeamMember } from '@/lib/types'

interface TaskCardProps {
  task: TaskWithRelations
  isExpanded: boolean
  onToggleExpand: (taskId: string) => void
  onToggleSubtask: (subtaskId: string, currentStatus: 'pending' | 'completed') => void
  onAddSubtask: (taskId: string, title: string, responsibleId: string) => Promise<void>
  onDeleteSubtask: (subtaskId: string, taskId: string) => void
  onEdit: (task: TaskWithRelations) => void
  onDelete: (taskId: string) => void
  onArchive: (taskId: string, archive: boolean) => void
  members: TeamMember[]
}

export default function TaskCard({
  task, isExpanded, onToggleExpand, onToggleSubtask, onAddSubtask,
  onDeleteSubtask, onEdit, onDelete, onArchive, members,
}: TaskCardProps) {
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskResponsible, setNewSubtaskResponsible] = useState('')
  const [saving, setSaving] = useState(false)

  const progress = calculateProgress(task.subtasks)
  const dueDateStatus = getDueDateStatus(task.due_date, task.status)
  const completedCount = task.subtasks.filter(s => s.status === 'completed').length

  async function handleSaveSubtask() {
    if (!newSubtaskTitle.trim() || saving) return
    setSaving(true)
    await onAddSubtask(task.id, newSubtaskTitle.trim(), newSubtaskResponsible)
    setNewSubtaskTitle('')
    setNewSubtaskResponsible('')
    setAddingSubtask(false)
    setSaving(false)
  }

  function handleCancelAdd() {
    setAddingSubtask(false)
    setNewSubtaskTitle('')
    setNewSubtaskResponsible('')
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => onToggleExpand(task.id)}
      >
        {/* Sector color bar */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[20px]"
          style={{ backgroundColor: task.sector?.color ?? '#cbd5e1' }} />

        {/* Expand icon */}
        <div className="text-slate-400 flex-shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        {/* Title + sector */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold truncate', task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800')}>
            {task.title}
          </p>
          {task.sector && (
            <p className="text-xs text-slate-400 mt-0.5">{task.sector.icon} {task.sector.name}</p>
          )}
        </div>

        {/* Responsible */}
        <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5">
          {task.responsible ? (
            <>
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                {getInitials(task.responsible.name)}
              </div>
              <span className="text-xs text-slate-500 hidden md:block truncate max-w-[100px]">
                {task.responsible.name}
              </span>
            </>
          ) : (
            <User className="w-4 h-4 text-slate-300" />
          )}
        </div>

        {/* Priority */}
        <div className="flex-shrink-0">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', getPriorityColor(task.priority), task.priority === 'urgent' && 'animate-pulse-urgent')}>
            {getPriorityLabel(task.priority)}
          </span>
        </div>

        {/* Due date */}
        {task.due_date && (
          <div className={cn(
            'flex-shrink-0 hidden md:flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5',
            dueDateStatus === 'overdue' && 'bg-red-100 text-red-600',
            dueDateStatus === 'urgent' && 'bg-amber-100 text-amber-600',
            dueDateStatus === 'normal' && 'text-slate-400 bg-transparent px-0 py-0',
          )}>
            <Calendar className="w-3 h-3" />
            {dueDateStatus === 'overdue' && <span>ATRASADA</span>}
            {dueDateStatus === 'urgent' && <span>⚠ {formatDate(task.due_date)}</span>}
            {dueDateStatus === 'normal' && <span>{formatDate(task.due_date)}</span>}
          </div>
        )}

        {/* Progress bar */}
        {task.subtasks.length > 0 && (
          <div className="flex-shrink-0 hidden lg:flex items-center gap-2 w-24">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-slate-400 tabular-nums">{progress}%</span>
          </div>
        )}

        {/* Status */}
        <div className="flex-shrink-0">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(task.status))}>
            {getStatusLabel(task.status)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          {!task.archived && (
            <button onClick={() => onEdit(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onArchive(task.id, !task.archived)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={task.archived ? 'Restaurar' : 'Arquivar'}>
            {task.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          {task.description && (
            <p className="text-sm text-slate-500 mb-4 pb-3 border-b border-slate-100">{task.description}</p>
          )}

          {task.subtasks.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtarefas</span>
              <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                {completedCount}/{task.subtasks.length}
              </span>
            </div>
          )}

          <div className="space-y-0.5">
            {task.subtasks
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(subtask => (
                <div key={subtask.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white transition-colors group">
                  <button
                    onClick={() => onToggleSubtask(subtask.id, subtask.status as 'pending' | 'completed')}
                    className="flex-shrink-0 transition-colors"
                  >
                    {subtask.status === 'completed'
                      ? <CheckSquare className="w-4 h-4 text-indigo-500" />
                      : <Square className="w-4 h-4 text-slate-400 hover:text-indigo-500" />
                    }
                  </button>
                  <span className={cn('flex-1 text-sm', subtask.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700')}>
                    {subtask.title}
                  </span>
                  {subtask.responsible && (
                    <span className="text-xs text-slate-400 flex-shrink-0">{subtask.responsible.name}</span>
                  )}
                  <button
                    onClick={() => onDeleteSubtask(subtask.id, task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    title="Remover subtarefa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

            {/* Add subtask inline */}
            {!addingSubtask ? (
              <button
                onClick={() => setAddingSubtask(true)}
                className="flex items-center gap-2 w-full px-2 py-2 text-sm text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors mt-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar subtarefa
              </button>
            ) : (
              <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2">
                <input
                  type="text"
                  autoFocus
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveSubtask()
                    if (e.key === 'Escape') handleCancelAdd()
                  }}
                  placeholder="Nome da subtarefa..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newSubtaskResponsible}
                    onChange={e => setNewSubtaskResponsible(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Responsável (opcional)</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveSubtask}
                    disabled={saving || !newSubtaskTitle.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Salvar
                  </button>
                  <button
                    onClick={handleCancelAdd}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
