import { Star } from 'lucide-react'
import type { Thread } from '../../types'

interface FavoritesBarProps {
  threads: Thread[]
  activeThreadId: string | null
  onSelectThread: (threadId: string) => void
}

export function FavoritesBar({ threads, activeThreadId, onSelectThread }: FavoritesBarProps) {
  if (threads.length === 0) return null

  return (
    <div className="mb-2">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 px-1 flex items-center gap-1">
        <Star className="h-2.5 w-2.5 text-amber-500" />
        Favorites
      </div>
      <div className="flex flex-wrap gap-1">
        {threads.map(thread => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition-colors ${
              thread.id === activeThreadId
                ? 'bg-blue-500/15 border border-blue-500/25 text-blue-400'
                : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            {thread.name}
          </button>
        ))}
      </div>
    </div>
  )
}
