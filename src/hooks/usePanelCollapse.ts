import { useState, useCallback } from 'react'

const STORAGE_KEY = 'echo-panel-state'

interface PanelState {
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  sidebarWidth: number
  inspectorWidth: number
}

function loadState(): PanelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { sidebarCollapsed: false, inspectorCollapsed: false, sidebarWidth: 260, inspectorWidth: 280 }
}

function saveState(state: PanelState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

export function usePanelCollapse() {
  const [state, setState] = useState<PanelState>(loadState)

  const update = useCallback((patch: Partial<PanelState>) => {
    setState(prev => {
      const next = { ...prev, ...patch }
      saveState(next)
      return next
    })
  }, [])

  const toggleSidebar = useCallback(() => {
    update({ sidebarCollapsed: !state.sidebarCollapsed })
  }, [state.sidebarCollapsed, update])

  const toggleInspector = useCallback(() => {
    update({ inspectorCollapsed: !state.inspectorCollapsed })
  }, [state.inspectorCollapsed, update])

  const setSidebarWidth = useCallback((w: number) => {
    update({ sidebarWidth: Math.max(180, Math.min(500, w)) })
  }, [update])

  const setInspectorWidth = useCallback((w: number) => {
    update({ inspectorWidth: Math.max(200, Math.min(500, w)) })
  }, [update])

  return {
    sidebarCollapsed: state.sidebarCollapsed,
    inspectorCollapsed: state.inspectorCollapsed,
    sidebarWidth: state.sidebarWidth,
    inspectorWidth: state.inspectorWidth,
    toggleSidebar,
    toggleInspector,
    setSidebarWidth,
    setInspectorWidth,
  }
}
