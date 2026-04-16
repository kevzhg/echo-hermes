import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from './components/layout/AppShell'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatStage } from './components/chat/ChatStage'
import { ScratchPad } from './components/home/ScratchPad'
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
  toggleThreadFavorite,
  reorderThreads,
  reorderContexts,
  renameContext,
  deleteContext,
} from './db/operations'

export default function App() {
  useEffect(() => { initDb().then(() => syncSkillsFromBridge()) }, [])

  const {
    sidebarCollapsed, inspectorCollapsed,
    sidebarWidth, inspectorWidth,
    toggleSidebar, toggleInspector,
    setSidebarWidth, setInspectorWidth,
  } = usePanelCollapse()
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

  const { sendMessage: hermesSend, mindEvents } = useHermesConnection(activeThreadId)

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
      sidebarWidth={sidebarWidth}
      inspectorWidth={inspectorWidth}
      onToggleSidebar={toggleSidebar}
      onToggleInspector={toggleInspector}
      onSidebarResize={setSidebarWidth}
      onInspectorResize={setInspectorWidth}
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
          onToggleThreadFavorite={(id) => toggleThreadFavorite(id)}
          onReorderThreads={(ctxId, ids) => reorderThreads(ctxId, ids)}
          onReorderContexts={(ids) => reorderContexts(ids)}
          onRenameContext={(id, name, emoji) => renameContext(id, name, emoji)}
          onDeleteContext={(id) => deleteContext(id)}
          onOpenScratch={() => setActiveThread(null)}
          scratchActive={activeThreadId === null}
        />
      }
      main={
        activeThreadId === null ? (
          <ScratchPad />
        ) : (
          <ChatStage
            activeContext={activeContext}
            activeThread={activeThread}
            messages={activeMessages}
            skills={skills}
            onSend={hermesSend}
            pendingText={pendingText}
            onPendingTextConsumed={() => setPendingText(null)}
          />
        )
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
          mindEvents={mindEvents}
          sessionId={activeThread?.hermesSessionId}
          activeThreadId={activeThreadId}
          onSelectThread={setActiveThread}
        />
      }
    />
  )
}
