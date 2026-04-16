import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ThinkBlockProps {
  text: string
  open: boolean
}

export function ThinkBlock({ text, open }: ThinkBlockProps) {
  const [expanded, setExpanded] = useState(open)
  const startRef = useRef<number | null>(null)
  const [durationMs, setDurationMs] = useState<number | null>(null)

  useEffect(() => {
    if (open && startRef.current === null) {
      startRef.current = Date.now()
    }
    if (!open && startRef.current !== null && durationMs === null) {
      setDurationMs(Date.now() - startRef.current)
      setExpanded(false)
    }
  }, [open, durationMs])

  const accent = open ? 'border-amber-500/40' : 'border-zinc-700'
  const label = open
    ? 'Thinking…'
    : `Thought${durationMs !== null ? ` · ${(durationMs / 1000).toFixed(1)}s` : ''}`

  return (
    <div className={`my-2 border-l-2 ${accent} bg-zinc-900/40 rounded-r overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 hover:bg-zinc-800/40 cursor-pointer"
      >
        {expanded
          ? <ChevronDown className="h-3 w-3 shrink-0" />
          : <ChevronRight className="h-3 w-3 shrink-0" />}
        <span>{label}</span>
        {open && (
          <span className="ml-1 inline-flex gap-0.5">
            {[0, 0.2, 0.4].map((d, i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-amber-400/70 animate-pulse"
                style={{ animationDelay: `${d}s`, animationDuration: '1.2s' }}
              />
            ))}
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2 text-[12px] italic text-zinc-500 whitespace-pre-wrap leading-relaxed border-t border-zinc-800/50">
          {text}
          {open && <span className="animate-pulse ml-0.5 text-zinc-400">&#9611;</span>}
        </div>
      )}
    </div>
  )
}
