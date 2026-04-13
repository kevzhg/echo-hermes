import { useEffect, useRef } from 'react'
import { Pencil, Settings } from 'lucide-react'

interface ContextContextMenuProps {
  x: number
  y: number
  onRename: () => void
  onSettings: () => void
  onClose: () => void
}

export function ContextContextMenu({ x, y, onRename, onSettings, onClose }: ContextContextMenuProps) {
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
    { icon: Pencil, label: 'Rename', action: onRename, color: 'text-zinc-400' },
    { icon: Settings, label: 'Settings', action: onSettings, color: 'text-zinc-400' },
  ]

  return (
    <div
      ref={ref}
      className="fixed bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl py-1 z-50 min-w-[120px]"
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
