export function TypingIndicator() {
  return (
    <div className="flex justify-start px-4 py-1">
      <div
        className="bg-[#18181b] border border-[#27272a] inline-flex items-center gap-1.5 px-4 py-2.5"
        style={{ borderRadius: '12px 12px 12px 4px' }}
      >
        {[0, 0.2, 0.4].map((delay, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse"
            style={{ animationDelay: `${delay}s`, animationDuration: '1.4s' }}
          />
        ))}
      </div>
    </div>
  )
}
