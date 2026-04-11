import { useState, useCallback } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatStage } from './components/chat/ChatStage'
import { Inspector } from './components/inspector/Inspector'
import { usePanelCollapse } from './hooks/usePanelCollapse'
import { useWorkspace } from './hooks/useWorkspace'
import { mockSkills } from './data/mockData'
import type { Skill } from './types'

export default function App() {
  const { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector } =
    usePanelCollapse()
  const {
    expandedContextIds,
    activeThreadId,
    activeThread,
    activeContext,
    toggleContextExpanded,
    setActiveThread,
    filterQuery,
    setFilterQuery,
    filteredContexts,
  } = useWorkspace()

  const [skills, setSkills] = useState<Skill[]>(mockSkills)

  const handleToggleSkill = useCallback((skillId: string) => {
    setSkills(prev =>
      prev.map(s => (s.id === skillId ? { ...s, enabled: !s.enabled } : s))
    )
  }, [])

  return (
    <AppShell
      sidebarCollapsed={sidebarCollapsed}
      inspectorCollapsed={inspectorCollapsed}
      onToggleSidebar={toggleSidebar}
      onToggleInspector={toggleInspector}
      sidebar={
        <Sidebar
          agentStatus="online"
          contexts={filteredContexts}
          expandedContextIds={expandedContextIds}
          activeThreadId={activeThreadId}
          filterQuery={filterQuery}
          onFilterQueryChange={setFilterQuery}
          onToggleContextExpanded={toggleContextExpanded}
          onSelectThread={setActiveThread}
        />
      }
      main={
        <ChatStage
          activeContext={activeContext}
          activeThread={activeThread}
        />
      }
      inspector={
        <Inspector
          skills={skills}
          onToggleSkill={handleToggleSkill}
        />
      }
    />
  )
}
