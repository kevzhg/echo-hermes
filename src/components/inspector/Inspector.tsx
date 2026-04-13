import { useState, useMemo } from 'react'
import { Pin, PinOff } from 'lucide-react'
import type { Skill } from '../../types'

const tabs = ['Skills', 'Files', 'Mind'] as const
type Tab = (typeof tabs)[number]

interface InspectorProps {
  skills: Skill[]
  onTogglePin: (skillId: string) => void
}

export function Inspector({ skills, onTogglePin }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Skills')

  const pinnedSkills = useMemo(() => skills.filter(s => s.pinned), [skills])
  const allSkills = useMemo(() => {
    const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name))
    return sorted
  }, [skills])

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
          <div className="flex flex-col gap-3">
            {/* Pinned tray */}
            {pinnedSkills.length > 0 && (
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">
                  Pinned
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pinnedSkills.map(skill => (
                    <button
                      key={skill.id}
                      onClick={() => onTogglePin(skill.id)}
                      className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded px-2 py-1 text-xs hover:bg-amber-500/20 transition-colors"
                    >
                      <Pin className="h-2.5 w-2.5" />
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All tools */}
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">
                All Tools ({allSkills.length})
              </div>
              <div className="flex flex-col gap-0.5">
                {allSkills.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => onTogglePin(skill.id)}
                    className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors text-left ${
                      skill.pinned
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                    }`}
                  >
                    {skill.pinned ? (
                      <Pin className="h-3 w-3 text-amber-500 shrink-0" />
                    ) : (
                      <PinOff className="h-3 w-3 text-zinc-600 shrink-0" />
                    )}
                    <span className="font-mono truncate">{skill.name}</span>
                    {skill.source === 'local' && (
                      <span className="text-[9px] text-blue-400 bg-blue-400/10 rounded px-1 py-0.5 shrink-0 ml-auto">
                        local
                      </span>
                    )}
                    <span className="text-[9px] text-zinc-600 shrink-0 ml-auto">
                      {skill.category}
                    </span>
                  </button>
                ))}
              </div>
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
    </div>
  )
}
