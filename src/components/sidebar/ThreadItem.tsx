import type { Thread } from '../../types'

interface ThreadItemProps {
  thread: Thread
  isActive: boolean
  onClick: () => void
}

export function ThreadItem({ thread, isActive, onClick }: ThreadItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors ${
        isActive
          ? 'bg-zinc-800 text-white border-l-2 border-blue-500 pl-2'
          : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      {thread.name}
    </button>
  )
}
