import { useState, useRef, useEffect } from 'react'

interface InlineInputProps {
  placeholder?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function InlineInput({ placeholder = 'Enter name...', onConfirm, onCancel }: InlineInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) {
        onConfirm(value.trim())
      } else {
        onCancel()
      }
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      placeholder={placeholder}
      className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500 px-2 py-1.5 outline-none focus:border-zinc-600 transition-colors"
    />
  )
}
