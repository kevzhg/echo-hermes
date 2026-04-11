import type { Context } from '../../types'
import { ContextItem } from './ContextItem'

interface ContextTreeProps {
  contexts: Context[]
  expandedContextIds: Set<string>
  activeThreadId: string | null
  onToggleContextExpanded: (contextId: string) => void
  onSelectThread: (threadId: string) => void
}

export function ContextTree({
  contexts,
  expandedContextIds,
  activeThreadId,
  onToggleContextExpanded,
  onSelectThread,
}: ContextTreeProps) {
  if (contexts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-600">
        No matching contexts
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {contexts.map(context => (
        <ContextItem
          key={context.id}
          context={context}
          isExpanded={expandedContextIds.has(context.id)}
          activeThreadId={activeThreadId}
          onToggleExpand={() => onToggleContextExpanded(context.id)}
          onSelectThread={onSelectThread}
        />
      ))}
    </div>
  )
}
