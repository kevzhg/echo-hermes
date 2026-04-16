import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Save, FolderOpen } from 'lucide-react'
import { MarkdownRenderer } from '../chat/MarkdownRenderer'
import { SaveAsModal } from './SaveAsModal'
import { FileBrowser } from './FileBrowser'
import { TabStrip } from './TabStrip'
import { db } from '../../db/index'
import { getNote, upsertNote } from '../../db/operations'
import { saveWikiFile, readWikiFile } from '../../lib/wikiApi'
import type { Note } from '../../types'

const LEGACY_STORAGE_KEY = 'echo-scratch-content'
const LEGACY_NOTE_ID = 'scratch'
const MODE_KEY = 'echo-scratch-mode'
const TABS_KEY = 'echo-scratch-tabs'
const ACTIVE_TAB_KEY = 'echo-scratch-active-tab'
const SAVE_DEBOUNCE = 400

type Mode = 'edit' | 'split' | 'preview'
type SyncStatus = 'idle' | 'dirty' | 'flushing' | 'synced' | 'failed'

const MONO_STACK =
  "'Fira Code', 'JetBrains Mono', 'SF Mono', Menlo, Monaco, 'Cascadia Code', Consolas, monospace"

const PLACEHOLDER = `# untitled

drop any thought here. each tab is its own buffer, all saved to IndexedDB.

**bold**, *italic*, \`inline code\`, ## heading, - lists, > quote

    ⌘T / ⌘N    new tab          ⌘W    close tab
    ⌘O          open file         ⌘⇧S  save as…
    ⌘B / ⌘I / ⌘K    wrap selection        ⌘/    cycle edit ▸ split ▸ preview
`

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* */ }
}

export function ScratchPad() {
  // --- Tab list state ---
  const [tabs, setTabs] = useState<string[]>(() => readJSON<string[]>(TABS_KEY, []))
  const [activeId, setActiveId] = useState<string>(() =>
    (() => { try { return localStorage.getItem(ACTIVE_TAB_KEY) ?? '' } catch { return '' } })()
  )
  const [bootstrapped, setBootstrapped] = useState(false)

  // --- Active-buffer state (reloaded when activeId changes) ---
  const [content, setContent] = useState<string>('')
  const [filePath, setFilePath] = useState<string | undefined>(undefined)
  const [savedContent, setSavedContent] = useState<string>('')
  const [syncedContent, setSyncedContent] = useState<string>('')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [bufferLoaded, setBufferLoaded] = useState(false)

  // --- UI state ---
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY)
      if (saved === 'edit' || saved === 'split' || saved === 'preview') return saved
    } catch { /* */ }
    return 'split'
  })
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  // --- Reactive tab metadata for the strip ---
  const tabNotesArr = useLiveQuery<Note[]>(
    async () => (tabs.length > 0 ? await db.notes.where('id').anyOf(tabs).toArray() : []),
    [tabs],
  )
  const tabNoteMap = useMemo(() => {
    const m = new Map<string, Note>()
    for (const n of tabNotesArr ?? []) m.set(n.id, n)
    return m
  }, [tabNotesArr])

  // --- Mount: bootstrap tabs from localStorage, migrating legacy 'scratch' row + localStorage key. ---
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let nextTabs = tabs.slice()
      let nextActive = activeId

      // Legacy migrations.
      const legacyLs = (() => {
        try { return localStorage.getItem(LEGACY_STORAGE_KEY) } catch { return null }
      })()
      const legacyRow = await getNote(LEGACY_NOTE_ID)

      if (legacyLs && !legacyRow) {
        await upsertNote(LEGACY_NOTE_ID, { content: legacyLs })
      }
      if (legacyLs) {
        try { localStorage.removeItem(LEGACY_STORAGE_KEY) } catch { /* */ }
      }
      // If we have a legacy 'scratch' row and no tabs yet, make it the first tab.
      const hasLegacy = !!(legacyRow || legacyLs)
      if (nextTabs.length === 0 && hasLegacy) {
        nextTabs = [LEGACY_NOTE_ID]
        nextActive = LEGACY_NOTE_ID
      }

      // If we still have zero tabs, create a fresh empty one.
      if (nextTabs.length === 0) {
        const id = crypto.randomUUID()
        await upsertNote(id, { content: '' })
        nextTabs = [id]
        nextActive = id
      }

      // Make sure active id points at something valid.
      if (!nextTabs.includes(nextActive)) {
        nextActive = nextTabs[0]
      }

      if (cancelled) return
      setTabs(nextTabs)
      setActiveId(nextActive)
      writeJSON(TABS_KEY, nextTabs)
      try { localStorage.setItem(ACTIVE_TAB_KEY, nextActive) } catch { /* */ }
      setBootstrapped(true)
    })()
    return () => { cancelled = true }
    // Only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- When activeId changes (after bootstrap), reload buffer state from Dexie. ---
  useEffect(() => {
    if (!bootstrapped || !activeId) return
    let cancelled = false
    ;(async () => {
      setBufferLoaded(false)
      const note = await getNote(activeId)
      if (cancelled) return
      const initialContent = note?.content ?? ''
      setContent(initialContent)
      setSavedContent(initialContent)
      setSyncedContent(note?.syncedAt ? initialContent : '')
      setFilePath(note?.filePath)
      setSyncStatus(note?.syncedAt && note.filePath ? 'synced' : 'idle')
      setSyncError(null)
      setLoadError(null)
      setBufferLoaded(true)
      // Focus the textarea on tab change for immediate typing.
      requestAnimationFrame(() => textareaRef.current?.focus())
    })()
    return () => { cancelled = true }
  }, [activeId, bootstrapped])

  // Persist mode preference.
  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, mode) } catch { /* */ }
  }, [mode])

  // --- Debounced flush: Dexie first, then disk if filePath is set. ---
  const flush = useCallback(async (id: string, nextContent: string, nextFilePath: string | undefined) => {
    await upsertNote(id, { content: nextContent, filePath: nextFilePath })
    // Only mutate reactive state if we're still on the same tab.
    if (activeIdRef.current === id) setSavedContent(nextContent)
    if (!nextFilePath) {
      if (activeIdRef.current === id) { setSyncStatus('idle'); setSyncError(null) }
      return
    }
    if (activeIdRef.current === id) setSyncStatus('flushing')
    try {
      await saveWikiFile(nextFilePath, nextContent)
      const syncedAt = new Date().toISOString()
      await upsertNote(id, { syncedAt })
      if (activeIdRef.current === id) {
        setSyncedContent(nextContent)
        setSyncStatus('synced')
        setSyncError(null)
      }
    } catch (e) {
      if (activeIdRef.current === id) {
        setSyncStatus('failed')
        setSyncError(e instanceof Error ? e.message : String(e))
      }
    }
  }, [])

  // Schedule flush whenever content/filePath diverges from saved.
  useEffect(() => {
    if (!bufferLoaded) return
    if (content === savedContent && filePath && syncedContent === content) return
    if (content === savedContent && !filePath) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const capturedId = activeId
    saveTimerRef.current = setTimeout(() => { flush(capturedId, content, filePath) }, SAVE_DEBOUNCE)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [content, filePath, savedContent, syncedContent, bufferLoaded, flush, activeId])

  // --- Status derivations ---
  const activeDirty = (() => {
    if (content !== savedContent) return true
    if (filePath && content !== syncedContent) return true
    return false
  })()

  const effectiveStatus: SyncStatus = (() => {
    if (content !== savedContent) return 'dirty'
    const diskDirty = !!filePath && content !== syncedContent
    if (diskDirty && syncStatus === 'flushing') return 'flushing'
    if (diskDirty && syncStatus === 'failed') return 'failed'
    if (filePath && syncedContent === content) return 'synced'
    return 'idle'
  })()

  // --- Tab operations ---
  const persistTabs = useCallback((next: string[], active?: string) => {
    writeJSON(TABS_KEY, next)
    if (active !== undefined) {
      try { localStorage.setItem(ACTIVE_TAB_KEY, active) } catch { /* */ }
    }
  }, [])

  const switchTab = useCallback(async (id: string) => {
    if (id === activeIdRef.current) return
    // Flush any pending edits on the current tab first so nothing is lost.
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
    const prevId = activeIdRef.current
    if (prevId) {
      await flush(prevId, content, filePath)
    }
    setActiveId(id)
    persistTabs(tabs, id)
  }, [content, filePath, flush, tabs, persistTabs])

  const newTab = useCallback(async () => {
    // Reuse an existing empty, untitled tab if one is already open — avoids stacking blank tabs.
    const existingEmpty = tabs.find(tid => {
      const n = tabNoteMap.get(tid)
      return n && !n.filePath && (!n.content || n.content.trim() === '')
    })
    if (existingEmpty) {
      await switchTab(existingEmpty)
      setShowBrowser(false)
      return
    }
    const id = crypto.randomUUID()
    await upsertNote(id, { content: '' })
    const next = [...tabs, id]
    setTabs(next)
    setActiveId(id)
    persistTabs(next, id)
    setShowBrowser(false)
  }, [tabs, tabNoteMap, switchTab, persistTabs])

  const closeTab = useCallback(async (id: string) => {
    const note = tabNoteMap.get(id)
    // Warn before discarding untitled drafts with content.
    if (note && !note.filePath && (note.content?.trim().length ?? 0) > 0) {
      const ok = window.confirm('This untitled draft has content.\n\nIt will be discarded. Close anyway?')
      if (!ok) return
    }
    // Cancel pending flush if it was for this id.
    if (activeIdRef.current === id && saveTimerRef.current) {
      clearTimeout(saveTimerRef.current); saveTimerRef.current = null
    }
    await db.notes.delete(id)
    const next = tabs.filter(t => t !== id)
    if (next.length === 0) {
      // Auto-create a fresh empty tab so the view is never empty.
      const fresh = crypto.randomUUID()
      await upsertNote(fresh, { content: '' })
      next.push(fresh)
      setTabs(next)
      setActiveId(fresh)
      persistTabs(next, fresh)
      return
    }
    setTabs(next)
    // If we closed the active tab, pick a neighbor (same index, clamped).
    if (id === activeIdRef.current) {
      const idx = tabs.indexOf(id)
      const nextActive = next[Math.min(idx, next.length - 1)]
      setActiveId(nextActive)
      persistTabs(next, nextActive)
    } else {
      persistTabs(next)
    }
  }, [tabs, tabNoteMap, persistTabs])

  const openFile = useCallback(async (path: string) => {
    setLoadError(null)
    try {
      // If a tab already has this file open, just switch to it.
      const existing = tabs.find(tid => tabNoteMap.get(tid)?.filePath === path)
      if (existing) {
        await switchTab(existing)
        setShowBrowser(false)
        return
      }
      const res = await readWikiFile(path)
      if (!res.exists || typeof res.content !== 'string') {
        setLoadError(`file not found: ${path}`)
        return
      }
      // Prefer reusing an empty, untitled tab so we don't stack blanks.
      const emptyUntitled = tabs.find(tid => {
        const n = tabNoteMap.get(tid)
        return n && !n.filePath && (!n.content || n.content.trim() === '')
      })
      let targetId = emptyUntitled
      if (!targetId) {
        targetId = crypto.randomUUID()
        const next = [...tabs, targetId]
        setTabs(next)
        persistTabs(next)
      }
      await upsertNote(targetId, {
        content: res.content,
        filePath: path,
        syncedAt: new Date().toISOString(),
      })
      // Flush pending changes on the current tab before switching away.
      if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
      if (activeIdRef.current && activeIdRef.current !== targetId) {
        await flush(activeIdRef.current, content, filePath)
      }
      setActiveId(targetId)
      persistTabs(tabs.includes(targetId) ? tabs : [...tabs, targetId], targetId)
      setShowBrowser(false)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    }
  }, [tabs, tabNoteMap, switchTab, content, filePath, flush, persistTabs])

  // --- Editor helpers ---
  const wrap = useCallback((left: string, right: string = left) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = content.slice(0, start) + left + content.slice(start, end) + right + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + left.length, end + left.length)
    })
  }, [content])

  const cycleMode = useCallback(() => {
    setMode(m => (m === 'edit' ? 'split' : m === 'split' ? 'preview' : 'edit'))
  }, [])

  const forceSave = useCallback(() => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
    flush(activeId, content, filePath)
  }, [activeId, content, filePath, flush])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return
    const k = e.key.toLowerCase()
    if (k === 'b') { e.preventDefault(); wrap('**') }
    else if (k === 'i') { e.preventDefault(); wrap('*') }
    else if (k === 'k') { e.preventDefault(); wrap('`') }
    else if (k === '/') { e.preventDefault(); cycleMode() }
    else if (k === 'o') { e.preventDefault(); setShowBrowser(v => !v) }
    else if (k === 'n' || k === 't') { e.preventDefault(); newTab() }
    else if (k === 'w') { e.preventDefault(); closeTab(activeIdRef.current) }
    else if (k === 's' && e.shiftKey) { e.preventDefault(); setShowSaveAs(true) }
    else if (k === 's') {
      e.preventDefault()
      if (!filePath) setShowSaveAs(true)
      else forceSave()
    }
  }

  // --- Stats ---
  const trimmed = content.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const chars = content.length
  const lines = content ? content.split('\n').length : 1

  // --- Status chip ---
  const chip = (() => {
    switch (effectiveStatus) {
      case 'dirty':
        return { label: filePath ? 'editing…' : 'saving…', dot: 'bg-amber-400 animate-pulse' }
      case 'flushing':
        return { label: 'syncing…', dot: 'bg-amber-400 animate-pulse' }
      case 'synced':
        return { label: 'synced', dot: 'bg-emerald-500/80' }
      case 'failed':
        return { label: 'sync failed', dot: 'bg-red-400' }
      case 'idle':
      default:
        return { label: 'saved', dot: 'bg-emerald-500/80' }
    }
  })()

  return (
    <div
      className="h-full flex flex-col bg-[#16141a] text-zinc-300 relative"
      style={{ fontFamily: MONO_STACK }}
    >
      {/* Editor chrome */}
      <div className="shrink-0 flex items-center justify-between gap-2 pl-3 pr-2 pt-2 pb-0 border-b border-zinc-800 bg-[#0f0e12]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 shrink-0 pb-1.5">
            <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]/80" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]/80" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]/80" />
          </div>
          <div className="min-w-0 flex-1">
            <TabStrip
              tabs={tabs}
              activeId={activeId}
              notes={tabNoteMap}
              activeDirty={activeDirty}
              onSelect={switchTab}
              onClose={closeTab}
              onNew={newTab}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 pb-1.5">
          <button
            type="button"
            onClick={() => setShowBrowser(v => !v)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-[0.12em] font-semibold transition-colors cursor-pointer ${
              showBrowser
                ? 'bg-amber-500/15 text-amber-300'
                : 'text-zinc-500 hover:text-amber-300 hover:bg-zinc-800'
            }`}
            title="Open file from wiki (⌘O)"
          >
            <FolderOpen className="h-3 w-3" />
            open
          </button>
          <button
            type="button"
            onClick={() => setShowSaveAs(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-[0.12em] font-semibold text-zinc-500 hover:text-amber-300 hover:bg-zinc-800 transition-colors cursor-pointer"
            title={filePath ? 'Rename / move the current save target (⌘⇧S)' : 'Save As… (⌘⇧S)'}
          >
            <Save className="h-3 w-3" />
            save as…
          </button>
          <div className="flex items-center gap-0.5 p-0.5 bg-zinc-900 border border-zinc-800 rounded ml-1">
            {(['edit', 'split', 'preview'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-2 py-1 rounded-sm text-[10px] uppercase tracking-[0.12em] font-semibold transition-colors cursor-pointer ${
                  mode === m
                    ? 'bg-amber-500/15 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.25)_inset]'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor surface */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {(mode === 'edit' || mode === 'split') && (
          <div
            className={`flex flex-col min-h-0 ${
              mode === 'split' ? 'w-1/2 border-r border-zinc-800' : 'flex-1'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKey}
              spellCheck={false}
              placeholder={PLACEHOLDER}
              disabled={!bufferLoaded}
              className="flex-1 min-h-0 resize-none bg-transparent outline-none text-[13px] leading-[1.65] text-zinc-200 placeholder-zinc-700 caret-amber-400 px-6 pt-5 pb-16 selection:bg-amber-500/20 disabled:opacity-50"
              style={{
                fontFamily: 'inherit',
                fontFeatureSettings: "'calt' on, 'liga' on, 'ss01' on",
                tabSize: 2,
              }}
            />
          </div>
        )}

        {(mode === 'preview' || mode === 'split') && (
          <div
            className={`min-h-0 overflow-y-auto ${
              mode === 'split' ? 'w-1/2' : 'flex-1'
            }`}
          >
            <div className="max-w-2xl mx-auto px-8 py-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              {trimmed ? (
                <div className="text-[14px] leading-relaxed text-zinc-200">
                  <MarkdownRenderer content={content} />
                </div>
              ) : (
                <div className="text-zinc-700 italic text-[13px]" style={{ fontFamily: MONO_STACK }}>
                  preview will appear here ·
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vim-style statusline */}
      <div
        className="shrink-0 flex items-center gap-3 pr-3 text-[10px] uppercase tracking-[0.14em] font-medium border-t border-zinc-800 bg-[#0f0e12]"
        style={{ fontFamily: MONO_STACK }}
      >
        <span className="bg-amber-500/90 text-black px-2 py-1.5 font-bold">NORMAL</span>
        <span className="text-zinc-400">{lines} ln</span>
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-400">{words.toLocaleString()} words</span>
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-400">{chars.toLocaleString()} chars</span>
        {filePath && (
          <>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-500 normal-case tracking-normal font-mono">
              ~/wiki/{filePath}
            </span>
          </>
        )}
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-500">
          {tabs.length} tab{tabs.length === 1 ? '' : 's'}
        </span>
        <span className="flex-1" />
        <span
          className="text-zinc-500 flex items-center gap-1.5"
          title={syncError ?? chip.label}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />
          {chip.label}
        </span>
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-500">markdown</span>
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-500">utf-8</span>
      </div>

      {showBrowser && (
        <FileBrowser
          currentPath={filePath}
          onClose={() => setShowBrowser(false)}
          onSelect={openFile}
          onNew={newTab}
        />
      )}

      {loadError && (
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 px-3 py-2 rounded border border-red-500/40 bg-red-500/10 text-red-200 text-xs font-mono shadow-lg backdrop-blur-sm cursor-pointer"
          onClick={() => setLoadError(null)}
          title="click to dismiss"
        >
          {loadError}
        </div>
      )}

      {showSaveAs && (
        <SaveAsModal
          initialPath={filePath}
          onCancel={() => setShowSaveAs(false)}
          onConfirm={(newPath) => {
            setFilePath(newPath)
            setShowSaveAs(false)
            if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
            flush(activeId, content, newPath)
          }}
        />
      )}
    </div>
  )
}
