import { useRef, useCallback, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AppShellProps {
  sidebar: ReactNode
  main: ReactNode
  inspector: ReactNode
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  sidebarWidth: number
  inspectorWidth: number
  onToggleSidebar: () => void
  onToggleInspector: () => void
  onSidebarResize: (width: number) => void
  onInspectorResize: (width: number) => void
}

export function AppShell({
  sidebar,
  main,
  inspector,
  sidebarCollapsed,
  inspectorCollapsed,
  sidebarWidth,
  inspectorWidth,
  onToggleSidebar,
  onToggleInspector,
  onSidebarResize,
  onInspectorResize,
}: AppShellProps) {
  const draggingRef = useRef<'sidebar' | 'inspector' | null>(null)

  const handleMouseDown = useCallback((panel: 'sidebar' | 'inspector') => {
    draggingRef.current = panel
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingRef.current === 'sidebar') {
        onSidebarResize(e.clientX)
      } else if (draggingRef.current === 'inspector') {
        onInspectorResize(window.innerWidth - e.clientX)
      }
    }

    const handleMouseUp = () => {
      draggingRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [onSidebarResize, onInspectorResize])

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div
        className="overflow-hidden transition-[width] duration-200 ease-in-out shrink-0"
        style={{ width: sidebarCollapsed ? 6 : sidebarWidth }}
      >
        {!sidebarCollapsed && (
          <div className="h-full" style={{ width: sidebarWidth }}>{sidebar}</div>
        )}
      </div>

      {/* Left resize handle + chevron */}
      <div
        className="flex shrink-0 items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
        style={{ width: 6 }}
      >
        <button
          onClick={onToggleSidebar}
          onMouseDown={(e) => { if (e.detail === 0) return; /* ignore synthetic */ }}
          className="h-full w-full flex items-center justify-center cursor-col-resize"
          onDoubleClick={onToggleSidebar}
          onMouseDownCapture={(e) => {
            // Single click = start drag, double click = toggle (handled by onDoubleClick)
            if (!sidebarCollapsed) {
              e.preventDefault()
              handleMouseDown('sidebar')
            } else {
              onToggleSidebar()
            }
          }}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <div className="w-[2px] h-8 bg-zinc-800 hover:bg-zinc-600 rounded transition-colors" />
          )}
        </button>
      </div>

      {/* Main Chat Stage */}
      <div className="flex-1 min-w-0">{main}</div>

      {/* Right resize handle + chevron */}
      <div
        className="flex shrink-0 items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
        style={{ width: 6 }}
      >
        <button
          className="h-full w-full flex items-center justify-center cursor-col-resize"
          onDoubleClick={onToggleInspector}
          onMouseDownCapture={(e) => {
            if (!inspectorCollapsed) {
              e.preventDefault()
              handleMouseDown('inspector')
            } else {
              onToggleInspector()
            }
          }}
        >
          {inspectorCollapsed ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <div className="w-[2px] h-8 bg-zinc-800 hover:bg-zinc-600 rounded transition-colors" />
          )}
        </button>
      </div>

      {/* Right Inspector */}
      <div
        className="overflow-hidden transition-[width] duration-200 ease-in-out shrink-0"
        style={{ width: inspectorCollapsed ? 6 : inspectorWidth }}
      >
        {!inspectorCollapsed && (
          <div className="h-full" style={{ width: inspectorWidth }}>{inspector}</div>
        )}
      </div>
    </div>
  )
}
