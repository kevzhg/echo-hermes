import { useState, useCallback } from 'react'
import type { Context, Thread, Message, Skill } from '../../types'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { SessionInfo } from './SessionInfo'
import { ModelSelector } from './ModelSelector'

interface ChatStageProps {
  activeContext: Context | null
  activeThread: Thread | null
  messages: Message[]
  skills: Skill[]
  onSend: (content: string, forcedSkills?: string[]) => void
  pendingText?: string | null
  onPendingTextConsumed?: () => void
}

export function ChatStage({ activeContext, activeThread, messages, skills, onSend, pendingText, onPendingTextConsumed }: ChatStageProps) {
  const [inputValue, setInputValue] = useState('')
  const isTyping = messages.some(m => m.status === 'streaming')

  const handleSend = useCallback((content: string, forcedSkills?: string[]) => {
    onSend(content, forcedSkills)
  }, [onSend])

  return (
    <div className="h-full bg-[#0a0a0b] rounded-lg border border-zinc-800 flex flex-col">
      {/* Top bar */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3">
        {activeContext && activeThread ? (
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span>{activeContext.emoji}</span>
            <span className="text-zinc-400 truncate">{activeContext.name}</span>
            <span className="text-zinc-600">/</span>
            <span className="font-medium text-white truncate">{activeThread.name}</span>
            {activeThread.hermesSessionId && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] shrink-0"
                title={`Session ${activeThread.hermesSessionId} loaded`}
              />
            )}
          </div>
        ) : (
          <div className="text-sm text-zinc-500">Select a thread</div>
        )}
        {activeThread && (
          <div className="flex items-center gap-3 shrink-0">
            <ModelSelector threadId={activeThread.id} currentModel={activeThread.model} />
            {activeThread.hermesSessionId && (
              <SessionInfo
                sessionId={activeThread.hermesSessionId}
                threadId={activeThread.id}
              />
            )}
          </div>
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
      <ChatInput
        onSend={handleSend}
        disabled={isTyping}
        skills={skills}
        value={inputValue}
        onChange={setInputValue}
        pendingText={pendingText}
        onPendingTextConsumed={onPendingTextConsumed}
      />
    </div>
  )
}
