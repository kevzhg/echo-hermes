import { useCallback } from 'react'
import type { Context, Thread, Message, Skill } from '../../types'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

interface ChatStageProps {
  activeContext: Context | null
  activeThread: Thread | null
  messages: Message[]
  skills: Skill[]
  onSend: (content: string, oneshotSkills?: string[]) => void
}

export function ChatStage({ activeContext, activeThread, messages, skills, onSend }: ChatStageProps) {
  const isTyping = messages.some(m => m.status === 'streaming')

  const handleSend = useCallback((content: string, oneshotSkills?: string[]) => {
    onSend(content, oneshotSkills)
  }, [onSend])

  return (
    <div className="h-full bg-[#0a0a0b] rounded-lg border border-zinc-800 flex flex-col">
      {/* Top bar */}
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

      {/* Message area */}
      <div className="flex-1 min-h-0">
        {activeThread ? (
          <MessageList messages={messages} isTyping={isTyping} />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
            Select a context and thread to begin
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isTyping} skills={skills} />
    </div>
  )
}
