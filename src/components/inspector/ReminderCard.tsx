import { useState, useEffect } from 'react'
import { Check, Trash2, Undo2 } from 'lucide-react'
import type { Reminder } from '../../types'

interface ReminderCardProps {
  reminder: Reminder
  onComplete: () => void
  onUncomplete: () => void
  onDelete: () => void
  onNavigate?: () => void
}

function useCountdown(dueAt: string, completed: boolean) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (completed) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [completed])

  const diff = new Date(dueAt).getTime() - now
  const overdue = diff < 0
  const abs = Math.abs(diff)

  const days = Math.floor(abs / 86400000)
  const hours = Math.floor((abs % 86400000) / 3600000)
  const mins = Math.floor((abs % 3600000) / 60000)
  const secs = Math.floor((abs % 60000) / 1000)

  let display: string
  if (days > 0) display = `${days}d ${hours}h`
  else if (hours > 0) display = `${hours}h ${mins}m`
  else if (mins > 0) display = `${mins}m ${secs}s`
  else display = `${secs}s`

  return { display, overdue, completed }
}

export function ReminderCard({ reminder, onComplete, onUncomplete, onDelete, onNavigate }: ReminderCardProps) {
  const { display, overdue } = useCountdown(reminder.dueAt, reminder.completed)

  const timeColor = reminder.completed
    ? 'text-zinc-600'
    : overdue
      ? 'text-red-400'
      : 'text-emerald-400'

  const bgColor = reminder.completed
    ? 'bg-zinc-800/30 border-zinc-800'
    : overdue
      ? 'bg-red-500/5 border-red-500/20'
      : 'bg-zinc-800/60 border-zinc-700'

  return (
    <div className={`rounded border ${bgColor} px-2.5 py-2 group`}>
      <div className="flex items-start gap-2">
        <button
          onClick={reminder.completed ? onUncomplete : onComplete}
          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
            reminder.completed
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'border-zinc-600 hover:border-zinc-400'
          }`}
        >
          {reminder.completed && <Check className="h-2.5 w-2.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <button
            onClick={onNavigate}
            className={`text-xs text-left w-full truncate ${
              reminder.completed ? 'text-zinc-600 line-through' : 'text-zinc-200'
            }`}
          >
            {reminder.title}
          </button>
          <div className={`text-[10px] font-mono mt-0.5 ${timeColor}`}>
            {reminder.completed ? 'Done' : overdue ? `${display} overdue` : display}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {reminder.completed && (
            <button onClick={onUncomplete} className="text-zinc-600 hover:text-zinc-400" title="Undo">
              <Undo2 className="h-3 w-3" />
            </button>
          )}
          <button onClick={onDelete} className="text-zinc-600 hover:text-red-400" title="Delete">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
