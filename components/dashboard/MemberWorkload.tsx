import Avatar from '@/components/ui/Avatar'
import type { MemberWorkload } from '@/lib/types'

export default function MemberWorkloadList({ members }: { members: MemberWorkload[] }) {
  if (members.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-sm">Nenhum membro com tarefas abertas.</div>
  }

  const max = Math.max(...members.map(m => m.open), 1)

  return (
    <div className="space-y-3">
      {members.map(({ member, open, overdue }) => (
        <div key={member.id} className="flex items-center gap-3">
          <Avatar name={member.name} avatarUrl={member.avatar_url} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{member.name}</span>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {overdue > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                    {overdue} atrasada{overdue > 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">{open} aberta{open !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(open / max) * 100}%`,
                  backgroundColor: overdue > 0 ? '#ef4444' : '#6366f1',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
