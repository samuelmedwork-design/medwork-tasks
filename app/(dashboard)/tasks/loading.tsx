import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        <div className="h-9 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
      </div>
      <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      {[1,2,3,4].map(i => (
        <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}
