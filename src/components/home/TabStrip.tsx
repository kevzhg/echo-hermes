import { X, Plus, Circle } from 'lucide-react'
import type { Note } from '../../types'

interface TabStripProps {
  tabs: string[]                      // ordered list of note ids
  activeId: string
  notes: Map<string, Note>            // note metadata keyed by id, for title + dirty state
  activeDirty: boolean                // overlay: is the active tab's in-memory buffer ahead of Dexie/disk?
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
}

function basename(p: string): string {
  const i = p.lastIndexOf('/')
  return i === -1 ? p : p.slice(i + 1)
}

function dirname(p: string): string {
  const i = p.lastIndexOf('/')
  return i === -1 ? '' : p.slice(0, i)
}

function tabTitle(note: Note | undefined): string {
  if (!note) return 'untitled'
  if (note.filePath) return basename(note.filePath)
  return note.content.trim()
    ? (note.content.trim().split('\n', 1)[0].replace(/^#+\s*/, '').slice(0, 24) || 'untitled')
    : 'untitled'
}

function isNoteDirty(note: Note | undefined): boolean {
  if (!note) return false
  if (!note.filePath) return false          // untitled drafts: not tracked as dirty here
  // If disk-synced timestamp lags behind last update, disk is stale.
  if (!note.syncedAt) return true
  return note.syncedAt < note.updatedAt
}

export function TabStrip({
  tabs, activeId, notes, activeDirty, onSelect, onClose, onNew,
}: TabStripProps) {
  return (
    <div className="flex items-center min-w-0 gap-0.5 overflow-x-auto scrollbar-thin">
      {tabs.map(id => {
        const note = notes.get(id)
        const isActive = id === activeId
        const title = tabTitle(note)
        const subtitle = note?.filePath ? dirname(note.filePath) : note?.filePath === undefined ? 'draft' : ''
        const dirty = isActive ? activeDirty : isNoteDirty(note)
        return (
          <div
            key={id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id) } }}
            onAuxClick={e => { if (e.button === 1) { e.preventDefault(); onClose(id) } }}
            title={note?.filePath ?? 'untitled draft'}
            className={`group relative inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 border text-[11px] leading-none min-w-0 max-w-[180px] cursor-pointer transition-colors rounded-t ${
              isActive
                ? 'bg-[#16141a] border-zinc-800 border-b-[#16141a] text-zinc-200 shadow-[inset_0_2px_0_0_rgba(245,158,11,0.6)]'
                : 'bg-[#0a0910] border-zinc-900 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            }`}
          >
            <Circle
              className={`h-1.5 w-1.5 shrink-0 ${
                dirty
                  ? 'text-amber-400 fill-amber-400'
                  : note?.filePath
                    ? 'text-emerald-500/70 fill-emerald-500/70'
                    : 'text-zinc-700 fill-zinc-700'
              }`}
            />
            <span
              className={`truncate font-mono ${
                !note?.filePath ? 'italic' : ''
              }`}
            >
              {title}
            </span>
            {subtitle && (
              <span className="text-[9px] text-zinc-600 font-mono truncate shrink-0 hidden group-hover:inline">
                {subtitle}
              </span>
            )}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onClose(id) }}
              aria-label="Close tab"
              title="Close tab (⌘W)"
              className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                isActive ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={onNew}
        title="New tab (⌘T / ⌘N)"
        aria-label="New tab"
        className="shrink-0 p-1 text-zinc-600 hover:text-amber-300 hover:bg-zinc-800 rounded cursor-pointer transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
