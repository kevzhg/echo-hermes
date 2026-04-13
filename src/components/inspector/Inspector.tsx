import { useState, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronRight, Star, Zap } from 'lucide-react'
import type { Skill } from '../../types'
import { SkillContextMenu } from './SkillContextMenu'

const tabs = ['Skills', 'Files', 'Mind'] as const
type Tab = (typeof tabs)[number]

interface ContextMenuState {
  skillId: string
  x: number
  y: number
}

interface InspectorProps {
  skills: Skill[]
  onTogglePin: (skillId: string) => void
  onToggleActive: (skillId: string) => void
  onToggleFavorite: (skillId: string) => void
  onCloneSkill: (skillId: string) => void
  onDeleteSkill: (skillId: string) => void
}

export function Inspector({
  skills,
  onTogglePin,
  onToggleActive,
  onToggleFavorite,
  onCloneSkill,
  onDeleteSkill,
}: InspectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Skills')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [activesTrayOpen, setActivesTrayOpen] = useState(false)

  const activeSkills = useMemo(() => skills.filter(s => s.active), [skills])

  // Group by category — all categories open by default
  const grouped = useMemo(() => {
    const map = new Map<string, Skill[]>()
    for (const skill of skills) {
      const cat = skill.category || 'Uncategorized'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(skill)
    }
    // Sort skills within each category alphabetically
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name))
    }
    // Sort categories: favorites-bearing first, then alphabetical
    const entries = [...map.entries()]
    entries.sort((a, b) => a[0].localeCompare(b[0]))
    return entries
  }, [skills])

  const handleContextMenu = useCallback((e: React.MouseEvent, skillId: string) => {
    e.preventDefault()
    setContextMenu({ skillId, x: e.clientX, y: e.clientY })
  }, [])

  const contextSkill = contextMenu ? skills.find(s => s.id === contextMenu.skillId) : null

  return (
    <div className="h-full bg-[#18181b] rounded-lg border border-zinc-800 p-3 flex flex-col">
      {/* Tab bar */}
      <div className="flex gap-0.5 bg-zinc-800 rounded p-0.5 mb-3">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded text-xs py-1.5 text-center transition-colors ${
              activeTab === tab
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'Skills' && (
          <div className="flex flex-col gap-2">
            {/* Forced/Active tray — collapsed by default */}
            {activeSkills.length > 0 && (
              <div>
                <button
                  onClick={() => setActivesTrayOpen(prev => !prev)}
                  className="w-full flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider px-1 py-1 hover:text-zinc-400 transition-colors"
                >
                  {activesTrayOpen ? (
                    <ChevronDown className="h-2.5 w-2.5" />
                  ) : (
                    <ChevronRight className="h-2.5 w-2.5" />
                  )}
                  <Zap className="h-2.5 w-2.5 text-emerald-500" />
                  <span>Forced ({activeSkills.length})</span>
                </button>
                {activesTrayOpen && (
                  <div className="flex flex-wrap gap-1.5 mt-1 mb-1">
                    {activeSkills.map(skill => (
                      <button
                        key={skill.id}
                        onClick={() => onToggleActive(skill.id)}
                        onContextMenu={e => handleContextMenu(e, skill.id)}
                        className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded px-2 py-1 text-xs shadow-[0_0_6px_rgba(16,185,129,0.12)] hover:bg-emerald-500/25 transition-all"
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Category groups — all open by default */}
            {grouped.map(([category, categorySkills]) => {
              const activeCount = categorySkills.filter(s => s.active).length

              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-1.5 px-1 py-1 text-[10px] text-zinc-500 uppercase tracking-wider">
                    <span className="capitalize text-zinc-400">{category}</span>
                    {activeCount > 0 && (
                      <span className="text-emerald-500">{activeCount}</span>
                    )}
                    <span className="text-zinc-700">({categorySkills.length})</span>
                  </div>

                  {/* Skills in category */}
                  <div className="flex flex-col gap-0.5">
                    {categorySkills.map(skill => (
                      <button
                        key={skill.id}
                        onClick={() => onToggleActive(skill.id)}
                        onContextMenu={e => handleContextMenu(e, skill.id)}
                        className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-all text-left ${
                          skill.active
                            ? 'bg-emerald-500/8 border border-emerald-500/20 text-emerald-400'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 border border-transparent'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                          skill.active
                            ? 'bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.4)]'
                            : 'bg-zinc-700'
                        }`} />
                        <span className="font-mono truncate">{skill.name}</span>
                        {skill.favorite && (
                          <Star className="h-2.5 w-2.5 text-amber-500 shrink-0 fill-amber-500" />
                        )}
                        {skill.source === 'local' && (
                          <span className="text-[9px] text-blue-400 bg-blue-400/10 rounded px-1 py-0.5 shrink-0 ml-auto">
                            local
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'Files' && (
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 py-12">
            No active files
          </div>
        )}

        {activeTab === 'Mind' && (
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 py-12">
            Reasoning steps will appear here
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && contextSkill && (
        <SkillContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isFavorite={contextSkill.favorite}
          isPinned={contextSkill.pinned}
          onFavorite={() => onToggleFavorite(contextMenu.skillId)}
          onEdit={() => {/* TODO: open editor modal */}}
          onClone={() => onCloneSkill(contextMenu.skillId)}
          onUnpin={() => onTogglePin(contextMenu.skillId)}
          onDelete={() => onDeleteSkill(contextMenu.skillId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
