import { useState, useEffect, useRef } from 'react'
import { Wrench, Brain, User, Bot, ChevronDown, ChevronRight } from 'lucide-react'
import type { MindEvent } from '../../hooks/useHermesConnection'

interface MindTimelineProps {
  events: MindEvent[]
  sessionId?: string
}

const ROLE_CONFIG = {
  system: { icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/8', border: 'border-violet-500/15', label: 'System' },
  user: { icon: User, color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/15', label: 'User' },
  assistant: { icon: Bot, color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15', label: 'Echo' },
  tool: { icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15', label: 'Tool' },
} as const

export function MindTimeline({ events, sessionId }: MindTimelineProps) {
  const [history, setHistory] = useState<MindEvent[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load historical messages on session change
  useEffect(() => {
    if (!sessionId) { setHistory([]); return }
    setLoading(true)
    fetch(`http://localhost:8000/api/sessions/${sessionId}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then(msgs => {
        setHistory(msgs.map((m: Record<string, unknown>) => ({
          dbId: m.id as number,
          role: m.role as string,
          content: m.content as string,
          timestamp: m.timestamp as number,
          toolName: m.toolName as string | undefined,
          toolCalls: m.toolCalls as { name: string }[] | undefined,
          reasoning: m.reasoning as string | undefined,
        })))
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [sessionId])

  // Auto-scroll on new events
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, history])

  // Merge history + live events, dedupe by dbId
  const allEvents = [...history]
  for (const e of events) {
    if (!allEvents.some(h => h.dbId === e.dbId)) {
      allEvents.push(e)
    }
  }
  allEvents.sort((a, b) => a.dbId - b.dbId)

  if (allEvents.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 py-12">
        {sessionId ? 'No messages in session' : 'Link a session to see the mind timeline'}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 h-full overflow-y-auto">
      {loading && <div className="text-[10px] text-zinc-600 px-2 py-1 italic">Loading history...</div>}
      {allEvents.map(evt => (
        <MindEventRow key={evt.dbId} event={evt} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function MindEventRow({ event }: { event: MindEvent }) {
  const [expanded, setExpanded] = useState(false)
  const roleKey = (event.role in ROLE_CONFIG ? event.role : 'assistant') as keyof typeof ROLE_CONFIG
  const config = ROLE_CONFIG[roleKey]
  const Icon = config.icon

  // For tool results, show tool name
  const label = event.toolName
    ? `${config.label}: ${event.toolName}`
    : event.toolCalls?.length
      ? `${config.label} → ${event.toolCalls.map(t => t.name).join(', ')}`
      : config.label

  const preview = event.content?.slice(0, 120) || (event.reasoning?.slice(0, 120)) || ''
  const hasMore = (event.content?.length ?? 0) > 120 || !!event.reasoning

  return (
    <div className={`${config.bg} border-b ${config.border} px-2 py-1.5`}>
      <button
        onClick={() => hasMore && setExpanded(e => !e)}
        className={`w-full flex items-start gap-1.5 text-left ${hasMore ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {hasMore && (
          expanded
            ? <ChevronDown className="h-2.5 w-2.5 text-zinc-600 mt-0.5 shrink-0" />
            : <ChevronRight className="h-2.5 w-2.5 text-zinc-600 mt-0.5 shrink-0" />
        )}
        <Icon className={`h-3 w-3 ${config.color} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium ${config.color}`}>{label}</span>
          </div>
          {!expanded && preview && (
            <div className="text-[10px] text-zinc-500 truncate mt-0.5">{preview}</div>
          )}
        </div>
      </button>
      {expanded && (
        <div className="mt-1 ml-5">
          {event.reasoning && (
            <div className="mb-1">
              <div className="text-[9px] uppercase tracking-wider text-zinc-600 mb-0.5">Reasoning</div>
              <pre className="text-[10px] text-violet-300/80 whitespace-pre-wrap break-all max-h-40 overflow-y-auto bg-black/20 rounded px-2 py-1">{event.reasoning}</pre>
            </div>
          )}
          {event.content && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-600 mb-0.5">Content</div>
              <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-all max-h-60 overflow-y-auto bg-black/20 rounded px-2 py-1">{event.content}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
