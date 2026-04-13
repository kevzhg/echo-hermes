import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Paperclip, ArrowUp, X, Zap } from 'lucide-react'
import type { Skill } from '../../types'

interface ChatInputProps {
  onSend: (message: string, oneshotSkills?: string[]) => void
  disabled?: boolean
  skills?: Skill[]
}

export function ChatInput({ onSend, disabled = false, skills = [] }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [oneshotSkills, setOneshotSkills] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = value.trim().length > 0
  const canSend = hasText && !disabled

  // Active skills from DB (persistent purple pills)
  const activeSkills = useMemo(() => skills.filter(s => s.active), [skills])

  // Build skill name set for slash detection
  const skillNames = useMemo(() => new Set(skills.map(s => s.name)), [skills])

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
      setValue(value.replace(/^\/\S+\s/, ''))
    }
  }, [value, skillNames, oneshotSkills])

  const removeOneshot = (name: string) => {
    setOneshotSkills(prev => prev.filter(s => s !== name))
  }

  const handleSend = useCallback(() => {
    if (!canSend) return
    // Merge active (persistent) + oneshot skills
    const activeNames = activeSkills.map(s => s.name)
    const allForced = [...new Set([...activeNames, ...oneshotSkills])]
    onSend(value.trim(), allForced.length > 0 ? allForced : undefined)
    setValue('')
    setOneshotSkills([]) // Clear oneshot only, active persists
  }, [value, canSend, onSend, oneshotSkills, activeSkills])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasChips = activeSkills.length > 0 || oneshotSkills.length > 0

  return (
    <div className="px-4 pb-3 pt-2">
      {/* Skill pills */}
      {hasChips && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {/* Active skills — persistent, purple with zap icon */}
          {activeSkills.map(skill => (
            <span
              key={`active-${skill.id}`}
              className="inline-flex items-center gap-1 bg-violet-500/15 border border-violet-500/25 text-violet-400 rounded px-2 py-0.5 text-xs"
            >
              <Zap className="h-2.5 w-2.5" />
              <span>{skill.name}</span>
            </span>
          ))}
          {/* One-shot skills — from /slash, dismissible */}
          {oneshotSkills.map(name => (
            <span
              key={`oneshot-${name}`}
              className="inline-flex items-center gap-1 bg-violet-500/15 border border-violet-500/25 text-violet-300 rounded px-2 py-0.5 text-xs"
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
