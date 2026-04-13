import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from './components/layout/AppShell'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatStage } from './components/chat/ChatStage'
import { Inspector } from './components/inspector/Inspector'
import { usePanelCollapse } from './hooks/usePanelCollapse'
import { useWorkspace } from './hooks/useWorkspace'
import { useHermesConnection } from './hooks/useHermesConnection'
import { db, initDb } from './db/index'
import type { Message } from './types'
import {
  toggleSkillPin,
  toggleSkillActive,
  toggleSkillFavorite,
  cloneSkill,
  deleteSkill,
  syncSkillsFromBridge,
  renameThread,
  setThreadSessionId,
  deleteThread,
} from './db/operations'

export default function App() {
  useEffect(() => { initDb().then(() => syncSkillsFromBridge()) }, [])

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

  const { sendMessage: hermesSend } = useHermesConnection(activeThreadId)

  const skills = useLiveQuery(() => db.skills.toArray()) ?? []

  const activeMessages = useLiveQuery(
    () => activeThreadId
      ? db.messages.where('threadId').equals(activeThreadId).sortBy('timestamp')
      : Promise.resolve([] as Message[]),
    [activeThreadId]
  ) ?? []

  const [pendingText, setPendingText] = useState<string | null>(null)

  const handleTogglePin = useCallback((skillId: string) => { toggleSkillPin(skillId) }, [])
  const handleToggleActive = useCallback((skillId: string) => { toggleSkillActive(skillId) }, [])
  const handleToggleFavorite = useCallback((skillId: string) => { toggleSkillFavorite(skillId) }, [])
  const handleCloneSkill = useCallback((skillId: string) => { cloneSkill(skillId) }, [])
  const handleDeleteSkill = useCallback((skillId: string) => { deleteSkill(skillId) }, [])

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
          onRenameThread={(id, name) => renameThread(id, name)}
          onSetThreadSessionId={(id, sid) => setThreadSessionId(id, sid)}
          onDeleteThread={(id) => deleteThread(id)}
        />
      }
      main={
        <ChatStage
          activeContext={activeContext}
          activeThread={activeThread}
          messages={activeMessages}
          skills={skills}
          onSend={hermesSend}
          pendingText={pendingText}
          onPendingTextConsumed={() => setPendingText(null)}
        />
      }
      inspector={
        <Inspector
          skills={skills}
          onTogglePin={handleTogglePin}
          onToggleActive={handleToggleActive}
          onToggleFavorite={handleToggleFavorite}
          onCloneSkill={handleCloneSkill}
          onDeleteSkill={handleDeleteSkill}
          onInjectSkillName={(name) => setPendingText(name)}
        />
      }
    />
  )
}
