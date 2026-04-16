import { useState, useMemo } from 'react'
import { Settings, NotebookPen } from 'lucide-react'
import { ReminderBadge } from './ReminderBadge'
import type { AgentStatus as AgentStatusType, ContextWithThreads } from '../../types'
import { AgentStatus } from './AgentStatus'
import { SearchInput } from './SearchInput'
import { FavoritesBar } from './FavoritesBar'
import { ContextTree } from './ContextTree'
import { InlineInput } from './InlineInput'
import { EmojiPicker } from './EmojiPicker'

interface SidebarProps {
  agentStatus: AgentStatusType
  contexts: ContextWithThreads[]
  expandedContextIds: Set<string>
  activeThreadId: string | null
  filterQuery: string
  onFilterQueryChange: (query: string) => void
  onToggleContextExpanded: (contextId: string) => void
  onSelectThread: (threadId: string) => void
  onCreateContext: (name: string, emoji: string) => Promise<string>
  onCreateThread: (contextId: string, name: string) => Promise<string>
  onRenameThread: (threadId: string, name: string) => void
  onSetThreadSessionId: (threadId: string, sessionId?: string) => void
  onDeleteThread: (threadId: string) => void
  onToggleThreadFavorite: (threadId: string) => void
  onReorderThreads: (contextId: string, orderedIds: string[]) => void
  onReorderContexts: (orderedIds: string[]) => void
  onRenameContext: (contextId: string, name: string, emoji: string) => void
  onDeleteContext: (contextId: string) => void
  onOpenReminders?: () => void
  onOpenScratch: () => void
  scratchActive: boolean
}

export function Sidebar({
  agentStatus,
  contexts,
  expandedContextIds,
  activeThreadId,
  filterQuery,
  onFilterQueryChange,
  onToggleContextExpanded,
  onSelectThread,
  onCreateContext,
  onCreateThread,
  onRenameThread,
  onSetThreadSessionId,
  onDeleteThread,
  onToggleThreadFavorite,
  onReorderThreads,
  onReorderContexts,
  onRenameContext,
  onDeleteContext,
  onOpenReminders,
  onOpenScratch,
  scratchActive,
}: SidebarProps) {
  const favoriteThreads = useMemo(
    () => contexts.flatMap(c => c.threads).filter(t => t.favorite),
    [contexts],
  )

  const [isCreatingContext, setIsCreatingContext] = useState(false)
  const [pendingEmoji, setPendingEmoji] = useState('📁')

  const handleCreateContext = (name: string) => {
    onCreateContext(name, pendingEmoji).then(id => {
      onToggleContextExpanded(id)
      setIsCreatingContext(false)
      setPendingEmoji('📁')
    })
  }

  return (
    <div className="h-full bg-[#18181b] rounded-lg border border-zinc-800 p-3 flex flex-col">
      <AgentStatus status={agentStatus} />

      <button
        type="button"
        onClick={onOpenScratch}
        className={`mb-2 w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs border transition-colors cursor-pointer ${
          scratchActive
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/25 shadow-[0_0_0_1px_rgba(245,158,11,0.1)_inset]'
            : 'text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-200'
        }`}
        title="Scratchpad (home)"
      >
        <NotebookPen className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">scratch</span>
        <span className="ml-auto text-[10px] font-mono text-zinc-600 tracking-wider">~/</span>
      </button>

      <SearchInput
        value={filterQuery}
        onChange={onFilterQueryChange}
        placeholder="Search contexts..."
      />

      <FavoritesBar
        threads={favoriteThreads}
        activeThreadId={activeThreadId}
        onSelectThread={onSelectThread}
      />

      <ContextTree
        contexts={contexts}
        expandedContextIds={expandedContextIds}
        activeThreadId={activeThreadId}
        onToggleContextExpanded={onToggleContextExpanded}
        onSelectThread={onSelectThread}
        onCreateThread={onCreateThread}
        onRenameThread={onRenameThread}
        onSetThreadSessionId={onSetThreadSessionId}
        onDeleteThread={onDeleteThread}
        onToggleThreadFavorite={onToggleThreadFavorite}
        onReorderThreads={onReorderThreads}
        onReorderContexts={onReorderContexts}
        onRenameContext={onRenameContext}
        onDeleteContext={onDeleteContext}
      />

      <div className="mt-2 pt-2 border-t border-zinc-800">
        {isCreatingContext ? (
          <div className="flex flex-col gap-2">
            <EmojiPicker selected={pendingEmoji} onSelect={setPendingEmoji} />
            <InlineInput
              placeholder="Context name..."
              onConfirm={handleCreateContext}
              onCancel={() => {
                setIsCreatingContext(false)
                setPendingEmoji('📁')
              }}
            />
          </div>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={() => setIsCreatingContext(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded py-1.5 text-xs text-zinc-400 transition-colors"
            >
              + New Context
            </button>
            <ReminderBadge onClick={() => onOpenReminders?.()} />
            <button
              className="w-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-500 transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
