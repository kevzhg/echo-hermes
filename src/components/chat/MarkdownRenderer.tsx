import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children }) {
          const match = /language-(\w+)/.exec(className ?? '')
          const code = String(children).replace(/\n$/, '')

          if (match) {
            return <CodeBlock language={match[1]} code={code} />
          }

          return (
            <code className="bg-[#27272a] text-[#fafafa] font-mono text-xs rounded px-1.5 py-0.5">
              {children}
            </code>
          )
        },
        strong({ children }) {
          return <strong className="text-[#e4e4e7] font-semibold">{children}</strong>
        },
        ul({ children }) {
          return <ul className="pl-5 list-disc text-zinc-400 my-1">{children}</ul>
        },
        ol({ children }) {
          return <ol className="pl-5 list-decimal text-zinc-400 my-1">{children}</ol>
        },
        li({ children }) {
          return <li className="mb-0.5">{children}</li>
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              className="text-[#3b82f6] underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          )
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
