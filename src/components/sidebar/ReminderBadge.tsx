import { useLiveQuery } from 'dexie-react-hooks'
import { Bell } from 'lucide-react'
import { db } from '../../db/index'

interface ReminderBadgeProps {
  onClick: () => void
}

export function ReminderBadge({ onClick }: ReminderBadgeProps) {
  const count = useLiveQuery(
    () => db.reminders.filter(r => !r.completed).count(),
    [],
  ) ?? 0

  // Check if any overdue
  const overdueCount = useLiveQuery(
    () => db.reminders
      .filter(r => !r.completed && new Date(r.dueAt).getTime() < Date.now())
      .count(),
    [],
  ) ?? 0

  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-colors ${
        overdueCount > 0
          ? 'bg-red-500/10 border border-red-500/20 text-red-400'
          : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300'
      }`}
      title={`${count} reminder${count > 1 ? 's' : ''}${overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}`}
    >
      <Bell className={`h-3 w-3 ${overdueCount > 0 ? 'animate-pulse' : ''}`} />
      <span>{count}</span>
    </button>
  )
}
