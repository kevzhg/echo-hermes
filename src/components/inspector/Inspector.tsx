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
  onToggleActive: (skillId: string) => void
  onToggleFavorite: (skillId: string) => void
  onCloneSkill: (skillId: string) => void
  onDeleteSkill: (skillId: string) => void
  onActivateSlashCommand?: (skillName: string) => void
}

export function Inspector({
  skills,
  onToggleActive,
  onToggleFavorite,
  onCloneSkill,
  onDeleteSkill,
  onActivateSlashCommand,
}: InspectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Skills')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [pinnedOpen, setPinnedOpen] = useState(false)

  const pinnedSkills = useMemo(
    () => skills.filter(s => s.active).sort((a, b) => a.name.localeCompare(b.name)),
    [skills],
  )
  const unpinnedSkills = useMemo(
    () => skills.filter(s => !s.active).sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
      return a.name.localeCompare(b.name)
    }),
    [skills],
  )

  const unpinnedGrouped = useMemo(() => {
    const map = new Map<string, Skill[]>()
    for (const s of unpinnedSkills) {
      const cat = s.category || 'Uncategorized'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(s)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [unpinnedSkills])

  const handleContextMenu = useCallback((e: React.MouseEvent, skillId: string) => {
    e.preventDefault()
    setContextMenu({ skillId, x: e.clientX, y: e.clientY })
  }, [])

  const handlePinnedClick = useCallback((skill: Skill) => {
    // Left-click pinned skill → inject /skill-name into chat input
    onActivateSlashCommand?.(skill.name)
  }, [onActivateSlashCommand])

  const handleUnpinnedClick = useCallback((skillId: string) => {
    // Left-click unpinned → pin it (move to active)
    onToggleActive(skillId)
  }, [onToggleActive])

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

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'Skills' && (
          <div className="flex flex-col gap-2">
            {/* Section A: Pinned/Active — collapsed by default */}
            {pinnedSkills.length > 0 && (
              <div>
                <button
                  onClick={() => setPinnedOpen(prev => !prev)}
                  className="w-full flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider px-1 py-1 hover:text-zinc-400 transition-colors"
                >
                  {pinnedOpen ? (
                    <ChevronDown className="h-2.5 w-2.5" />
                  ) : (
                    <ChevronRight className="h-2.5 w-2.5" />
                  )}
                  <Zap className="h-2.5 w-2.5 text-emerald-500" />
                  <span>Active Skills ({pinnedSkills.length})</span>
                </button>
                {pinnedOpen && (
                  <div className="flex flex-wrap gap-1.5 mt-1 px-1">
                    {pinnedSkills.map(skill => (
                      <button
                        key={skill.id}
                        onClick={() => handlePinnedClick(skill)}
                        onContextMenu={e => handleContextMenu(e, skill.id)}
                        className="inline-flex items-center gap-1 bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 rounded px-2 py-1 text-xs hover:bg-emerald-500/20 transition-all"
                      >
                        {skill.favorite && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />}
                        {skill.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="border-b border-zinc-800 mt-2 mb-1" />
              </div>
            )}

            {/* Section B: All other tools — grouped by category, expanded */}
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider px-1 mb-1.5">
                All Tools ({unpinnedSkills.length})
              </div>
              {unpinnedGrouped.map(([category, catSkills]) => (
                <div key={category} className="mb-2">
                  <div className="text-[10px] text-zinc-600 capitalize px-1 mb-1">{category}</div>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {catSkills.map(skill => (
                      <button
                        key={skill.id}
                        onClick={() => handleUnpinnedClick(skill.id)}
                        onContextMenu={e => handleContextMenu(e, skill.id)}
                        className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded px-2 py-1 text-xs hover:border-zinc-500 hover:text-zinc-300 transition-all"
                      >
                        {skill.favorite && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />}
                        {skill.name}
                        {skill.source === 'local' && (
                          <span className="text-[8px] text-blue-400 bg-blue-400/10 rounded px-0.5">L</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
          isPinned={contextSkill.active}
          onFavorite={() => onToggleFavorite(contextMenu.skillId)}
          onEdit={() => {/* TODO: editor modal */}}
          onClone={() => onCloneSkill(contextMenu.skillId)}
          onUnpin={() => onToggleActive(contextMenu.skillId)}
          onDelete={() => onDeleteSkill(contextMenu.skillId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
