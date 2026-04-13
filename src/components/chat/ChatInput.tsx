import { useRef, useEffect, useCallback, useMemo } from 'react'
import { Paperclip, ArrowUp, Zap } from 'lucide-react'
import type { Skill } from '../../types'

interface ChatInputProps {
  onSend: (message: string, forcedSkills?: string[]) => void
  disabled?: boolean
  skills?: Skill[]
  pendingText?: string | null
  onPendingTextConsumed?: () => void
  value: string
  onChange: (value: string) => void
}

export function ChatInput({ onSend, disabled = false, skills = [], pendingText, onPendingTextConsumed, value, onChange }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = value.trim().length > 0
  const canSend = hasText && !disabled

  // Active skills from DB (persistent purple pills)
  const activeSkills = useMemo(() => skills.filter(s => s.active), [skills])

  // Consume pending text injection from Inspector (pinned skill click)
  useEffect(() => {
    if (pendingText) {
      onChange(pendingText + ' ' + value)
      onPendingTextConsumed?.()
      // Focus and move cursor to end
      setTimeout(() => {
        const el = textareaRef.current
        if (el) {
          el.focus()
          el.selectionStart = el.selectionEnd = el.value.length
        }
      }, 0)
    }
  }, [pendingText, onPendingTextConsumed, onChange, value])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  const handleSend = useCallback(() => {
    if (!canSend) return
    const activeNames = activeSkills.map(s => s.name)
    onSend(value.trim(), activeNames.length > 0 ? activeNames : undefined)
    onChange('')
  }, [value, canSend, onSend, activeSkills, onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-4 pb-3 pt-2">
      {/* Active skill pills — persistent, from DB */}
      {activeSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {activeSkills.map(skill => (
            <span
              key={skill.id}
              className="inline-flex items-center gap-1 bg-violet-500/15 border border-violet-500/25 text-violet-400 rounded px-2 py-0.5 text-xs"
            >
              <Zap className="h-2.5 w-2.5" />
              <span>{skill.name}</span>
            </span>
          ))}
        </div>
      )}

      <div className="bg-[#18181b] border border-zinc-800 rounded-lg flex items-end gap-2 px-3 py-2">
        <button className="text-zinc-500 hover:text-zinc-400 transition-colors pb-0.5">
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Echo is thinking...' : 'Type a message...'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none leading-relaxed disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0 ${
            canSend
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
