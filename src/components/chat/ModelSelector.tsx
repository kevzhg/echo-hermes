import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, X } from 'lucide-react'
import { db } from '../../db/index'
import { setThreadModel, deleteKnownModel } from '../../db/operations'

interface ModelSelectorProps {
  threadId: string
  currentModel?: string
}

export function ModelSelector({ threadId, currentModel }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const knownModels = useLiveQuery(
    () => db.knownModels.orderBy('lastUsedAt').reverse().toArray(),
    [],
  ) ?? []

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelect = async (model: string) => {
    await setThreadModel(threadId, model)
    setOpen(false)
  }

  const handleClear = async () => {
    await setThreadModel(threadId, undefined)
    setOpen(false)
  }

  const DEFAULT_MODEL = 'MiniMax-M2.7'
  const activeModel = currentModel || DEFAULT_MODEL
  const display = activeModel.split('/').pop() ?? activeModel

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 rounded px-1.5 py-0.5 transition-colors font-mono"
        title="Switch model"
      >
        <span className="truncate max-w-[120px]">{display}</span>
        <ChevronDown className="h-2.5 w-2.5 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl z-50 min-w-[200px] py-1">
          <div className="px-3 py-1.5 text-[10px] text-zinc-600 uppercase tracking-wider border-b border-zinc-800">
            Models
          </div>
          {currentModel && (
            <button
              onClick={handleClear}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors italic"
            >
              Use default
            </button>
          )}
          {knownModels.length === 0 && !currentModel && (
            <div className="px-3 py-2 text-[11px] text-zinc-600">
              No saved models. Type <code className="text-zinc-400">/model name</code> in chat.
            </div>
          )}
          {knownModels.map(m => (
            <div
              key={m.name}
              className={`group flex items-center gap-1 px-1 ${
                m.name === currentModel ? 'bg-zinc-800/50' : ''
              }`}
            >
              <button
                onClick={() => handleSelect(m.name)}
                className={`flex-1 text-left px-2 py-1.5 text-xs hover:bg-zinc-800 rounded font-mono truncate transition-colors ${
                  m.name === currentModel ? 'text-emerald-400' : 'text-zinc-300'
                }`}
              >
                {m.name}
              </button>
              <button
                onClick={() => deleteKnownModel(m.name)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 px-1 transition-opacity"
                title="Forget"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
