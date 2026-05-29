import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Priority, TaskStatus, Subtask } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPriorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  }
  return labels[priority]
}

export function getPriorityColor(priority: Priority): string {
  const colors: Record<Priority, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
  }
  return colors[priority]
}

export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  }
  return labels[status]
}

export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    pending: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  }
  return colors[status]
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return '—'
    return format(date, "d 'de' MMM.", { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return '—'
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return '—'
  }
}

export function calculateProgress(subtasks: Pick<Subtask, 'status'>[]): number {
  if (!subtasks || subtasks.length === 0) return 0
  const completed = subtasks.filter((s) => s.status === 'completed').length
  return Math.round((completed / subtasks.length) * 100)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = parseISO(dueDate)
  return due < today
}

export type DueDateStatus = 'overdue' | 'urgent' | 'normal' | 'none'

export function getDueDateStatus(dueDate: string | null, status: TaskStatus): DueDateStatus {
  if (!dueDate || status === 'completed' || status === 'cancelled') return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = parseISO(dueDate)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 2) return 'urgent'
  return 'normal'
}
