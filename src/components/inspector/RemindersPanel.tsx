import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db } from '../../db/index'
import { createReminder, completeReminder, uncompleteReminder, deleteReminder } from '../../db/operations'
import { ReminderCard } from './ReminderCard'

interface RemindersPanelProps {
  activeThreadId?: string | null
  onSelectThread?: (threadId: string) => void
}

export function RemindersPanel({ activeThreadId, onSelectThread }: RemindersPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [linkToThread, setLinkToThread] = useState(false)

  const reminders = useLiveQuery(
    () => db.reminders.orderBy('dueAt').toArray(),
    [],
  ) ?? []

  const active = reminders.filter(r => !r.completed)
  const completed = reminders.filter(r => r.completed)

  const handleCreate = async () => {
    if (!title.trim() || !dueDate) return
    const dueAt = new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString()
    await createReminder(
      title.trim(),
      dueAt,
      linkToThread && activeThreadId ? activeThreadId : undefined,
    )
    setTitle('')
    setDueDate('')
    setDueTime('')
    setLinkToThread(false)
    setShowForm(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Add button / form */}
      {showForm ? (
        <div className="bg-zinc-800/50 rounded border border-zinc-700 p-2 flex flex-col gap-1.5">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reminder title..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500 px-2 py-1.5 outline-none focus:border-zinc-600"
          />
          <div className="flex gap-1.5">
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 px-2 py-1 outline-none focus:border-zinc-600"
            />
            <input
              type="time"
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
              className="w-24 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 px-2 py-1 outline-none focus:border-zinc-600"
            />
          </div>
          {activeThreadId && (
            <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <input
                type="checkbox"
                checked={linkToThread}
                onChange={e => setLinkToThread(e.target.checked)}
                className="rounded"
              />
              Link to current thread
            </label>
          )}
          <div className="flex gap-1.5 mt-0.5">
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !dueDate}
              className="flex-1 text-xs text-white bg-[#3b82f6] hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-zinc-500 rounded py-1 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs text-zinc-400 hover:text-zinc-300 px-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 rounded px-2 py-1.5 transition-colors"
        >
          <Plus className="h-3 w-3" />
          New Reminder
        </button>
      )}

      {/* Active reminders */}
      {active.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider px-1">
            Upcoming ({active.length})
          </div>
          {active.map(r => (
            <ReminderCard
              key={r.id}
              reminder={r}
              onComplete={() => completeReminder(r.id)}
              onUncomplete={() => uncompleteReminder(r.id)}
              onDelete={() => deleteReminder(r.id)}
              onNavigate={r.threadId && onSelectThread ? () => onSelectThread(r.threadId!) : undefined}
            />
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider px-1">
            Completed ({completed.length})
          </div>
          {completed.map(r => (
            <ReminderCard
              key={r.id}
              reminder={r}
              onComplete={() => completeReminder(r.id)}
              onUncomplete={() => uncompleteReminder(r.id)}
              onDelete={() => deleteReminder(r.id)}
            />
          ))}
        </div>
      )}

      {active.length === 0 && completed.length === 0 && !showForm && (
        <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 py-8">
          No reminders yet
        </div>
      )}
    </div>
  )
}
