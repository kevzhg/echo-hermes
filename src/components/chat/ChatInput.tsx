import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Paperclip, ArrowUp, X } from 'lucide-react'
import type { Skill } from '../../types'

interface ChatInputProps {
  onSend: (message: string, oneshotSkills?: string[]) => void
  disabled?: boolean
  skills?: Skill[]
  pendingSlashCommand?: string | null
  onSlashCommandConsumed?: () => void
}

export function ChatInput({ onSend, disabled = false, skills = [], pendingSlashCommand, onSlashCommandConsumed }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [oneshotSkills, setOneshotSkills] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = value.trim().length > 0
  const canSend = hasText && !disabled

  // Build skill name set for slash detection
  const skillNames = useMemo(() => new Set(skills.map(s => s.name)), [skills])

  // Consume pending slash command from Inspector
  useEffect(() => {
    if (pendingSlashCommand && !oneshotSkills.includes(pendingSlashCommand)) {
      setOneshotSkills(prev => [...prev, pendingSlashCommand])
      onSlashCommandConsumed?.()
      textareaRef.current?.focus()
    }
  }, [pendingSlashCommand, oneshotSkills, onSlashCommandConsumed])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  // Detect /skill-name at start of input
  useEffect(() => {
    const match = value.match(/^\/(\S+)\s/)
    if (match && skillNames.has(match[1])) {
      const skillName = match[1]
      if (!oneshotSkills.includes(skillName)) {
        setOneshotSkills(prev => [...prev, skillName])
      }
      // Remove the slash command from the text
      setValue(value.replace(/^\/\S+\s/, ''))
    }
  }, [value, skillNames, oneshotSkills])

  const removeOneshot = (name: string) => {
    setOneshotSkills(prev => prev.filter(s => s !== name))
  }

  const handleSend = useCallback(() => {
    if (!canSend) return
    onSend(value.trim(), oneshotSkills.length > 0 ? oneshotSkills : undefined)
    setValue('')
    setOneshotSkills([])
  }, [value, canSend, onSend, oneshotSkills])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-4 pb-3 pt-2">
      {/* One-shot skill chips */}
      {oneshotSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {oneshotSkills.map(name => (
            <span
              key={name}
              className="inline-flex items-center gap-1 bg-violet-500/15 border border-violet-500/25 text-violet-400 rounded px-2 py-0.5 text-xs"
            >
              <span>/{name}</span>
              <button onClick={() => removeOneshot(name)} className="hover:text-violet-200">
                <X className="h-2.5 w-2.5" />
              </button>
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
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Echo is thinking...' : 'Type /skill-name to activate a skill...'}
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
