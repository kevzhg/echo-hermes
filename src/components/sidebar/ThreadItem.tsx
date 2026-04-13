import { useState, useCallback } from 'react'
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
}

export function ThreadItem({ thread, isActive, onClick, onRename, onSetSessionId, onDelete }: ThreadItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(thread.name)

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
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors ${
          isActive
            ? 'bg-zinc-800 text-white border-l-2 border-blue-500 pl-2'
            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
        }`}
      >
        {thread.name}
        {thread.hermesSessionId && (
          <span className="ml-1 text-[8px] text-zinc-600">linked</span>
        )}
      </button>

      {contextMenu && (
        <ThreadContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
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
