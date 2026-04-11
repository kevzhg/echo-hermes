import { useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from './components/layout/AppShell'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatStage } from './components/chat/ChatStage'
import { Inspector } from './components/inspector/Inspector'
import { usePanelCollapse } from './hooks/usePanelCollapse'
import { useWorkspace } from './hooks/useWorkspace'
import { db, initDb } from './db/index'
import type { Message } from './types'
import { toggleSkill, sendMessage } from './db/operations'

export default function App() {
  useEffect(() => { initDb() }, [])

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
    createContext,
    createThread,
  } = useWorkspace()

  const skills = useLiveQuery(() => db.skills.toArray()) ?? []

  const activeMessages = useLiveQuery(
    () => activeThreadId
      ? db.messages.where('threadId').equals(activeThreadId).sortBy('timestamp')
      : Promise.resolve([] as Message[]),
    [activeThreadId]
  ) ?? []

  const handleToggleSkill = useCallback((skillId: string) => {
    toggleSkill(skillId)
  }, [])

  const handleSend = useCallback((content: string) => {
    if (activeThreadId) {
      sendMessage(activeThreadId, content)
    }
  }, [activeThreadId])

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
          onCreateContext={createContext}
          onCreateThread={createThread}
        />
      }
      main={
        <ChatStage
          activeContext={activeContext}
          activeThread={activeThread}
          messages={activeMessages}
          onSend={handleSend}
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
