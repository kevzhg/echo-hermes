import { useEffect, useRef, useState } from 'react'
import { X, Check, AlertTriangle, FolderCog } from 'lucide-react'
import {
  getWikiConfig,
  setWikiRoot,
  readWikiFile,
  validateWikiPath,
  type WikiConfig,
} from '../../lib/wikiApi'

interface SaveAsModalProps {
  initialPath: string | undefined
  onCancel: () => void
  onConfirm: (path: string) => void
}

export function SaveAsModal({ initialPath, onCancel, onConfirm }: SaveAsModalProps) {
  const [config, setConfig] = useState<WikiConfig | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [path, setPath] = useState<string>(initialPath ?? 'scratch.md')
  const [editingRoot, setEditingRoot] = useState(false)
  const [rootDraft, setRootDraft] = useState('')
  const [rootBusy, setRootBusy] = useState(false)
  const [existingCheck, setExistingCheck] = useState<{ exists: boolean; path: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const firstInputRef = useRef<HTMLInputElement | null>(null)

  // Load wiki config on mount.
  useEffect(() => {
    getWikiConfig()
      .then(c => { setConfig(c); setRootDraft(c.root) })
      .catch(e => setConfigError(e instanceof Error ? e.message : String(e)))
  }, [])

  // Focus filename input once config is loaded.
  useEffect(() => {
    if (config && !editingRoot) {
      firstInputRef.current?.focus()
      firstInputRef.current?.select()
    }
  }, [config, editingRoot])

  // Debounced existing-file check.
  useEffect(() => {
    const validation = validateWikiPath(path)
    if (validation) { setExistingCheck(null); return }
    const t = setTimeout(async () => {
      try {
        const res = await readWikiFile(path.trim())
        setExistingCheck({ exists: res.exists, path: path.trim() })
      } catch {
        setExistingCheck(null)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [path])

  // Global Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const pathError = validateWikiPath(path)
  const canSave = !pathError && !busy && !!config?.writable
  const overwritingSelf = existingCheck?.exists && existingCheck.path === initialPath

  const handleSaveRoot = async () => {
    const trimmed = rootDraft.trim()
    if (!trimmed) return
    setRootBusy(true)
    try {
      const next = await setWikiRoot(trimmed)
      setConfig(next)
      setEditingRoot(false)
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : String(e))
    } finally {
      setRootBusy(false)
    }
  }

  const handleConfirm = () => {
    if (!canSave) return
    setBusy(true)
    try {
      onConfirm(path.trim())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[440px] max-w-[92vw] rounded-lg border border-zinc-800 bg-[#16141a] shadow-2xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Save scratch as markdown file"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FolderCog className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-zinc-200">Save scratch as…</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          {/* Wiki root row */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Save into</div>
            {configError ? (
              <div className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> {configError}
              </div>
            ) : editingRoot ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={rootDraft}
                  onChange={e => setRootDraft(e.target.value)}
                  placeholder="absolute path, e.g. /Users/you/wiki"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveRoot}
                  disabled={rootBusy || !rootDraft.trim()}
                  className="px-2 py-1 text-xs rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40 cursor-pointer"
                >
                  set
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingRoot(false); setRootDraft(config?.root ?? '') }}
                  className="px-2 py-1 text-xs rounded text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono truncate">
                  {config?.root ?? 'loading…'}
                </code>
                <button
                  type="button"
                  onClick={() => setEditingRoot(true)}
                  className="text-[11px] text-zinc-500 hover:text-amber-300 underline-offset-2 hover:underline cursor-pointer"
                >
                  change
                </button>
              </div>
            )}
            {config && !config.writable && !editingRoot && (
              <div className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> not writable
              </div>
            )}
          </div>

          {/* Filename row */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Filename</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 font-mono">/</span>
              <input
                ref={firstInputRef}
                type="text"
                value={path}
                onChange={e => setPath(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
                placeholder="scratch.md  or  notes/2026-04-15.md"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 font-mono"
              />
            </div>
            <div className="h-4 mt-1 text-[11px] flex items-center gap-1.5">
              {pathError ? (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {pathError}
                </span>
              ) : existingCheck?.exists && !overwritingSelf ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> will overwrite existing file
                </span>
              ) : overwritingSelf ? (
                <span className="text-zinc-500">current file</span>
              ) : existingCheck ? (
                <span className="text-emerald-500/80 flex items-center gap-1">
                  <Check className="h-3 w-3" /> new file
                </span>
              ) : null}
            </div>
          </div>

        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded cursor-pointer"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSave}
            className="px-3 py-1.5 text-xs rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
          >
            {existingCheck?.exists && !overwritingSelf ? 'overwrite & save' : 'save'}
          </button>
        </div>
      </div>
    </div>
  )
}
