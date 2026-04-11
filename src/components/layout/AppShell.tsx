import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AppShellProps {
  sidebar: ReactNode
  main: ReactNode
  inspector: ReactNode
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  onToggleSidebar: () => void
  onToggleInspector: () => void
}

export function AppShell({
  sidebar,
  main,
  inspector,
  sidebarCollapsed,
  inspectorCollapsed,
  onToggleSidebar,
  onToggleInspector,
}: AppShellProps) {
  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div
        className="overflow-hidden transition-[width] duration-200 ease-in-out"
        style={{ width: sidebarCollapsed ? 6 : 260 }}
      >
        {!sidebarCollapsed && (
          <div className="h-full w-[260px]">{sidebar}</div>
        )}
      </div>

      {/* Left Chevron Strip */}
      <button
        onClick={onToggleSidebar}
        className="flex w-[6px] shrink-0 cursor-pointer items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Main Chat Stage */}
      <div className="flex-1 min-w-0">{main}</div>

      {/* Right Chevron Strip */}
      <button
        onClick={onToggleInspector}
        className="flex w-[6px] shrink-0 cursor-pointer items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
        aria-label={inspectorCollapsed ? 'Expand inspector' : 'Collapse inspector'}
      >
        {inspectorCollapsed ? (
          <ChevronLeft className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {/* Right Inspector */}
      <div
        className="overflow-hidden transition-[width] duration-200 ease-in-out"
        style={{ width: inspectorCollapsed ? 6 : 280 }}
      >
        {!inspectorCollapsed && (
          <div className="h-full w-[280px]">{inspector}</div>
        )}
      </div>
    </div>
  )
}
