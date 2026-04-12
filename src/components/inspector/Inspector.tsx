import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Skill } from '../../types'

const tabs = ['Skills', 'Files', 'Mind'] as const
type Tab = (typeof tabs)[number]

interface InspectorProps {
  skills: Skill[]
  onToggleSkill: (skillId: string) => void
}

export function Inspector({ skills, onToggleSkill }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Skills')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  // Group skills by category
  const grouped = useMemo(() => {
    const map = new Map<string, Skill[]>()
    for (const skill of skills) {
      const cat = skill.category || 'Local / Custom'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(skill)
    }
    // Sort: "Local / Custom" first, then alphabetical
    const entries = [...map.entries()]
    entries.sort((a, b) => {
      if (a[0] === 'Local / Custom') return -1
      if (b[0] === 'Local / Custom') return 1
      return a[0].localeCompare(b[0])
    })
    return entries
  }, [skills])

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

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
          <div className="flex flex-col gap-1">
            {grouped.map(([category, categorySkills]) => {
              const isCollapsed = collapsedCategories.has(category)
              const enabledCount = categorySkills.filter(s => s.enabled).length

              return (
                <div key={category}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-zinc-400 hover:bg-zinc-800/50 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-zinc-600 shrink-0" />
                    )}
                    <span className="capitalize font-medium text-zinc-300">{category}</span>
                    <span className="ml-auto text-[10px] text-zinc-600">
                      {enabledCount}/{categorySkills.length}
                    </span>
                  </button>

                  {/* Skills in category */}
                  {!isCollapsed && (
                    <div className="ml-3 flex flex-col gap-1 mb-1">
                      {categorySkills.map(skill => (
                        <div
                          key={skill.id}
                          className="flex items-center justify-between bg-zinc-800 rounded px-2.5 py-1.5"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs text-zinc-200 font-mono truncate">
                              {skill.name}
                            </span>
                            {skill.source === 'local' && (
                              <span className="text-[9px] text-blue-400 bg-blue-400/10 rounded px-1 py-0.5 shrink-0">
                                local
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => onToggleSkill(skill.id)}
                            className={`rounded text-[10px] font-semibold px-1.5 py-0.5 transition-colors shrink-0 ml-2 ${
                              skill.enabled
                                ? 'bg-green-500 text-zinc-900'
                                : 'bg-[#7f1d1d] text-white'
                            }`}
                          >
                            {skill.enabled ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
    </div>
  )
}
