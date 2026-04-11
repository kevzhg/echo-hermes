import { useState } from 'react'
import type { Skill } from '../../types'

const tabs = ['Skills', 'Files', 'Mind'] as const
type Tab = (typeof tabs)[number]

interface InspectorProps {
  skills: Skill[]
  onToggleSkill: (skillId: string) => void
}

export function Inspector({ skills, onToggleSkill }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Skills')

  return (
    <div className="h-full bg-[#18181b] rounded-lg border border-zinc-800 p-3 flex flex-col">
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
          <div className="flex flex-col gap-1.5">
            {skills.map(skill => (
              <div key={skill.id} className="bg-zinc-800 rounded px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-200 font-mono">{skill.name}</span>
                  <button
                    onClick={() => onToggleSkill(skill.id)}
                    className={`rounded text-[10px] font-semibold px-1.5 py-0.5 transition-colors ${
                      skill.enabled
                        ? 'bg-green-500 text-zinc-900'
                        : 'bg-[#7f1d1d] text-white'
                    }`}
                  >
                    {skill.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="text-[10px] text-zinc-500">{skill.description}</div>
              </div>
            ))}
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
