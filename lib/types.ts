export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type SubtaskStatus = 'pending' | 'completed'
export type MemberRole = 'admin' | 'member'

export interface Sector {
  id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: MemberRole
  sector_id: string | null
  auth_user_id: string | null
  created_at: string
}

export interface TeamMemberWithSector extends TeamMember {
  sector: Sector | null
}

export interface Task {
  id: string
  title: string
  description: string | null
  sector_id: string | null
  responsible_id: string | null
  due_date: string | null
  priority: Priority
  status: TaskStatus
  archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  responsible_id: string | null
  status: SubtaskStatus
  due_date: string | null
  sort_order: number
  created_at: string
}

export interface SubtaskWithRelations extends Subtask {
  responsible: TeamMember | null
}

export interface TaskWithRelations extends Task {
  sector: Sector | null
  responsible: TeamMember | null
  subtasks: SubtaskWithRelations[]
  created_by_member: TeamMember | null
}

export interface DashboardStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  overdue: number
}

export interface SectorProgress {
  sector: Sector
  total: number
  completed: number
  percentage: number
}

export interface MemberWorkload {
  member: TeamMember
  open: number
  overdue: number
  completed: number
}

export interface WeeklySummary {
  completedThisWeek: number
  createdThisWeek: number
  overdue: number
}

export interface MonthlyStats {
  created: number
  completed: number
  rate: number
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface CommentWithAuthor extends TaskComment {
  author: TeamMember
}
