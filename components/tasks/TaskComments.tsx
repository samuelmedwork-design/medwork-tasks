'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2 } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CommentWithAuthor } from '@/lib/types'

interface TaskCommentsProps {
  taskId: string
  currentMemberId: string | null
}

function renderContent(text: string) {
  return text.split(/(@\w+)/g).map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} className="text-indigo-600 dark:text-indigo-400 font-medium">{part}</span>
      : part
  )
}

function timeAgo(dateStr: string) {
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ptBR }) }
  catch { return '' }
}

export default function TaskComments({ taskId, currentMemberId }: TaskCommentsProps) {
  const supabase = useMemo(() => createClient(), [])
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('task_comments')
      .select('*, author:team_members(*)')
      .eq('task_id', taskId)
      .order('created_at')
    setComments((data as CommentWithAuthor[]) ?? [])
    setLoading(false)
  }, [supabase, taskId])

  useEffect(() => {
    fetchComments()
    const channel = supabase
      .channel(`comments-${taskId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` }, () => fetchComments())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` }, () => fetchComments())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [taskId, fetchComments, supabase])

  async function handleSend() {
    if (!text.trim() || sending || !currentMemberId) return
    setSending(true)
    const content = text.trim()

    // Limpa input e feedback visual imediato ANTES da chamada ao banco
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const { data: inserted } = await supabase
      .from('task_comments')
      .insert({ task_id: taskId, author_id: currentMemberId, content })
      .select('*, author:team_members(*)')
      .single()

    // Atualização otimista: adiciona o comentário imediatamente na lista
    if (inserted) {
      setComments(prev => [...prev, inserted as CommentWithAuthor])

      // Notificações de @menção em background (não bloqueia UI)
      const mentions = content.match(/@(\w+)/g) ?? []
      if (mentions.length > 0) {
        supabase.from('team_members').select('id,name').then(({ data: allMembers }) => {
          for (const mention of mentions) {
            const firstName = mention.slice(1).toLowerCase()
            const found = allMembers?.find(m => m.name.split(' ')[0].toLowerCase() === firstName)
            if (found && found.id !== currentMemberId) {
              fetch('/api/email/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'comment_mention', taskId,
                  mentionedMemberId: found.id,
                  commentContent: content,
                  authorName: (inserted as CommentWithAuthor).author?.name ?? 'Alguém',
                }),
              }).catch(() => {})
            }
          }
        })
      }
    }

    setSending(false)
  }

  function handleDelete(commentId: string) {
    // Remoção otimista: tira da lista imediatamente
    setComments(prev => prev.filter(c => c.id !== commentId))
    supabase.from('task_comments').delete().eq('id', commentId).then(({ error }) => {
      // Se falhar, recarrega para restaurar o estado correto
      if (error) fetchComments()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        Comentários {comments.length > 0 && <span className="normal-case font-normal">({comments.length})</span>}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {comments.length === 0 && (
            <p className="text-xs text-slate-400 italic py-1">Nenhum comentário ainda.</p>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-2.5 group">
              <Avatar name={comment.author?.name ?? '?'} avatarUrl={comment.author?.avatar_url} size="sm" className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {comment.author?.name ?? 'Desconhecido'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>
                    {currentMemberId === comment.author_id && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-400 transition-all rounded"
                        title="Excluir comentário"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {renderContent(comment.content)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentMemberId && (
        <div className="flex gap-2 mt-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Escreva um comentário... (Enter envia, Shift+Enter nova linha)"
            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors self-end disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
          </button>
        </div>
      )}
    </div>
  )
}
