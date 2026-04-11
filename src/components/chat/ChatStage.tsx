import { useState, useRef, useEffect, useCallback } from 'react'
import type { Context, Thread, Message } from '../../types'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

interface ChatStageProps {
  activeContext: Context | null
  activeThread: Thread | null
  messages: Message[]
}

export function ChatStage({ activeContext, activeThread, messages }: ChatStageProps) {
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

  const handleSend = useCallback((_message: string) => {
    setIsTyping(true)
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 1500)
  }, [])

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

      {/* Message area — min-h-0 is CRITICAL for flex scroll */}
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
      <ChatInput onSend={handleSend} />
    </div>
  )
}
