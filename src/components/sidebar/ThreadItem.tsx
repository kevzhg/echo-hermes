import { useState, useCallback } from 'react'
import { Star } from 'lucide-react'
import type { Thread } from '../../types'
import { ThreadContextMenu } from './ThreadContextMenu'
import { ThreadSettingsModal } from './ThreadSettingsModal'

interface ThreadItemProps {
  thread: Thread
  isActive: boolean
  onClick: () => void
  onRename: (threadId: string, name: string) => void
  onSetSessionId: (threadId: string, sessionId?: string) => void
  onDelete: (threadId: string) => void
  onToggleFavorite: (threadId: string) => void
  onDragStart: (threadId: string) => void
  onDragOver: (e: React.DragEvent, threadId: string) => void
  onDrop: (threadId: string) => void
}

export function ThreadItem({
  thread, isActive, onClick, onRename, onSetSessionId, onDelete,
  onToggleFavorite, onDragStart, onDragOver, onDrop,
}: ThreadItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(thread.name)
  const [dragOver, setDragOver] = useState(false)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleRenameConfirm = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== thread.name) {
      onRename(thread.id, trimmed)
    }
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameConfirm()
    if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(thread.name) }
  }

  if (isRenaming) {
    return (
      <input
        autoFocus
        type="text"
        value={renameValue}
        onChange={e => setRenameValue(e.target.value)}
        onKeyDown={handleRenameKeyDown}
        onBlur={handleRenameConfirm}
        className="w-full rounded px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-600 text-zinc-200 outline-none"
      />
    )
  }

  return (
    <>
      <button
        draggable
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onDragStart={() => onDragStart(thread.id)}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); onDragOver(e, thread.id) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={() => { setDragOver(false); onDrop(thread.id) }}
        onDragEnd={() => setDragOver(false)}
        className={`w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1 ${
          isActive
            ? 'bg-zinc-800 text-white border-l-2 border-blue-500 pl-2'
            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
        } ${dragOver ? 'border-t border-blue-500' : ''}`}
      >
        {thread.favorite && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500 shrink-0" />}
        <span className="truncate">{thread.name}</span>
        {thread.hermesSessionId && (
          <span className="ml-auto text-[8px] text-zinc-600 shrink-0">linked</span>
        )}
      </button>

      {contextMenu && (
        <ThreadContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isFavorite={thread.favorite}
          onFavorite={() => onToggleFavorite(thread.id)}
          onSessionId={() => setShowSettings(true)}
          onRename={() => { setIsRenaming(true); setRenameValue(thread.name) }}
          onSettings={() => setShowSettings(true)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showSettings && (
        <ThreadSettingsModal
          thread={thread}
          onSave={(changes) => {
            if (changes.name !== thread.name) onRename(thread.id, changes.name)
            if (changes.hermesSessionId !== thread.hermesSessionId) {
              onSetSessionId(thread.id, changes.hermesSessionId)
            }
          }}
          onDelete={() => onDelete(thread.id)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
