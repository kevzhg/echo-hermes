import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Thread } from '../../types'

interface ThreadSettingsModalProps {
  thread: Thread
  onSave: (changes: { name: string; hermesSessionId?: string }) => void
  onDelete: () => void
  onClose: () => void
}

export function ThreadSettingsModal({ thread, onSave, onDelete, onClose }: ThreadSettingsModalProps) {
  const [name, setName] = useState(thread.name)
  const [sessionId, setSessionId] = useState(thread.hermesSessionId ?? '')
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
      name: name.trim() || thread.name,
      hermesSessionId: sessionId.trim() || undefined,
    })
    onClose()
  }

  const handleDelete = () => {
    onDelete()
    onClose()
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    >
      <div className="bg-[#18181b] border border-zinc-700 rounded-lg w-[360px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-white">Thread Settings</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-4 py-3 flex flex-col gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
              Thread Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500 px-2.5 py-2 outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
              Hermes Session ID
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              placeholder="e.g. 20260412_201130_3e7bce"
              className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-600 px-2.5 py-2 outline-none focus:border-zinc-600 transition-colors font-mono"
            />
            <p className="text-[10px] text-zinc-600 mt-1">
              Link to existing Hermes session. Leave empty for auto-create on first message.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
          <button
            onClick={handleDelete}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Delete Thread
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs text-white bg-[#3b82f6] hover:bg-blue-600 px-3 py-1.5 rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
