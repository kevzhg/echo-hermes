import { useState, useEffect } from 'react'
import { Brain } from 'lucide-react'

const QUIPS = [
  'Consulting the ancient scrolls...',
  'Asking the rubber duck...',
  'Reticulating splines...',
  'Warming up the neurons...',
  'Summoning the wisdom...',
  'Crunching the vibes...',
  'Downloading more RAM...',
  'Feeding the hamsters...',
  'Brewing some thoughts...',
  'Polishing the crystal ball...',
  'Aligning the chakras...',
  'Herding the electrons...',
  'Contemplating existence...',
  'Negotiating with the API...',
  'Shaking the magic 8-ball...',
  'Compiling sarcasm...',
  'Defragmenting brain cells...',
  'Querying the hive mind...',
  'Calculating the meaning of life...',
  'Buffering brilliance...',
]

function pickQuip(): string {
  return QUIPS[Math.floor(Math.random() * QUIPS.length)]
}

export function ThinkingIndicator() {
  const [quip, setQuip] = useState(pickQuip)
  const [elapsed, setElapsed] = useState(0)

  // Rotate quip every 4s
  useEffect(() => {
    const id = setInterval(() => setQuip(pickQuip()), 4000)
    return () => clearInterval(id)
  }, [])

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `${secs}s`

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1 px-1">
      <Brain className="h-3.5 w-3.5 text-amber-500 animate-bounce" style={{ animationDuration: '1.5s' }} />
      <span className="italic text-zinc-500">{quip}</span>
      <span className="text-zinc-600 font-mono ml-auto">{timeStr}</span>
    </div>
  )
}
