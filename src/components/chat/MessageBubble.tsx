import type { Message } from '../../types'
import { MarkdownRenderer } from './MarkdownRenderer'

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

  return (
    <div className="flex flex-col items-start px-4 py-1">
      <div
        className="bg-[#18181b] text-zinc-300 text-sm px-3.5 py-2.5 max-w-[78%]"
        style={{ borderRadius: '12px 12px 12px 4px', border: bubbleBorder }}
      >
        <MarkdownRenderer content={message.content} />
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[11px] text-[#52525b]">{time}</span>
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
    </div>
  )
}
