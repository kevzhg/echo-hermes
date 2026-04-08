# Echo UI Phase 1 — Layout Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3-pane workspace layout shell with collapsible sidebar, context/thread tree navigation, and context switching — all with mocked data.

**Architecture:** Single-page React app with a flex-row layout: Sidebar (260px) | Chevron (6px) | Chat Stage (flex-1) | Chevron (6px) | Inspector (280px). Panels collapse to 6px hairline strips via CSS transitions. State managed with React `useState`/`useReducer` — no external state library.

**Tech Stack:** React 18, Vite, TypeScript (strict), Tailwind CSS v4, Lucide React

---

## File Structure

```
Echo/
  package.json
  tsconfig.json
  tsconfig.app.json
  vite.config.ts
  tailwind.config.ts
  index.html
  src/
    main.tsx                          — React root mount
    App.tsx                           — composes AppShell with providers
    types.ts                          — Context, Thread, Message, Skill interfaces
    data/
      mockData.ts                     — mock contexts, threads, messages, skills
    hooks/
      useWorkspace.ts                 — active context/thread selection + tree expand/collapse
      usePanelCollapse.ts             — sidebar/inspector collapse state
    components/
      layout/
        AppShell.tsx                  — 3-pane flex container + chevron strips
      sidebar/
        Sidebar.tsx                   — agent status + search + tree + bottom bar
        AgentStatus.tsx               — avatar + name + status dot
        ContextTree.tsx               — maps contexts to ContextItem components
        ContextItem.tsx               — expandable context row with thread children
        ThreadItem.tsx                — single thread row, clickable
        SearchInput.tsx               — fuzzy filter input
      chat/
        ChatStage.tsx                 — top bar breadcrumb + placeholder content area
      inspector/
        Inspector.tsx                 — tabbed right panel with placeholder content
```

---

### Task 1: Scaffold Vite + React + TypeScript + Tailwind

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tailwind.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Create Vite project**

Run:
```bash
cd /Users/kz/Documents/VN_Project/Echo
npm create vite@latest . -- --template react-ts
```

Select: Use current directory, overwrite existing files.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install lucide-react
```

- [ ] **Step 3: Configure Tailwind with Vite plugin**

Replace `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

Replace the contents of `src/index.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Set up base HTML with dark background and Inter font**

Replace `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Echo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-[#09090b] text-[#fafafa] font-['Inter',system-ui,sans-serif] antialiased">
    <div id="root" class="h-screen w-screen overflow-hidden"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create minimal App component**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="flex h-full items-center justify-center text-zinc-500">
      Echo — Shell Loading...
    </div>
  )
}
```

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: Browser shows "Echo — Shell Loading..." centered on a dark `#09090b` background with Inter font. No console errors.

- [ ] **Step 7: Clean up Vite boilerplate**

Delete these files if they exist:
```bash
rm -f src/App.css src/assets/react.svg public/vite.svg
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript + Tailwind"
```

---

### Task 2: Types and Mock Data

**Files:**
- Create: `src/types.ts`, `src/data/mockData.ts`

- [ ] **Step 1: Define TypeScript interfaces**

Create `src/types.ts`:

```ts
export interface Thread {
  id: string
  name: string
  contextId: string
  lastMessageAt: string
}

export interface Context {
  id: string
  name: string
  emoji: string
  threads: Thread[]
}

export interface Message {
  id: string
  threadId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  status: 'sent' | 'streaming' | 'error'
}

export interface Skill {
  id: string
  name: string
  description: string
  enabled: boolean
}

export type AgentStatus = 'online' | 'thinking' | 'offline'
```

- [ ] **Step 2: Create mock data**

Create `src/data/mockData.ts`:

```ts
import type { Context, Message, Skill } from '../types'

export const mockContexts: Context[] = [
  {
    id: 'ctx-workplace',
    name: 'Workplace',
    emoji: '💼',
    threads: [
      { id: 'thr-okr', name: 'Q2 OKR Planning', contextId: 'ctx-workplace', lastMessageAt: '2026-04-08T14:42:00Z' },
      { id: 'thr-onboard', name: 'Client Onboarding', contextId: 'ctx-workplace', lastMessageAt: '2026-04-08T13:15:00Z' },
      { id: 'thr-standup', name: 'Team Standup Notes', contextId: 'ctx-workplace', lastMessageAt: '2026-04-08T11:00:00Z' },
    ],
  },
  {
    id: 'ctx-tech',
    name: 'Tech',
    emoji: '💻',
    threads: [
      { id: 'thr-rust', name: 'Rust Learning Path', contextId: 'ctx-tech', lastMessageAt: '2026-04-07T20:00:00Z' },
      { id: 'thr-infra', name: 'Infra Migration', contextId: 'ctx-tech', lastMessageAt: '2026-04-07T16:30:00Z' },
    ],
  },
  {
    id: 'ctx-philosophy',
    name: 'Philosophy',
    emoji: '🌊',
    threads: [
      { id: 'thr-freewill', name: 'Free Will Debate', contextId: 'ctx-philosophy', lastMessageAt: '2026-04-06T22:00:00Z' },
    ],
  },
  {
    id: 'ctx-project',
    name: 'Project Alpha',
    emoji: '📂',
    threads: [
      { id: 'thr-alpha-main', name: 'Main Thread', contextId: 'ctx-project', lastMessageAt: '2026-04-08T09:00:00Z' },
    ],
  },
]

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    threadId: 'thr-okr',
    role: 'user',
    content: 'How do I set up a cron job in Hermes?',
    timestamp: '2026-04-08T14:41:00Z',
    status: 'sent',
  },
  {
    id: 'msg-2',
    threadId: 'thr-okr',
    role: 'assistant',
    content: 'You can use the `cron_scheduler` skill. Define a schedule with a standard cron expression.\n\n**Steps:**\n1. Enable the `cron` skill in your tools config\n2. Use the `/cron` command with an expression\n3. Attach a callback function\n\nThe scheduler supports standard 5-field cron syntax.',
    timestamp: '2026-04-08T14:41:15Z',
    status: 'sent',
  },
  {
    id: 'msg-3',
    threadId: 'thr-okr',
    role: 'user',
    content: 'Show me a Python example',
    timestamp: '2026-04-08T14:42:00Z',
    status: 'sent',
  },
  {
    id: 'msg-4',
    threadId: 'thr-okr',
    role: 'assistant',
    content: 'Here\'s an example:\n\n```python\nfrom hermes import cron\n\n@cron.schedule("*/5 * * * *")\ndef check_updates():\n    results = search_web("latest news")\n    return summarize(results)\n```\n\nThis runs `check_updates` every 5 minutes. The decorator registers it with the cron scheduler automatically.',
    timestamp: '2026-04-08T14:42:10Z',
    status: 'sent',
  },
]

export const mockSkills: Skill[] = [
  { id: 'skill-web', name: 'web_search', description: 'Search the web for information', enabled: true },
  { id: 'skill-code', name: 'code_exec', description: 'Execute code in sandbox', enabled: true },
  { id: 'skill-memory', name: 'memory', description: 'Persistent memory access', enabled: true },
  { id: 'skill-file', name: 'file_ops', description: 'File system operations', enabled: false },
  { id: 'skill-cron', name: 'cron', description: 'Scheduled task runner', enabled: true },
]
```

- [ ] **Step 3: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/data/mockData.ts
git commit -m "feat: add TypeScript interfaces and mock data"
```

---

### Task 3: Panel Collapse Hook

**Files:**
- Create: `src/hooks/usePanelCollapse.ts`

- [ ] **Step 1: Implement the hook**

Create `src/hooks/usePanelCollapse.ts`:

```ts
import { useState, useCallback } from 'react'

interface PanelCollapseState {
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  toggleSidebar: () => void
  toggleInspector: () => void
}

export function usePanelCollapse(): PanelCollapseState {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), [])
  const toggleInspector = useCallback(() => setInspectorCollapsed(prev => !prev), [])

  return { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePanelCollapse.ts
git commit -m "feat: add panel collapse state hook"
```

---

### Task 4: Workspace State Hook

**Files:**
- Create: `src/hooks/useWorkspace.ts`

- [ ] **Step 1: Implement the hook**

Create `src/hooks/useWorkspace.ts`:

```ts
import { useState, useCallback, useMemo } from 'react'
import type { Context, Thread } from '../types'
import { mockContexts } from '../data/mockData'

interface WorkspaceState {
  contexts: Context[]
  expandedContextIds: Set<string>
  activeThreadId: string | null
  activeThread: Thread | null
  activeContext: Context | null
  toggleContextExpanded: (contextId: string) => void
  setActiveThread: (threadId: string) => void
  filterQuery: string
  setFilterQuery: (query: string) => void
  filteredContexts: Context[]
}

export function useWorkspace(): WorkspaceState {
  const [contexts] = useState<Context[]>(mockContexts)
  const [expandedContextIds, setExpandedContextIds] = useState<Set<string>>(
    new Set(['ctx-workplace'])
  )
  const [activeThreadId, setActiveThreadId] = useState<string | null>('thr-okr')
  const [filterQuery, setFilterQuery] = useState('')

  const toggleContextExpanded = useCallback((contextId: string) => {
    setExpandedContextIds(prev => {
      const next = new Set(prev)
      if (next.has(contextId)) {
        next.delete(contextId)
      } else {
        next.add(contextId)
      }
      return next
    })
  }, [])

  const setActiveThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId)
    // Auto-expand the parent context
    const parentContext = mockContexts.find(ctx =>
      ctx.threads.some(t => t.id === threadId)
    )
    if (parentContext) {
      setExpandedContextIds(prev => {
        const next = new Set(prev)
        next.add(parentContext.id)
        return next
      })
    }
  }, [])

  const activeThread = useMemo(() => {
    for (const ctx of contexts) {
      const thread = ctx.threads.find(t => t.id === activeThreadId)
      if (thread) return thread
    }
    return null
  }, [contexts, activeThreadId])

  const activeContext = useMemo(() => {
    if (!activeThread) return null
    return contexts.find(ctx => ctx.id === activeThread.contextId) ?? null
  }, [contexts, activeThread])

  const filteredContexts = useMemo(() => {
    if (!filterQuery.trim()) return contexts
    const q = filterQuery.toLowerCase()
    return contexts
      .map(ctx => {
        const nameMatch = ctx.name.toLowerCase().includes(q)
        const matchingThreads = ctx.threads.filter(t =>
          t.name.toLowerCase().includes(q)
        )
        if (nameMatch) return ctx
        if (matchingThreads.length > 0) return { ...ctx, threads: matchingThreads }
        return null
      })
      .filter((ctx): ctx is Context => ctx !== null)
  }, [contexts, filterQuery])

  return {
    contexts,
    expandedContextIds,
    activeThreadId,
    activeThread,
    activeContext,
    toggleContextExpanded,
    setActiveThread,
    filterQuery,
    setFilterQuery,
    filteredContexts,
  }
}
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWorkspace.ts
git commit -m "feat: add workspace state hook with context/thread selection and filtering"
```

---

### Task 5: AppShell — 3-Pane Layout

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create AppShell component**

Create `src/components/layout/AppShell.tsx`:

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AppShellProps {
  sidebar: React.ReactNode
  main: React.ReactNode
  inspector: React.ReactNode
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
```

- [ ] **Step 2: Wire AppShell into App.tsx**

Replace `src/App.tsx`:

```tsx
import { AppShell } from './components/layout/AppShell'
import { usePanelCollapse } from './hooks/usePanelCollapse'

export default function App() {
  const { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector } =
    usePanelCollapse()

  return (
    <AppShell
      sidebarCollapsed={sidebarCollapsed}
      inspectorCollapsed={inspectorCollapsed}
      onToggleSidebar={toggleSidebar}
      onToggleInspector={toggleInspector}
      sidebar={
        <div className="h-full bg-[#18181b] border-r border-zinc-800 p-3 text-zinc-500 text-sm">
          Sidebar placeholder
        </div>
      }
      main={
        <div className="h-full bg-[#0a0a0b] border-x border-zinc-800 flex items-center justify-center text-zinc-500 text-sm">
          Chat Stage placeholder
        </div>
      }
      inspector={
        <div className="h-full bg-[#18181b] border-l border-zinc-800 p-3 text-zinc-500 text-sm">
          Inspector placeholder
        </div>
      }
    />
  )
}
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev` if not running. Check:
- Three panels visible with dark backgrounds
- Left/right chevron strips between panels
- Clicking chevrons collapses/expands panels with smooth 200ms transition
- Collapsed panels show as 6px strips
- Chat stage fills remaining space

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppShell.tsx src/App.tsx
git commit -m "feat: add 3-pane AppShell layout with collapsible panels"
```

---

### Task 6: AgentStatus Component

**Files:**
- Create: `src/components/sidebar/AgentStatus.tsx`

- [ ] **Step 1: Implement AgentStatus**

Create `src/components/sidebar/AgentStatus.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sidebar/AgentStatus.tsx
git commit -m "feat: add AgentStatus component with status dot"
```

---

### Task 7: SearchInput Component

**Files:**
- Create: `src/components/sidebar/SearchInput.tsx`

- [ ] **Step 1: Implement SearchInput**

Create `src/components/sidebar/SearchInput.tsx`:

```tsx
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <div className="relative mb-2.5">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 placeholder-zinc-500 pl-7 pr-2 py-1.5 outline-none focus:border-zinc-600 transition-colors"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sidebar/SearchInput.tsx
git commit -m "feat: add SearchInput component"
```

---

### Task 8: ThreadItem and ContextItem Components

**Files:**
- Create: `src/components/sidebar/ThreadItem.tsx`, `src/components/sidebar/ContextItem.tsx`

- [ ] **Step 1: Implement ThreadItem**

Create `src/components/sidebar/ThreadItem.tsx`:

```tsx
import type { Thread } from '../../types'

interface ThreadItemProps {
  thread: Thread
  isActive: boolean
  onClick: () => void
}

export function ThreadItem({ thread, isActive, onClick }: ThreadItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors ${
        isActive
          ? 'bg-zinc-800 text-white border-l-2 border-blue-500 pl-2'
          : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      {thread.name}
    </button>
  )
}
```

- [ ] **Step 2: Implement ContextItem**

Create `src/components/sidebar/ContextItem.tsx`:

```tsx
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { Context } from '../../types'
import { ThreadItem } from './ThreadItem'

interface ContextItemProps {
  context: Context
  isExpanded: boolean
  activeThreadId: string | null
  onToggleExpand: () => void
  onSelectThread: (threadId: string) => void
}

export function ContextItem({
  context,
  isExpanded,
  activeThreadId,
  onToggleExpand,
  onSelectThread,
}: ContextItemProps) {
  return (
    <div className="mb-0.5">
      {/* Context header row */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-zinc-300 hover:bg-zinc-800/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0" />
        )}
        <span>{context.emoji}</span>
        <span className="truncate">{context.name}</span>
        {!isExpanded && (
          <span className="ml-auto bg-zinc-800 rounded text-[10px] text-zinc-500 px-1.5 py-0.5 shrink-0">
            {context.threads.length}
          </span>
        )}
      </button>

      {/* Thread children */}
      {isExpanded && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
          {context.threads.map(thread => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onClick={() => onSelectThread(thread.id)}
            />
          ))}
          <button className="w-full text-left rounded px-2.5 py-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
            <Plus className="h-2.5 w-2.5 inline mr-1" />
            New Thread
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar/ThreadItem.tsx src/components/sidebar/ContextItem.tsx
git commit -m "feat: add ThreadItem and ContextItem tree components"
```

---

### Task 9: ContextTree Component

**Files:**
- Create: `src/components/sidebar/ContextTree.tsx`

- [ ] **Step 1: Implement ContextTree**

Create `src/components/sidebar/ContextTree.tsx`:

```tsx
import type { Context } from '../../types'
import { ContextItem } from './ContextItem'

interface ContextTreeProps {
  contexts: Context[]
  expandedContextIds: Set<string>
  activeThreadId: string | null
  onToggleContextExpanded: (contextId: string) => void
  onSelectThread: (threadId: string) => void
}

export function ContextTree({
  contexts,
  expandedContextIds,
  activeThreadId,
  onToggleContextExpanded,
  onSelectThread,
}: ContextTreeProps) {
  if (contexts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-600">
        No matching contexts
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {contexts.map(context => (
        <ContextItem
          key={context.id}
          context={context}
          isExpanded={expandedContextIds.has(context.id)}
          activeThreadId={activeThreadId}
          onToggleExpand={() => onToggleContextExpanded(context.id)}
          onSelectThread={onSelectThread}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sidebar/ContextTree.tsx
git commit -m "feat: add ContextTree component"
```

---

### Task 10: Sidebar Component

**Files:**
- Create: `src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Implement Sidebar**

Create `src/components/sidebar/Sidebar.tsx`:

```tsx
import { Plus, Settings } from 'lucide-react'
import type { AgentStatus as AgentStatusType, Context } from '../../types'
import { AgentStatus } from './AgentStatus'
import { SearchInput } from './SearchInput'
import { ContextTree } from './ContextTree'

interface SidebarProps {
  agentStatus: AgentStatusType
  contexts: Context[]
  expandedContextIds: Set<string>
  activeThreadId: string | null
  filterQuery: string
  onFilterQueryChange: (query: string) => void
  onToggleContextExpanded: (contextId: string) => void
  onSelectThread: (threadId: string) => void
}

export function Sidebar({
  agentStatus,
  contexts,
  expandedContextIds,
  activeThreadId,
  filterQuery,
  onFilterQueryChange,
  onToggleContextExpanded,
  onSelectThread,
}: SidebarProps) {
  return (
    <div className="h-full bg-[#18181b] rounded-lg border border-zinc-800 p-3 flex flex-col">
      <AgentStatus status={agentStatus} />

      <SearchInput
        value={filterQuery}
        onChange={onFilterQueryChange}
        placeholder="Search contexts..."
      />

      <ContextTree
        contexts={contexts}
        expandedContextIds={expandedContextIds}
        activeThreadId={activeThreadId}
        onToggleContextExpanded={onToggleContextExpanded}
        onSelectThread={onSelectThread}
      />

      {/* Bottom bar */}
      <div className="flex gap-1.5 mt-2 pt-2 border-t border-zinc-800">
        <button className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded py-1.5 text-xs text-zinc-400 transition-colors">
          <Plus className="h-3 w-3" />
          New Context
        </button>
        <button
          className="w-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-500 transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sidebar/Sidebar.tsx
git commit -m "feat: add Sidebar composite component"
```

---

### Task 11: ChatStage Placeholder

**Files:**
- Create: `src/components/chat/ChatStage.tsx`

- [ ] **Step 1: Implement ChatStage with top bar breadcrumb**

Create `src/components/chat/ChatStage.tsx`:

```tsx
import type { Context, Thread } from '../../types'

interface ChatStageProps {
  activeContext: Context | null
  activeThread: Thread | null
}

export function ChatStage({ activeContext, activeThread }: ChatStageProps) {
  return (
    <div className="h-full bg-[#0a0a0b] rounded-lg border border-zinc-800 flex flex-col">
      {/* Top bar */}
      <div className="px-4 py-3 border-b border-zinc-800">
        {activeContext && activeThread ? (
          <div className="flex items-center gap-2 text-sm">
            <span>{activeContext.emoji}</span>
            <span className="text-zinc-400">{activeContext.name}</span>
            <span className="text-zinc-600">/</span>
            <span className="font-medium text-white">{activeThread.name}</span>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">Select a thread</div>
        )}
      </div>

      {/* Placeholder content */}
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        {activeThread
          ? 'Chat messages will appear here (Phase 2)'
          : 'Select a context and thread to begin'}
      </div>

      {/* Input placeholder */}
      <div className="px-4 pb-4">
        <div className="bg-[#18181b] border border-zinc-800 rounded-md px-3 py-2.5 text-xs text-zinc-600">
          Type a message... (Phase 2)
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/ChatStage.tsx
git commit -m "feat: add ChatStage placeholder with breadcrumb top bar"
```

---

### Task 12: Inspector Placeholder

**Files:**
- Create: `src/components/inspector/Inspector.tsx`

- [ ] **Step 1: Implement Inspector with tab bar**

Create `src/components/inspector/Inspector.tsx`:

```tsx
import { useState } from 'react'
import type { Skill } from '../../types'

const tabs = ['Skills', 'Files', 'Mind'] as const
type Tab = (typeof tabs)[number]

interface InspectorProps {
  skills: Skill[]
  onToggleSkill: (skillId: string) => void
}

export function Inspector({ skills, onToggleSkill }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Skills')

  return (
    <div className="h-full bg-[#18181b] rounded-lg border border-zinc-800 p-3 flex flex-col">
      {/* Tab bar */}
      <div className="flex gap-0.5 bg-zinc-800 rounded p-0.5 mb-3">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded text-xs py-1.5 text-center transition-colors ${
              activeTab === tab
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'Skills' && (
          <div className="flex flex-col gap-1.5">
            {skills.map(skill => (
              <div key={skill.id} className="bg-zinc-800 rounded px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-200 font-mono">{skill.name}</span>
                  <button
                    onClick={() => onToggleSkill(skill.id)}
                    className={`rounded text-[10px] font-semibold px-1.5 py-0.5 transition-colors ${
                      skill.enabled
                        ? 'bg-green-500 text-zinc-900'
                        : 'bg-[#7f1d1d] text-white'
                    }`}
                  >
                    {skill.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="text-[10px] text-zinc-500">{skill.description}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Files' && (
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 py-12">
            No active files
          </div>
        )}

        {activeTab === 'Mind' && (
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 py-12">
            Reasoning steps will appear here
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inspector/Inspector.tsx
git commit -m "feat: add Inspector panel with Skills/Files/Mind tabs"
```

---

### Task 13: Wire Everything into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Connect all components**

Replace `src/App.tsx`:

```tsx
import { useState, useCallback } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatStage } from './components/chat/ChatStage'
import { Inspector } from './components/inspector/Inspector'
import { usePanelCollapse } from './hooks/usePanelCollapse'
import { useWorkspace } from './hooks/useWorkspace'
import { mockSkills } from './data/mockData'
import type { Skill } from './types'

export default function App() {
  const { sidebarCollapsed, inspectorCollapsed, toggleSidebar, toggleInspector } =
    usePanelCollapse()
  const {
    expandedContextIds,
    activeThreadId,
    activeThread,
    activeContext,
    toggleContextExpanded,
    setActiveThread,
    filterQuery,
    setFilterQuery,
    filteredContexts,
  } = useWorkspace()

  const [skills, setSkills] = useState<Skill[]>(mockSkills)

  const handleToggleSkill = useCallback((skillId: string) => {
    setSkills(prev =>
      prev.map(s => (s.id === skillId ? { ...s, enabled: !s.enabled } : s))
    )
  }, [])

  return (
    <AppShell
      sidebarCollapsed={sidebarCollapsed}
      inspectorCollapsed={inspectorCollapsed}
      onToggleSidebar={toggleSidebar}
      onToggleInspector={toggleInspector}
      sidebar={
        <Sidebar
          agentStatus="online"
          contexts={filteredContexts}
          expandedContextIds={expandedContextIds}
          activeThreadId={activeThreadId}
          filterQuery={filterQuery}
          onFilterQueryChange={setFilterQuery}
          onToggleContextExpanded={toggleContextExpanded}
          onSelectThread={setActiveThread}
        />
      }
      main={
        <ChatStage
          activeContext={activeContext}
          activeThread={activeThread}
        />
      }
      inspector={
        <Inspector
          skills={skills}
          onToggleSkill={handleToggleSkill}
        />
      }
    />
  )
}
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Check all of:
- Sidebar shows "Echo" with green status dot
- Search input filters contexts and threads
- Context tree expands/collapses with chevron + thread count badge
- Clicking a thread highlights it (blue left border) and updates the top bar breadcrumb
- Inspector shows Skills tab with ON/OFF toggles that switch state on click
- Files and Mind tabs show placeholder text
- Both side panels collapse to 6px hairline chevron strips with smooth animation
- Settings gear icon visible at bottom of sidebar

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire all Phase 1 components into App shell"
```

---

### Task 14: Final Polish and Build Verification

**Files:**
- Modify: none (verification only)

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors. Output in `dist/`.

- [ ] **Step 2: Preview production build**

```bash
npm run preview
```

Expected: Production build renders identically to dev server.

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Add .gitignore entries**

Verify `.gitignore` includes (Vite template should have these, but confirm):
```
node_modules
dist
.superpowers
```

If `.superpowers` is missing, append it:
```bash
echo ".superpowers" >> .gitignore
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify build and add .superpowers to gitignore"
```

---

## Phase 1 Complete — Stop for Review

At this point the app should have:
- 3-pane layout with smooth collapsible panels (hairline chevron strips)
- Sidebar: agent status, search, collapsible context/thread tree, new context button, settings gear
- Chat stage: breadcrumb top bar showing active context/thread, placeholder for messages
- Inspector: Skills tab with working ON/OFF toggles, Files/Mind placeholder tabs
- Context switching: clicking any thread updates the breadcrumb and highlights the active thread

**Do not proceed to Phase 2 (chat messages, markdown rendering, input area, typing indicator) until the user has reviewed this shell.**
