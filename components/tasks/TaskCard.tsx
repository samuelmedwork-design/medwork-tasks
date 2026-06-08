'use client'

import { useState, useRef } from 'react'
import {
  ChevronDown, ChevronRight, Calendar, User, Pencil, Trash2,
  CheckSquare, Square, Archive, ArchiveRestore, Plus, X, Check, GripVertical,
} from 'lucide-react'
import { cn, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel, calculateProgress, formatDate, getDueDateStatus } from '@/lib/utils'
import type { TaskWithRelations, TeamMember } from '@/lib/types'
import TaskComments from './TaskComments'
import Avatar from '@/components/ui/Avatar'

interface TaskCardProps {
  task: TaskWithRelations
  isExpanded: boolean
  onToggleExpand: (taskId: string) => void
  onToggleSubtask: (subtaskId: string, currentStatus: 'pending' | 'completed') => void
  onAddSubtask: (taskId: string, title: string, responsibleId: string) => Promise<void>
  onEditSubtask: (subtaskId: string, title: string, responsibleId: string) => Promise<void>
  onReorderSubtasks: (taskId: string, orderedIds: string[]) => void
  onDeleteSubtask: (subtaskId: string, taskId: string) => void
  onEdit: (task: TaskWithRelations) => void
  onDelete: (taskId: string) => void
  onArchive: (taskId: string, archive: boolean) => void
  members: TeamMember[]
  currentMemberId: string | null
  highlightMemberId?: string | null
}

export default function TaskCard({
  task, isExpanded, onToggleExpand, onToggleSubtask, onAddSubtask, onEditSubtask,
  onReorderSubtasks, onDeleteSubtask, onEdit, onDelete, onArchive, members, currentMemberId,
  highlightMemberId,
}: TaskCardProps) {
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskResponsible, setNewSubtaskResponsible] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editResponsible, setEditResponsible] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  function startEdit(subtaskId: string, currentTitle: string, currentResponsibleId: string | null) {
    setEditingSubtaskId(subtaskId)
    setEditTitle(currentTitle)
    setEditResponsible(currentResponsibleId ?? '')
    setAddingSubtask(false)
  }

  function cancelEdit() {
    setEditingSubtaskId(null)
    setEditTitle('')
    setEditResponsible('')
  }

  async function handleSaveEdit() {
    if (!editTitle.trim() || savingEdit || !editingSubtaskId) return
    setSavingEdit(true)
    await onEditSubtask(editingSubtaskId, editTitle.trim(), editResponsible)
    setEditingSubtaskId(null)
    setSavingEdit(false)
  }

  // Drag-to-reorder
  const dragId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  function handleDragStart(id: string) { dragId.current = id }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (dragId.current !== id) setDragOverId(id)
  }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const sourceId = dragId.current
    if (!sourceId || sourceId === targetId) { setDragOverId(null); return }
    const sorted = task.subtasks.slice().sort((a, b) => a.sort_order - b.sort_order)
    const sourceIdx = sorted.findIndex(s => s.id === sourceId)
    const targetIdx = sorted.findIndex(s => s.id === targetId)
    const reordered = [...sorted]
    const [moved] = reordered.splice(sourceIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    onReorderSubtasks(task.id, reordered.map(s => s.id))
    dragId.current = null
    setDragOverId(null)
  }
  function handleDragEnd() { dragId.current = null; setDragOverId(null) }

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
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Main row */}
      <div
        className="flex gap-2.5 px-3 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        onClick={() => onToggleExpand(task.id)}
      >
        {/* Sector color bar */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[20px]"
          style={{ backgroundColor: task.sector?.color ?? '#cbd5e1' }} />

        {/* Expand icon */}
        <div className="text-slate-400 flex-shrink-0 mt-0.5">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        {/* Content — full width, stacks on mobile */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={cn('text-sm font-semibold break-words leading-snug', task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100')}>
            {task.title}
          </p>

          {/* Sector + recurrence */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {task.sector && <span className="text-xs text-slate-400">{task.sector.icon} {task.sector.name}</span>}
            {task.recurrence_type && task.recurrence_type !== 'none' && (
              <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                🔁 {{ weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal' }[task.recurrence_type as 'weekly' | 'biweekly' | 'monthly']}
              </span>
            )}
          </div>

          {/* Mobile: responsible + badges + date + progress */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Responsible */}
            {task.responsible ? (
              <div className="flex items-center gap-1">
                <Avatar name={task.responsible.name} avatarUrl={task.responsible.avatar_url} size="sm" />
                <span className="text-xs text-slate-500 truncate max-w-[90px]">{task.responsible.name}</span>
              </div>
            ) : (
              <span className="flex items-center gap-0.5 text-xs text-slate-300">
                <User className="w-3 h-3" /> Sem resp.
              </span>
            )}

            {/* Priority */}
            <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-semibold', getPriorityColor(task.priority), task.priority === 'urgent' && 'animate-pulse-urgent')}>
              {getPriorityLabel(task.priority)}
            </span>

            {/* Status */}
            <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-medium', getStatusColor(task.status))}>
              {getStatusLabel(task.status)}
            </span>

            {/* Due date */}
            {task.due_date && (
              <span className={cn(
                'flex items-center gap-1 text-xs font-medium rounded-full px-1.5 py-0.5',
                dueDateStatus === 'overdue' && 'bg-red-100 text-red-600',
                dueDateStatus === 'urgent' && 'bg-amber-100 text-amber-600',
                dueDateStatus === 'normal' && 'text-slate-400',
              )}>
                <Calendar className="w-3 h-3" />
                {dueDateStatus === 'overdue' ? 'ATRASADA' : dueDateStatus === 'urgent' ? `⚠ ${formatDate(task.due_date)}` : formatDate(task.due_date)}
              </span>
            )}

            {/* Progress */}
            {task.subtasks.length > 0 && (
              <div className="flex items-center gap-1.5 w-20">
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs text-slate-400 tabular-nums">{progress}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions — always visible, compact */}
        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 justify-center" onClick={e => e.stopPropagation()}>
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
        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 px-5 py-4">
          {task.description && (
            <p className="text-sm text-slate-500 mb-4 pb-3 border-b border-slate-100">{task.description}</p>
          )}

          {task.subtasks.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtarefas</span>
              <span className="text-xs text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5">
                {completedCount}/{task.subtasks.length}
              </span>
            </div>
          )}

          <div className="space-y-0.5">
            {task.subtasks
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(subtask => (
                <div
                  key={subtask.id}
                  draggable
                  onDragStart={() => handleDragStart(subtask.id)}
                  onDragOver={e => handleDragOver(e, subtask.id)}
                  onDrop={e => handleDrop(e, subtask.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors group',
                    dragOverId === subtask.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700' : 'hover:bg-white dark:hover:bg-slate-800',
                    editingSubtaskId === subtask.id ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm' : '',
                    highlightMemberId && subtask.responsible_id === highlightMemberId && editingSubtaskId !== subtask.id
                      ? 'bg-indigo-50/70 dark:bg-indigo-900/20 ring-1 ring-indigo-300 dark:ring-indigo-700'
                      : ''
                  )}
                >
                  {/* Drag handle */}
                  <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Checkbox */}
                  <button
                    onClick={() => onToggleSubtask(subtask.id, subtask.status as 'pending' | 'completed')}
                    className="flex-shrink-0 transition-colors"
                  >
                    {subtask.status === 'completed'
                      ? <CheckSquare className="w-4 h-4 text-indigo-500" />
                      : <Square className="w-4 h-4 text-slate-400 hover:text-indigo-500" />
                    }
                  </button>

                  {editingSubtaskId === subtask.id ? (
                    /* Edit mode */
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') cancelEdit() }}
                        className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <select
                        value={editResponsible}
                        onChange={e => setEditResponsible(e.target.value)}
                        className="w-36 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Sem responsável</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <button onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()} className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <span className={cn('flex-1 text-sm', subtask.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300')}>
                        {subtask.title}
                      </span>
                      {subtask.responsible && (
                        <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">{subtask.responsible.name}</span>
                      )}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(subtask.id, subtask.title, subtask.responsible_id)}
                          className="p-1 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
                          title="Editar subtarefa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteSubtask(subtask.id, task.id)}
                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Remover subtarefa"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

            {/* Add subtask inline */}
            {!addingSubtask ? (
              <button
                onClick={() => {
                  setNewSubtaskResponsible(task.responsible_id ?? '')
                  setAddingSubtask(true)
                }}
                className="flex items-center gap-2 w-full px-2 py-2 text-sm text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors mt-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar subtarefa
              </button>
            ) : (
              <div className="mt-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm space-y-2">
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
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newSubtaskResponsible}
                    onChange={e => setNewSubtaskResponsible(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

          <TaskComments taskId={task.id} currentMemberId={currentMemberId} members={members} />
        </div>
      )}
    </div>
  )
}
