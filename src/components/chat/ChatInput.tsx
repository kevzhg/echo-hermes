import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Paperclip, ArrowUp, Zap, X, Image as ImageIcon } from 'lucide-react'
import type { Skill } from '../../types'

interface ChatInputProps {
  onSend: (message: string, forcedSkills?: string[], imagePath?: string) => void
  disabled?: boolean
  skills?: Skill[]
  pendingText?: string | null
  onPendingTextConsumed?: () => void
  value: string
  onChange: (value: string) => void
}

export function ChatInput({ onSend, disabled = false, skills = [], pendingText, onPendingTextConsumed, value, onChange }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedImage, setAttachedImage] = useState<{ file: File; preview: string; serverPath?: string } | null>(null)
  const hasText = value.trim().length > 0
  const canSend = (hasText || attachedImage) && !disabled

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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)

    // Upload to bridge immediately
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('http://localhost:8000/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const { path } = await res.json()
        setAttachedImage({ file, preview, serverPath: path })
      }
    } catch {
      // Still show preview even if upload fails
      setAttachedImage({ file, preview })
    }
    // Reset input so same file can be re-selected
    e.target.value = ''
  }, [])

  const removeImage = useCallback(() => {
    if (attachedImage?.preview) URL.revokeObjectURL(attachedImage.preview)
    setAttachedImage(null)
  }, [attachedImage])

  const handleSend = useCallback(() => {
    if (!canSend) return
    const activeNames = activeSkills.map(s => s.name)
    onSend(
      value.trim() || (attachedImage ? 'describe this image' : ''),
      activeNames.length > 0 ? activeNames : undefined,
      attachedImage?.serverPath,
    )
    onChange('')
    removeImage()
  }, [value, canSend, onSend, activeSkills, onChange, attachedImage, removeImage])

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

      {/* Image preview */}
      {attachedImage && (
        <div className="mb-2 relative inline-block">
          <img
            src={attachedImage.preview}
            alt="Attached"
            className="max-h-32 rounded-lg border border-zinc-700"
          />
          <button
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 border border-zinc-600 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
          {!attachedImage.serverPath && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-[10px] text-zinc-400">
              Uploading...
            </div>
          )}
        </div>
      )}

      <div className="bg-[#18181b] border border-zinc-800 rounded-lg flex items-end gap-2 px-3 py-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`transition-colors pb-0.5 ${attachedImage ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-400'}`}
          title="Attach image"
        >
          {attachedImage ? <ImageIcon className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
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
