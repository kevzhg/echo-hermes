interface EmojiPickerProps {
  selected: string
  onSelect: (emoji: string) => void
}

const presets = ['📁', '💼', '💻', '🌊', '📂', '🎯', '🔬', '📝']

export function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {presets.map(emoji => (
        <button
          key={emoji}
          onMouseDown={e => e.preventDefault()}
          onClick={() => onSelect(emoji)}
          className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
            selected === emoji
              ? 'bg-zinc-700 ring-1 ring-blue-500'
              : 'hover:bg-zinc-800'
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
