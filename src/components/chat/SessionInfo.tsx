import { useEffect, useState } from 'react'

interface SessionData {
  found: boolean
  message_count?: number
  tool_call_count?: number
  input_tokens?: number
  output_tokens?: number
  model?: string
  estimated_cost_usd?: number
}

interface SessionInfoProps {
  sessionId: string | undefined
}

// Known context windows per model (input token limits)
const CONTEXT_WINDOWS: Record<string, number> = {
  'qwen/qwen3.6-plus': 128_000,
  'claude-opus-4-6': 200_000,
  'claude-sonnet-4-6': 200_000,
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function SessionInfo({ sessionId }: SessionInfoProps) {
  const [data, setData] = useState<SessionData | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setData(null)
      return
    }
    let cancelled = false
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/sessions/${sessionId}`)
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        // bridge offline
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [sessionId])

  if (!sessionId || !data?.found) return null

  const totalTokens = (data.input_tokens ?? 0) + (data.output_tokens ?? 0)
  const contextWindow = CONTEXT_WINDOWS[data.model ?? ''] ?? 128_000
  const pct = Math.min(100, Math.round((totalTokens / contextWindow) * 100))

  const barColor =
    pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
      <span className="text-zinc-600">ctx</span>
      <div className="w-16 h-1 bg-zinc-800 rounded overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-zinc-400">{pct}%</span>
      <span className="text-zinc-600">
        {formatTokens(totalTokens)}/{formatTokens(contextWindow)}
      </span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-500">{data.message_count ?? 0} msg</span>
    </div>
  )
}
