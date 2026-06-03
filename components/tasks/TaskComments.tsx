'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, AtSign, MessageSquare } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { getInitials } from '@/lib/utils'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CommentWithAuthor, TeamMember } from '@/lib/types'

interface TaskCommentsProps {
  taskId: string
  currentMemberId: string | null
  members: TeamMember[]
}

// Primeiro nome normalizado (sem acento, minúsculo) — usado para casar menções
function firstNameKey(name: string) {
  return name.trim().split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function TaskComments({ taskId, currentMemberId, members }: TaskCommentsProps) {
  const supabase = useMemo(() => createClient(), [])
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Autocomplete de menção
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')

  // Mapa de primeiro-nome → membros, para destacar menções válidas
  const validFirstNames = useMemo(() => {
    const set = new Set<string>()
    members.forEach(m => set.add(firstNameKey(m.name)))
    return set
  }, [members])

  function renderContent(content: string) {
    // Destaca @palavra (com acentos) apenas se corresponder a um membro
    return content.split(/(@[\p{L}\p{N}_]+)/gu).map((part, i) => {
      if (part.startsWith('@')) {
        const key = part.slice(1).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        if (validFirstNames.has(key)) {
          return <span key={i} className="text-indigo-600 dark:text-indigo-400 font-semibold">{part}</span>
        }
      }
      return part
    })
  }

  function timeAgo(dateStr: string) {
    try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ptBR }) }
    catch { return '' }
  }

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

  // Detecta se o cursor está digitando uma menção (@algo) para abrir o autocomplete
  function detectMention(value: string, cursorPos: number) {
    const upToCursor = value.slice(0, cursorPos)
    const match = upToCursor.match(/@([\p{L}\p{N}_]*)$/u)
    if (match) {
      setMentionOpen(true)
      setMentionQuery(match[1].toLowerCase())
    } else {
      setMentionOpen(false)
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setText(value)
    detectMention(value, e.target.selectionStart ?? value.length)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }

  function insertMention(member: TeamMember) {
    const ta = textareaRef.current
    if (!ta) return
    const cursor = ta.selectionStart ?? text.length
    const before = text.slice(0, cursor).replace(/@[\p{L}\p{N}_]*$/u, '')
    const after = text.slice(cursor)
    const firstName = member.name.trim().split(/\s+/)[0]
    const newText = `${before}@${firstName} ${after}`
    setText(newText)
    setMentionOpen(false)
    setMentionQuery('')
    // Reposiciona o foco
    requestAnimationFrame(() => {
      ta.focus()
      const pos = before.length + firstName.length + 2
      ta.setSelectionRange(pos, pos)
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    })
  }

  const mentionMatches = mentionOpen
    ? members
        .filter(m => m.id !== currentMemberId)
        .filter(m => mentionQuery === '' || firstNameKey(m.name).includes(mentionQuery) || m.name.toLowerCase().includes(mentionQuery))
        .slice(0, 5)
    : []

  async function handleSend() {
    if (!text.trim() || sending || !currentMemberId) return
    setSending(true)
    const content = text.trim()

    setText('')
    setMentionOpen(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const { data: inserted } = await supabase
      .from('task_comments')
      .insert({ task_id: taskId, author_id: currentMemberId, content })
      .select('*, author:team_members(*)')
      .single()

    if (inserted) {
      setComments(prev => [...prev, inserted as CommentWithAuthor])

      // Notifica membros mencionados (casa pelo primeiro nome, ignorando acentos)
      const mentions = content.match(/@([\p{L}\p{N}_]+)/gu) ?? []
      const notified = new Set<string>()
      for (const mention of mentions) {
        const key = mention.slice(1).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        const found = members.find(m => firstNameKey(m.name) === key)
        if (found && found.id !== currentMemberId && !notified.has(found.id)) {
          notified.add(found.id)
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
    }
    setSending(false)
  }

  function handleDelete(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    supabase.from('task_comments').delete().eq('id', commentId).then(({ error }) => {
      if (error) fetchComments()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Se o autocomplete está aberto, Enter seleciona o primeiro; senão envia
    if (e.key === 'Enter' && !e.shiftKey) {
      if (mentionOpen && mentionMatches.length > 0) {
        e.preventDefault()
        insertMention(mentionMatches[0])
        return
      }
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape' && mentionOpen) setMentionOpen(false)
  }

  return (
    <div className="mt-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 p-3.5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" />
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
        <div className="relative mt-3">
          {/* Dropdown de autocomplete de menção */}
          {mentionOpen && mentionMatches.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl overflow-hidden z-10">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 flex items-center gap-1">
                <AtSign className="w-3 h-3" /> Mencionar
              </p>
              {mentionMatches.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => insertMention(m)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {getInitials(m.name)}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-200">{m.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Comente... Digite @ para mencionar alguém."
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors self-end disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
