export function SelfInitiatedDivider() {
  return (
    <div className="flex items-center gap-3 my-2 px-4">
      <div className="flex-1 h-px bg-[#27272a]" />
      <span className="text-xs text-[#71717a] whitespace-nowrap flex items-center gap-1.5">
        <span className="text-[#f59e0b]">⚡</span>
        Echo initiated
      </span>
      <div className="flex-1 h-px bg-[#27272a]" />
    </div>
  )
}
