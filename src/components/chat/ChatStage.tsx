import type { Context, Thread } from '../../types'

interface ChatStageProps {
  activeContext: Context | null
  activeThread: Thread | null
}

export function ChatStage({ activeContext, activeThread }: ChatStageProps) {
  return (
    <div className="h-full bg-[#0a0a0b] rounded-lg border border-zinc-800 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800">
        {activeContext && activeThread ? (
          <div className="flex items-center gap-2 text-sm">
            <span>{activeContext.emoji}</span>
            <span className="text-zinc-400">{activeContext.name}</span>
            <span className="text-zinc-600">/</span>
            <span className="font-medium text-white">{activeThread.name}</span>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">Select a thread</div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        {activeThread
          ? 'Chat messages will appear here (Phase 2)'
          : 'Select a context and thread to begin'}
      </div>

      <div className="px-4 pb-4">
        <div className="bg-[#18181b] border border-zinc-800 rounded-md px-3 py-2.5 text-xs text-zinc-600">
          Type a message... (Phase 2)
        </div>
      </div>
    </div>
  )
}
