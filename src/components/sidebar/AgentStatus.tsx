import type { AgentStatus as AgentStatusType } from '../../types'

const statusConfig = {
  online: { color: 'bg-green-500', label: 'Online' },
  thinking: { color: 'bg-amber-500', label: 'Thinking' },
  offline: { color: 'bg-red-500', label: 'Offline' },
} as const

interface AgentStatusProps {
  status: AgentStatusType
}

export function AgentStatus({ status }: AgentStatusProps) {
  const { color, label } = statusConfig[status]

  return (
    <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-zinc-800">
      <div className="w-7 h-7 bg-zinc-800 rounded-md flex items-center justify-center text-xs font-semibold text-white">
        E
      </div>
      <div>
        <div className="text-sm font-semibold text-white leading-tight">Echo</div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
          {label}
        </div>
      </div>
    </div>
  )
}
