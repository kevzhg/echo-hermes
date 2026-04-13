import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Context } from '../../types'

interface ContextSettingsModalProps {
  context: Context
  onSave: (changes: { name: string; emoji: string }) => void
  onDelete: () => void
  onClose: () => void
}

export function ContextSettingsModal({ context, onSave, onDelete, onClose }: ContextSettingsModalProps) {
  const [name, setName] = useState(context.name)
  const [emoji, setEmoji] = useState(context.emoji)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  const handleSave = () => {
    onSave({
      name: name.trim() || context.name,
      emoji: emoji.trim() || context.emoji,
    })
    onClose()
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    >
      <div className="bg-[#18181b] border border-zinc-700 rounded-lg w-[360px] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-white">Context Settings</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 px-2.5 py-2 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 px-2.5 py-2 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
          <button onClick={() => { onDelete(); onClose() }} className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Delete Context
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="text-xs text-white bg-[#3b82f6] hover:bg-blue-600 px-3 py-1.5 rounded transition-colors">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
