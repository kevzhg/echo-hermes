import { useState } from 'react'
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
}

export function ContextItem({
  context,
  isExpanded,
  activeThreadId,
  onToggleExpand,
  onSelectThread,
  onCreateThread,
}: ContextItemProps) {
  const [isCreatingThread, setIsCreatingThread] = useState(false)

  return (
    <div className="mb-0.5">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-zinc-300 hover:bg-zinc-800/50 transition-colors"
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
