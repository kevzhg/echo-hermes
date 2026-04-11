import { Plus, Settings } from 'lucide-react'
import type { AgentStatus as AgentStatusType, Context } from '../../types'
import { AgentStatus } from './AgentStatus'
import { SearchInput } from './SearchInput'
import { ContextTree } from './ContextTree'

interface SidebarProps {
  agentStatus: AgentStatusType
  contexts: Context[]
  expandedContextIds: Set<string>
  activeThreadId: string | null
  filterQuery: string
  onFilterQueryChange: (query: string) => void
  onToggleContextExpanded: (contextId: string) => void
  onSelectThread: (threadId: string) => void
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
}: SidebarProps) {
  return (
    <div className="h-full bg-[#18181b] rounded-lg border border-zinc-800 p-3 flex flex-col">
      <AgentStatus status={agentStatus} />

      <SearchInput
        value={filterQuery}
        onChange={onFilterQueryChange}
        placeholder="Search contexts..."
      />

      <ContextTree
        contexts={contexts}
        expandedContextIds={expandedContextIds}
        activeThreadId={activeThreadId}
        onToggleContextExpanded={onToggleContextExpanded}
        onSelectThread={onSelectThread}
      />

      <div className="flex gap-1.5 mt-2 pt-2 border-t border-zinc-800">
        <button className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded py-1.5 text-xs text-zinc-400 transition-colors">
          <Plus className="h-3 w-3" />
          New Context
        </button>
        <button
          className="w-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-500 transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
