import { useState, useCallback } from 'react'
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
  onToggleThreadFavorite: (threadId: string) => void
  onReorderThreads: (contextId: string, orderedIds: string[]) => void
  onReorderContexts: (orderedIds: string[]) => void
}

export function ContextTree({
  contexts, expandedContextIds, activeThreadId, onToggleContextExpanded,
  onSelectThread, onCreateThread, onRenameThread, onSetThreadSessionId,
  onDeleteThread, onToggleThreadFavorite, onReorderThreads, onReorderContexts,
}: ContextTreeProps) {
  const [draggedCtxId, setDraggedCtxId] = useState<string | null>(null)

  const handleContextDragStart = useCallback((contextId: string) => {
    setDraggedCtxId(contextId)
  }, [])

  const handleContextDragOver = useCallback((e: React.DragEvent, _contextId: string) => {
    e.preventDefault()
  }, [])

  const handleContextDrop = useCallback((targetId: string) => {
    if (!draggedCtxId || draggedCtxId === targetId) return
    const ids = contexts.map(c => c.id)
    const fromIndex = ids.indexOf(draggedCtxId)
    const toIndex = ids.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return
    ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, draggedCtxId)
    onReorderContexts(ids)
    setDraggedCtxId(null)
  }, [draggedCtxId, contexts, onReorderContexts])

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
          onToggleThreadFavorite={onToggleThreadFavorite}
          onReorderThreads={onReorderThreads}
          onContextDragStart={handleContextDragStart}
          onContextDragOver={handleContextDragOver}
          onContextDrop={handleContextDrop}
        />
      ))}
    </div>
  )
}
