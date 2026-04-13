import type { ContextWithThreads } from '../../types'
import { ContextItem } from './ContextItem'

interface ContextTreeProps {
  contexts: ContextWithThreads[]
  expandedContextIds: Set<string>
  activeThreadId: string | null
  onToggleContextExpanded: (contextId: string) => void
  onSelectThread: (threadId: string) => void
  onCreateThread: (contextId: string, name: string) => Promise<string>
  onRenameThread: (threadId: string, name: string) => void
  onSetThreadSessionId: (threadId: string, sessionId?: string) => void
  onDeleteThread: (threadId: string) => void
}

export function ContextTree({
  contexts,
  expandedContextIds,
  activeThreadId,
  onToggleContextExpanded,
  onSelectThread,
  onCreateThread,
  onRenameThread,
  onSetThreadSessionId,
  onDeleteThread,
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
          onCreateThread={onCreateThread}
          onRenameThread={onRenameThread}
          onSetThreadSessionId={onSetThreadSessionId}
          onDeleteThread={onDeleteThread}
        />
      ))}
    </div>
  )
}
