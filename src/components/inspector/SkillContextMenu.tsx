import { useEffect, useRef } from 'react'
import { Star, Pencil, Copy, Pin, PinOff, Trash2 } from 'lucide-react'

interface SkillContextMenuProps {
  x: number
  y: number
  isFavorite: boolean
  isPinned: boolean
  onFavorite: () => void
  onEdit: () => void
  onClone: () => void
  onUnpin: () => void
  onDelete: () => void
  onClose: () => void
}

const menuItems = (props: SkillContextMenuProps) => [
  {
    icon: Star,
    label: props.isFavorite ? 'Unfavorite' : 'Favorite',
    action: props.onFavorite,
    color: props.isFavorite ? 'text-amber-400' : 'text-zinc-400',
  },
  { icon: Pencil, label: 'Edit', action: props.onEdit, color: 'text-zinc-400' },
  { icon: Copy, label: 'Clone', action: props.onClone, color: 'text-zinc-400' },
  props.isPinned
    ? { icon: PinOff, label: 'Unpin', action: props.onUnpin, color: 'text-zinc-400' }
    : { icon: Pin, label: 'Pin', action: props.onUnpin, color: 'text-emerald-400' },
  { icon: Trash2, label: 'Delete', action: props.onDelete, color: 'text-red-400' },
]

export function SkillContextMenu(props: SkillContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        props.onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [props])

  const items = menuItems(props)

  return (
    <div
      ref={ref}
      className="fixed bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl py-1 z-50 min-w-[140px]"
      style={{ left: props.x, top: props.y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.action()
            props.onClose()
          }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors ${item.color}`}
        >
          <item.icon className="h-3 w-3" />
          {item.label}
        </button>
      ))}
    </div>
  )
}
