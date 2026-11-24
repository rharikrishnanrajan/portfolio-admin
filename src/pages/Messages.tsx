import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2,
  Circle,
  Loader2,
  Mail,
  MailOpen,
  Reply,
  Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PageHeader, useToast, ConfirmButton } from '../components/ui'
import type { MessageRow } from '../types/rows'

type Filter = 'all' | 'unread'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function Messages() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<MessageRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setMessages((data as unknown as MessageRow[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    // Refresh unread count every 60 seconds
    const timer = setInterval(() => { void load() }, 60_000)
    return () => clearInterval(timer)
  }, [load])

  const markRead = async (id: string, is_read: boolean) => {
    try {
      const { data, error: err } = await supabase
        .from('messages')
        .update({ is_read })
        .eq('id', id)
        .select()
      if (err) throw err
      if (!data || data.length === 0) throw new Error('Update returned no rows.')
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read } : m))
      )
      if (selected?.id === id) setSelected((s) => s ? { ...s, is_read } : s)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const deleteMessage = async (id: string) => {
    try {
      const { error: err } = await supabase.from('messages').delete().eq('id', id)
      if (err) throw err
      setMessages((prev) => prev.filter((m) => m.id !== id))
      if (selected?.id === id) setSelected(null)
      toast.success('Message deleted.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleSelect = async (msg: MessageRow) => {
    setSelected(msg)
    // Auto-mark as read when opened
    if (!msg.is_read) {
      await markRead(msg.id, true)
    }
  }

  const filtered = filter === 'unread' ? messages.filter((m) => !m.is_read) : messages
  const unreadCount = messages.filter((m) => !m.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <PageHeader
          eyebrow="Contact"
          title="Messages"
          description="Incoming messages from your portfolio contact form. Unread messages shown in bold."
        />
        {/* Filter tabs */}
        <div className="flex gap-2 self-start shrink-0">
          {(['all', 'unread'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors ${
                filter === f
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-line bg-bg text-muted hover:text-ink'
              }`}
            >
              {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-8 text-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          <p className="font-semibold mb-1">Failed to load messages</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Mail className="size-8 text-muted mx-auto mb-3" />
          <p className="font-semibold text-ink mb-1">
            {filter === 'unread' ? 'No unread messages' : 'No messages yet'}
          </p>
          <p className="text-xs text-muted">
            {filter === 'unread'
              ? 'All messages have been read.'
              : 'Messages from your contact form will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Message list */}
          <div className="lg:col-span-2 space-y-1">
            {filtered.map((msg) => (
              <button
                key={msg.id}
                type="button"
                onClick={() => void handleSelect(msg)}
                className={`w-full text-left p-3 border transition-colors ${
                  selected?.id === msg.id
                    ? 'border-accent/50 bg-accent/10'
                    : 'border-line bg-surface hover:border-accent/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {msg.is_read ? (
                      <MailOpen className="size-4 text-muted" />
                    ) : (
                      <Mail className="size-4 text-accent" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${msg.is_read ? 'text-ink/80' : 'text-ink font-semibold'}`}>
                      {msg.name}
                    </p>
                    <p className="text-xs text-muted truncate">{msg.email}</p>
                    {msg.subject && (
                      <p className={`text-xs truncate mt-0.5 ${msg.is_read ? 'text-muted' : 'text-ink/80 font-medium'}`}>
                        {msg.subject}
                      </p>
                    )}
                    <p className="font-mono text-[0.6rem] text-muted mt-1">
                      {formatDate(msg.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Detail pane */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="card p-5 border-line space-y-4">
                {/* Header */}
                <div className="border-b border-line pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-ink">{selected.name}</h2>
                      <p className="text-xs text-muted font-mono">{selected.email}</p>
                      {selected.subject && (
                        <p className="text-sm text-ink/80 font-medium mt-1">{selected.subject}</p>
                      )}
                      <p className="font-mono text-[0.65rem] text-muted mt-1">
                        {formatDate(selected.created_at)}
                      </p>
                    </div>
                    {selected.is_read ? (
                      <Circle className="size-5 text-muted shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="size-5 text-accent shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed bg-bg/60 border border-line p-4">
                  {selected.body}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 border-t border-line flex-wrap">
                  <a
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject ?? 'Your message')}`}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    <Reply className="size-3.5" />
                    <span>Reply</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => void markRead(selected.id, !selected.is_read)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink transition-colors"
                  >
                    {selected.is_read ? (
                      <><Mail className="size-3.5" /> Mark Unread</>
                    ) : (
                      <><MailOpen className="size-3.5" /> Mark Read</>
                    )}
                  </button>

                  <ConfirmButton
                    onConfirm={() => void deleteMessage(selected.id)}
                    confirmText="Delete this message permanently?"
                    confirmButtonText="Yes, delete"
                    className="flex items-center gap-1.5 px-3 py-2 border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-mono uppercase tracking-wider transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete</span>
                  </ConfirmButton>
                </div>
              </div>
            ) : (
              <div className="card p-10 text-center border-line">
                <MailOpen className="size-8 text-muted mx-auto mb-3" />
                <p className="text-sm text-muted">Select a message to read it</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
