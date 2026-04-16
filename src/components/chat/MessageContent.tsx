import { useMemo } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ThinkBlock } from './ThinkBlock'

const OPEN_TAG = '<think>'
const CLOSE_TAG = '</think>'

type Segment =
  | { type: 'text'; text: string }
  | { type: 'think'; text: string; open: boolean }

function parseThinkSegments(content: string): Segment[] {
  const out: Segment[] = []
  let rest = content
  while (true) {
    const o = rest.indexOf(OPEN_TAG)
    if (o === -1) {
      if (rest) out.push({ type: 'text', text: rest })
      return out
    }
    if (o > 0) out.push({ type: 'text', text: rest.slice(0, o) })
    const after = rest.slice(o + OPEN_TAG.length)
    const c = after.indexOf(CLOSE_TAG)
    if (c === -1) {
      // unclosed — either mid-stream or malformed; treat as still thinking
      out.push({ type: 'think', text: after, open: true })
      return out
    }
    out.push({ type: 'think', text: after.slice(0, c), open: false })
    rest = after.slice(c + CLOSE_TAG.length)
  }
}

interface MessageContentProps {
  content: string
  streaming: boolean
}

export function MessageContent({ content, streaming }: MessageContentProps) {
  const segments = useMemo(() => parseThinkSegments(content), [content])
  const lastIdx = segments.length - 1

  return (
    <>
      {segments.map((s, i) => {
        if (s.type === 'think') {
          return <ThinkBlock key={i} text={s.text} open={s.open} />
        }
        // Last text segment during streaming: raw + cursor (avoids markdown jank mid-token).
        if (streaming && i === lastIdx) {
          return (
            <span key={i} className="whitespace-pre-wrap">
              {s.text}
              <span className="animate-pulse ml-0.5 text-zinc-400">&#9611;</span>
            </span>
          )
        }
        return <MarkdownRenderer key={i} content={s.text} />
      })}
    </>
  )
}
