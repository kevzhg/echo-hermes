import { useState, useRef, useEffect, useCallback } from 'react'
import { Paperclip, ArrowUp } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = value.trim().length > 0

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  const handleSend = useCallback(() => {
    if (!value.trim()) return
    onSend(value.trim())
    setValue('')
  }, [value, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-4 pb-3 pt-2">
      <div className="bg-[#18181b] border border-zinc-800 rounded-lg flex items-end gap-2 px-3 py-2">
        <button className="text-zinc-500 hover:text-zinc-400 transition-colors pb-0.5">
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none leading-relaxed"
        />
        <button
          onClick={handleSend}
          disabled={!hasText}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0 ${
            hasText
              ? 'bg-[#3b82f6] text-white hover:bg-blue-600'
              : 'bg-[#3f3f46] text-[#71717a]'
          }`}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
      <div className="flex justify-end mt-1">
        <span className="text-[10px] text-[#3f3f46]">Shift+Enter for newline</span>
      </div>
    </div>
  )
}
