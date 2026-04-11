import { useState, useCallback } from 'react'

interface PanelCollapseState {
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  toggleSidebar: () => void
  toggleInspector: () => void
}

export function usePanelCollapse(): PanelCollapseState {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), [])
  const toggleInspector = useCallback(() => setInspectorCollapsed(prev => !prev), [])

  return { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector }
}
