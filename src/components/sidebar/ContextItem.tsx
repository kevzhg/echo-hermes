import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ContextWithThreads } from '../../types'
import { ThreadItem } from './ThreadItem'
import { InlineInput } from './InlineInput'

interface ContextItemProps {
  context: ContextWithThreads
  isExpanded: boolean
  activeThreadId: string | null
  onToggleExpand: () => void
  onSelectThread: (threadId: string) => void
  onCreateThread: (contextId: string, name: string) => Promise<string>
  onRenameThread: (threadId: string, name: string) => void
  onSetThreadSessionId: (threadId: string, sessionId?: string) => void
  onDeleteThread: (threadId: string) => void
  onToggleThreadFavorite: (threadId: string) => void
  onReorderThreads: (contextId: string, orderedIds: string[]) => void
  onContextDragStart: (contextId: string) => void
  onContextDragOver: (e: React.DragEvent, contextId: string) => void
  onContextDrop: (contextId: string) => void
}

export function ContextItem({
  context, isExpanded, activeThreadId, onToggleExpand, onSelectThread,
  onCreateThread, onRenameThread, onSetThreadSessionId, onDeleteThread,
  onToggleThreadFavorite, onReorderThreads,
  onContextDragStart, onContextDragOver, onContextDrop,
}: ContextItemProps) {
  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [ctxDragOver, setCtxDragOver] = useState(false)

  const handleDragStart = useCallback((threadId: string) => {
    setDraggedId(threadId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, _threadId: string) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((targetId: string) => {
    if (!draggedId || draggedId === targetId) return
    const ids = context.threads.map(t => t.id)
    const fromIndex = ids.indexOf(draggedId)
    const toIndex = ids.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return
    ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, draggedId)
    onReorderThreads(context.id, ids)
    setDraggedId(null)
  }, [draggedId, context.threads, context.id, onReorderThreads])

  return (
    <div className="mb-0.5">
      <button
        draggable
        onClick={onToggleExpand}
        onDragStart={() => onContextDragStart(context.id)}
        onDragOver={(e) => { e.preventDefault(); setCtxDragOver(true); onContextDragOver(e, context.id) }}
        onDragLeave={() => setCtxDragOver(false)}
        onDrop={() => { setCtxDragOver(false); onContextDrop(context.id) }}
        onDragEnd={() => setCtxDragOver(false)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-zinc-300 hover:bg-zinc-800/50 transition-colors ${ctxDragOver ? 'border-t border-blue-500' : ''}`}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0" />
        )}
        <span>{context.emoji}</span>
        <span className="truncate">{context.name}</span>
        {!isExpanded && (
          <span className="ml-auto bg-zinc-800 rounded text-[10px] text-zinc-500 px-1.5 py-0.5 shrink-0">
            {context.threads.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
          {context.threads.map(thread => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onClick={() => onSelectThread(thread.id)}
              onRename={onRenameThread}
              onSetSessionId={onSetThreadSessionId}
              onDelete={onDeleteThread}
              onToggleFavorite={onToggleThreadFavorite}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
          {isCreatingThread ? (
            <div className="px-1">
              <InlineInput
                placeholder="Thread name..."
                onConfirm={(name) => {
                  onCreateThread(context.id, name).then(threadId => {
                    onSelectThread(threadId)
                    setIsCreatingThread(false)
                  })
                }}
                onCancel={() => setIsCreatingThread(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingThread(true)}
              className="w-full text-left rounded px-2.5 py-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              + New Thread
            </button>
          )}
        </div>
      )}
    </div>
  )
}
