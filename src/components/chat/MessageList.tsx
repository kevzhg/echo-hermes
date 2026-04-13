import { useEffect, useRef } from 'react'
import type { Message } from '../../types'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { SelfInitiatedDivider } from './SelfInitiatedDivider'

interface MessageListProps {
  messages: Message[]
  isTyping?: boolean
}

export function MessageList({ messages, isTyping = false }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  if (messages.length === 0 && !isTyping) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
        No messages yet
      </div>
    )
  }

  const elements: React.ReactNode[] = []
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const prevWasSelfInitiated = i > 0 && messages[i - 1].kairos?.selfInitiated
    if (msg.kairos?.selfInitiated && !prevWasSelfInitiated) {
      elements.push(<SelfInitiatedDivider key={`div-${msg.id}`} />)
    }
    elements.push(<MessageBubble key={msg.id} message={msg} />)
  }

  const hasStreamingMessage = messages.some(m => m.status === 'streaming')

  return (
    <div className="h-full overflow-y-auto py-3">
      {elements}
      {isTyping && !hasStreamingMessage && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
