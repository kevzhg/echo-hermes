import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bell, Check } from 'lucide-react'
import { db } from '../../db/index'
import { completeReminder } from '../../db/operations'

interface ReminderBannerProps {
  threadId: string
}

function useCountdown(dueAt: string) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

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

  return { display, overdue }
}

function BannerItem({ id, title, dueAt }: { id: string; title: string; dueAt: string }) {
  const { display, overdue } = useCountdown(dueAt)

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Bell className={`h-3 w-3 shrink-0 ${overdue ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
      <span className="text-xs text-zinc-300 truncate">{title}</span>
      <span className={`text-[10px] font-mono shrink-0 ${overdue ? 'text-red-400' : 'text-amber-400'}`}>
        {overdue ? `${display} overdue` : display}
      </span>
      <button
        onClick={() => completeReminder(id)}
        className="ml-auto shrink-0 text-zinc-600 hover:text-emerald-400 transition-colors"
        title="Mark complete"
      >
        <Check className="h-3 w-3" />
      </button>
    </div>
  )
}

export function ReminderBanner({ threadId }: ReminderBannerProps) {
  const reminders = useLiveQuery(
    () => db.reminders
      .filter(r => !r.completed && r.threadId === threadId)
      .toArray(),
    [threadId],
  ) ?? []

  if (reminders.length === 0) return null

  return (
    <div className="px-4 py-1.5 border-b border-amber-500/15 bg-amber-500/5 flex flex-col gap-1">
      {reminders.map(r => (
        <BannerItem key={r.id} id={r.id} title={r.title} dueAt={r.dueAt} />
      ))}
    </div>
  )
}
