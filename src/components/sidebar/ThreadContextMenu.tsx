import { useEffect, useRef } from 'react'
import { Link, Pencil, Settings } from 'lucide-react'

interface ThreadContextMenuProps {
  x: number
  y: number
  onSessionId: () => void
  onRename: () => void
  onSettings: () => void
  onClose: () => void
}

export function ThreadContextMenu({ x, y, onSessionId, onRename, onSettings, onClose }: ThreadContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const items = [
    { icon: Link, label: 'Session ID', action: onSessionId, color: 'text-zinc-400' },
    { icon: Pencil, label: 'Rename', action: onRename, color: 'text-zinc-400' },
    { icon: Settings, label: 'Settings', action: onSettings, color: 'text-zinc-400' },
  ]

  return (
    <div
      ref={ref}
      className="fixed bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl py-1 z-50 min-w-[130px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.action(); onClose() }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors ${item.color}`}
        >
          <item.icon className="h-3 w-3" />
          {item.label}
        </button>
      ))}
    </div>
  )
}
