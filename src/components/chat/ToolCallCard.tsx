import { useState } from 'react'
import { Wrench, ChevronDown, ChevronRight } from 'lucide-react'
import type { ToolCall } from '../../types'

interface ToolCallCardProps {
  tool: ToolCall
}

export function ToolCallCard({ tool }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  const colors = {
    running: {
      bg: 'bg-amber-500/8',
      border: 'border-amber-500/20',
      icon: 'text-amber-400 animate-pulse',
      text: 'text-amber-300',
    },
    complete: {
      bg: 'bg-zinc-800/60',
      border: 'border-zinc-700',
      icon: 'text-emerald-500',
      text: 'text-zinc-300',
    },
    error: {
      bg: 'bg-red-500/8',
      border: 'border-red-500/20',
      icon: 'text-red-400',
      text: 'text-red-300',
    },
  }[tool.status]

  // Pretty-print arguments JSON if possible
  let prettyArgs = tool.arguments
  if (prettyArgs) {
    try {
      const parsed = JSON.parse(prettyArgs)
      prettyArgs = JSON.stringify(parsed, null, 2)
    } catch {
      // not JSON — keep raw
    }
  }

  const hasDetails = !!(tool.arguments || tool.result)

  return (
    <div className={`rounded ${colors.bg} border ${colors.border} text-[11px] font-mono`}>
      <button
        onClick={() => hasDetails && setExpanded(e => !e)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left ${hasDetails ? 'cursor-pointer hover:bg-zinc-800/30' : 'cursor-default'}`}
      >
        {hasDetails && (
          expanded
            ? <ChevronDown className="h-2.5 w-2.5 shrink-0 text-zinc-600" />
            : <ChevronRight className="h-2.5 w-2.5 shrink-0 text-zinc-600" />
        )}
        <Wrench className={`h-3 w-3 shrink-0 ${colors.icon}`} />
        <span className={`truncate ${colors.text}`}>{tool.name}</span>
      </button>

      {expanded && hasDetails && (
        <div className="px-2.5 pb-2 pt-0 flex flex-col gap-1 border-t border-zinc-800/50">
          {prettyArgs && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-600 mt-1.5 mb-0.5">Input</div>
              <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-all max-h-40 overflow-y-auto bg-black/30 rounded px-2 py-1">{prettyArgs}</pre>
            </div>
          )}
          {tool.result && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-600 mt-1 mb-0.5">Output</div>
              <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-all max-h-40 overflow-y-auto bg-black/30 rounded px-2 py-1">{tool.result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
