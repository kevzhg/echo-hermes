import { useEffect, useMemo, useState } from 'react'
import { X, FileText, FolderClosed, RefreshCw, AlertTriangle, FilePlus } from 'lucide-react'
import { listWikiFiles, type WikiListEntry } from '../../lib/wikiApi'

interface FileBrowserProps {
  currentPath: string | undefined
  onClose: () => void
  onSelect: (path: string) => void
  onNew: () => void
}

interface Group {
  dir: string           // '' for root-level files
  entries: WikiListEntry[]
}

function groupByDir(files: WikiListEntry[]): Group[] {
  const bucket = new Map<string, WikiListEntry[]>()
  for (const f of files) {
    const idx = f.path.indexOf('/')
    const dir = idx === -1 ? '' : f.path.slice(0, idx)
    if (!bucket.has(dir)) bucket.set(dir, [])
    bucket.get(dir)!.push(f)
  }
  // root first, then dirs alpha
  const out: Group[] = []
  if (bucket.has('')) out.push({ dir: '', entries: bucket.get('')! })
  for (const dir of [...bucket.keys()].filter(d => d !== '').sort()) {
    out.push({ dir, entries: bucket.get(dir)! })
  }
  return out
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function FileBrowser({ currentPath, onClose, onSelect, onNew }: FileBrowserProps) {
  const [root, setRoot] = useState<string>('')
  const [files, setFiles] = useState<WikiListEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('')

  const load = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const res = await listWikiFiles()
      setRoot(res.root)
      setFiles(res.files)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setFiles([])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const groups = useMemo(() => {
    if (!files) return []
    const q = filter.trim().toLowerCase()
    const filtered = q
      ? files.filter(f => f.path.toLowerCase().includes(q))
      : files
    return groupByDir(filtered)
  }, [files, filter])

  const total = files?.length ?? 0
  const visible = groups.reduce((n, g) => n + g.entries.length, 0)

  return (
    <div
      className="absolute inset-y-0 left-0 w-[340px] max-w-[85%] flex flex-col z-20 border-r border-zinc-800/80 shadow-[8px_0_32px_-12px_rgba(0,0,0,0.6)]"
      style={{
        background: 'rgba(16, 14, 20, 0.72)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      }}
      role="dialog"
      aria-label="Open file from wiki"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <FolderClosed className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-zinc-300">Open</span>
          <span
            className="text-[10px] text-zinc-500 font-mono truncate"
            title={root}
          >
            {root.replace(/^\/Users\/[^/]+/, '~') || '…'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer rounded hover:bg-zinc-800/60 disabled:opacity-40"
            title="Refresh"
            aria-label="Refresh file list"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer rounded hover:bg-zinc-800/60"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* New file action */}
      <button
        type="button"
        onClick={onNew}
        className="shrink-0 w-full flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 text-left text-zinc-300 hover:bg-amber-500/5 hover:text-amber-200 transition-colors cursor-pointer group"
        title="Start a blank scratch buffer (⌘N)"
      >
        <FilePlus className="h-3.5 w-3.5 text-zinc-500 group-hover:text-amber-300 shrink-0" />
        <span className="text-[12px] font-mono flex-1">new untitled</span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-600 font-semibold">⌘N</span>
      </button>

      {/* Filter */}
      <div className="shrink-0 px-3 py-2 border-b border-zinc-800/60">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="filter…"
          autoFocus
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 font-mono"
        />
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {error ? (
          <div className="px-3 py-4 text-xs text-red-400 flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">failed to list files</div>
              <div className="text-[11px] text-red-400/70 mt-0.5 break-words">{error}</div>
            </div>
          </div>
        ) : files === null ? (
          <div className="px-3 py-6 text-[11px] text-zinc-600 italic font-mono">loading…</div>
        ) : total === 0 ? (
          <div className="px-3 py-6 text-[11px] text-zinc-600 italic font-mono">
            wiki root is empty · drop some `.md` here
          </div>
        ) : visible === 0 ? (
          <div className="px-3 py-6 text-[11px] text-zinc-600 italic font-mono">no matches</div>
        ) : (
          groups.map(group => (
            <div key={group.dir || '__root__'} className="mb-1.5">
              <div className="px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-zinc-600 font-semibold">
                {group.dir || '/'}
              </div>
              <div>
                {group.entries.map(f => {
                  const isCurrent = f.path === currentPath
                  const display = group.dir
                    ? f.path.slice(group.dir.length + 1)
                    : f.path
                  return (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => onSelect(f.path)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/10 text-amber-200 shadow-[inset_2px_0_0_0_rgba(245,158,11,0.5)]'
                          : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100'
                      }`}
                      title={f.path}
                    >
                      <FileText className="h-3 w-3 shrink-0 text-zinc-500" />
                      <span className="text-[12px] font-mono truncate flex-1">{display}</span>
                      <span className="text-[9px] text-zinc-600 font-mono shrink-0">
                        {fmtBytes(f.bytes)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-1.5 border-t border-zinc-800/60 text-[9px] uppercase tracking-[0.14em] text-zinc-600 font-mono flex items-center justify-between">
        <span>{visible} / {total} files</span>
        <span>esc · close</span>
      </div>
    </div>
  )
}
