import type { Message } from '../../types'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ToolCallCard } from './ToolCallCard'
import { ThinkingIndicator } from './ThinkingIndicator'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end px-4 py-1">
        <div
          className="bg-[#27272a] text-zinc-200 text-sm px-3.5 py-2.5 max-w-[78%] break-words"
          style={{ borderRadius: '12px 12px 4px 12px' }}
        >
          {message.content}
        </div>
        <div className="text-[11px] text-[#52525b] mt-1.5 pr-1">{time}</div>
      </div>
    )
  }

  const isSelfInitiated = message.kairos?.selfInitiated ?? false
  const bubbleBorder = isSelfInitiated
    ? '1px solid rgba(245, 158, 11, 0.2)'
    : '1px solid #27272a'

  const isStreaming = message.status === 'streaming'
  const isEmpty = message.content.trim() === ''
  const hasTools = message.toolCalls && message.toolCalls.length > 0

  return (
    <div className="flex flex-col items-start px-4 py-1 w-full">
      {hasTools && (
        <div className="flex flex-col gap-1 mb-1.5 max-w-[78%] w-full">
          {message.toolCalls!.map(t => <ToolCallCard key={t.id} tool={t} />)}
        </div>
      )}
      <div
        className="bg-[#18181b] text-zinc-300 text-sm px-3.5 py-2.5 max-w-[78%]"
        style={{ borderRadius: '12px 12px 12px 4px', border: bubbleBorder }}
      >
        {isStreaming && isEmpty ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              {[0, 0.2, 0.4].map((delay, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse"
                  style={{ animationDelay: `${delay}s`, animationDuration: '1.4s' }}
                />
              ))}
            </span>
          </span>
        ) : isStreaming ? (
          <span className="whitespace-pre-wrap">
            {message.content}
            <span className="animate-pulse ml-0.5 text-zinc-400">&#9611;</span>
          </span>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>
      {isStreaming && <ThinkingIndicator />}
      {!isStreaming && (
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[11px] text-[#52525b]">{time}</span>
        {typeof message.durationMs === 'number' && (
          <>
            <span className="text-[9px] text-[#3f3f46]">·</span>
            <span className="text-[11px] text-[#52525b]">
              {(message.durationMs / 1000).toFixed(1)}s
            </span>
          </>
        )}
        {message.tokenUsage && (
          <>
            <span className="text-[9px] text-[#3f3f46]">·</span>
            <span className="text-[11px] text-[#52525b]" title={`in: ${message.tokenUsage.input_tokens} out: ${message.tokenUsage.output_tokens}${message.tokenUsage.cache_read_tokens ? ` cache: ${message.tokenUsage.cache_read_tokens}` : ''}`}>
              {message.tokenUsage.input_tokens >= 1000 ? `${(message.tokenUsage.input_tokens / 1000).toFixed(1)}k` : message.tokenUsage.input_tokens}↓ {message.tokenUsage.output_tokens}↑
            </span>
          </>
        )}
        {message.kairos && (
          <>
            <span className="text-[9px] text-[#3f3f46]">·</span>
            {isSelfInitiated ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] text-[#f59e0b] rounded px-1.5 py-0.5"
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                }}
              >
                {message.kairos.emoji} {message.kairos.context} · self-initiated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#71717a] bg-[#18181b] border border-[#27272a] rounded px-1.5 py-0.5">
                {message.kairos.emoji} {message.kairos.context}
              </span>
            )}
          </>
        )}
      </div>
      )}
    </div>
  )
}
