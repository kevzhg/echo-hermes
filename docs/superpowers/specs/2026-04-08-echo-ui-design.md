# Echo — AI Agent Workspace UI

**Date:** 2026-04-08
**Status:** Approved
**Scope:** Frontend UI shell with mocked data. No Hermes integration yet.

## Overview

Echo is a web-based workspace UI for interacting with a Hermes AI agent. It provides chat, context/thread management, and skills/tools inspection in a premium dark-mode 3-pane layout.

## Design Language: "Command Center"

- **Palette:** Deep dark grays (`#09090b` viewport, `#18181b` panels), white text (`#fafafa`), subtle borders (`#27272a`). No gradients.
- **Typography:** Inter / system-ui. Clean hierarchy.
- **Radius:** 6px (panels, cards), 4px (inputs, badges).
- **Animations:** CSS `transition: width 200ms ease-in-out`. No Framer Motion unless message entry animations justify it later.
- **Timestamps:** `#52525b`, 8px gap below bubbles.
- **OFF badges:** Muted red (`#7f1d1d`) to avoid drawing more attention than ON badges.
- **Search placeholder:** Slightly brighter than panel background for contrast.

## Tech Stack

- React + Vite + TypeScript (strict)
- Tailwind CSS v4
- Lucide React (icons)
- `react-markdown` + `react-syntax-highlighter` (code blocks in chat)
- No Framer Motion (CSS transitions for panel collapse)

## Architecture

### Layout Shell — Fixed 3-Pane

```
[Sidebar 260px] [Chevron 6px] [Chat flex-1] [Chevron 6px] [Inspector 280px]
```

- **Viewport:** `#09090b`, full height, flex row.
- **Panels collapse** to a 6px hairline chevron strip (not 0px). `overflow: hidden` on panel content. CSS `transition: width 200ms ease-in-out`.
- **Chevron strips** are the only collapse/expand controls. No redundant buttons in the top bar.

### Left Sidebar (260px)

From top to bottom:

1. **Agent Status** — "Echo" label + avatar + status dot:
   - Green: online/idle
   - Amber: thinking/processing
   - Red: offline/error
2. **Search Input** — fuzzy filter for contexts and threads. Visible when 5+ items exist, always rendered.
3. **Context > Thread Tree** (collapsible tree pattern):
   - **Contexts** are top-level items with emoji + name. Click chevron to expand/collapse.
   - **Threads** are indented children. Active thread: `#27272a` bg + `2px solid #3b82f6` left border.
   - Collapsed contexts show a thread count badge.
   - Each expanded context has a `+ New Thread` button at the bottom of its children.
4. **Bottom Bar** — `+ New Context` button + settings gear icon (placeholder).

**Data model:**
```ts
interface Context {
  id: string;
  name: string;
  emoji: string;
  threads: Thread[];
  isExpanded: boolean;
}

interface Thread {
  id: string;
  name: string;
  contextId: string;
  messages: Message[];
  lastMessageAt: string;
}
```

### Main Stage (flex-1)

**Top Bar:**
- Context emoji + name, then `>` breadcrumb, then thread name.
- No collapse buttons (chevron strips handle that).

**Chat Stream:**
- Scrollable message list, auto-scroll to bottom on new messages.
- **User messages:** right-aligned, `#27272a` bg, rounded 6px.
- **Echo messages:** left-aligned, `#18181b` bg, `1px solid #27272a` border, rounded 6px.
- **Markdown rendering:** headers, lists, bold, inline code, fenced code blocks with syntax highlighting.
- **Timestamps:** `#52525b`, 7px font-size, 8px below each bubble.
- **Typing indicator:** Three amber dots with pulsing opacity animation. Shown when Echo is "processing." Agent status dot also turns amber.

**Data model:**
```ts
interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string; // markdown
  timestamp: string; // ISO 8601
  status: 'sent' | 'streaming' | 'error';
}
```

**Input Area (fixed bottom):**
- `<textarea>` with auto-expanding height (min 1 row, max 6 rows).
- Left: paperclip icon (attachment placeholder, non-functional in mock).
- Right: send arrow, enabled when input is non-empty. `#3b82f6` when active, `#3f3f46` when disabled.
- Enter to send, Shift+Enter for newline.

### Right Inspector (280px)

Tabbed panel with segmented control:

1. **Skills tab** (default):
   - List of skills with: name, one-line description, ON/OFF toggle.
   - ON badge: `#22c55e` bg, dark text.
   - OFF badge: `#7f1d1d` bg, white text (muted).
   - Toggle is a clickable badge (switches state in mock).
   - Data model: `{ id: string; name: string; description: string; enabled: boolean }`
   - Mock skills: `web_search`, `code_exec`, `memory`, `file_ops`, `cron_scheduler`.

2. **Files tab:**
   - Placeholder: "No active files" empty state.
   - Future: shows attachments and files referenced in conversation.

3. **Mind tab:**
   - Placeholder: "Reasoning steps will appear here."
   - Future: shows agent's chain-of-thought / tool call trace.

## Mock Data

One pre-populated context ("Workplace") with a thread ("Q2 OKR Planning") containing a 5-message conversation:

1. User: "How do I set up a cron job in Hermes?"
2. Echo: Markdown explanation with inline code.
3. User: "Show me a Python example"
4. Echo: Fenced Python code block with syntax highlighting.
5. Typing indicator (amber dots) — demonstrates the processing state.

Additional empty contexts: Tech (2 threads), Philosophy (1 thread), Project Alpha (1 thread).

## Component Breakdown

```
src/
  components/
    layout/
      AppShell.tsx          — 3-pane flex container + chevron strips
      Sidebar.tsx           — agent status + tree + bottom bar
      Inspector.tsx         — tabbed right panel
    sidebar/
      AgentStatus.tsx       — avatar + name + status dot
      ContextTree.tsx       — collapsible context > thread tree
      ContextItem.tsx       — single context row (expand/collapse)
      ThreadItem.tsx        — single thread row
      SearchInput.tsx       — fuzzy filter
    chat/
      ChatStage.tsx         — top bar + message list + input
      MessageList.tsx       — scrollable message container
      MessageBubble.tsx     — single message (user or assistant)
      TypingIndicator.tsx   — amber pulsing dots
      ChatInput.tsx         — textarea + attachment + send
    inspector/
      SkillsTab.tsx         — skill list with toggles
      FilesTab.tsx          — placeholder
      MindTab.tsx           — placeholder
      TabBar.tsx            — segmented control
  data/
    mockData.ts             — contexts, threads, messages, skills
  hooks/
    useActiveThread.ts      — current context + thread selection state
    usePanelCollapse.ts     — sidebar/inspector collapse state
  App.tsx
  main.tsx
```

## Implementation Scope

**Phase 1 (stop for review):**
1. Scaffold: Vite + React + TypeScript + Tailwind
2. Layout shell: 3-pane with collapsible panels + chevron strips
3. Sidebar: agent status + context/thread tree + search + settings gear
4. Context switching: clicking a thread updates the top bar title

**Phase 2 (after review):**
5. Chat component: message list + markdown rendering + code blocks
6. Input component: auto-expanding textarea + send
7. Typing indicator
8. Right inspector: skills tab with toggles, files/mind placeholders

## Non-Goals (This Phase)

- No Hermes backend integration
- No real WebSocket/API connections
- No authentication
- No persistence (state resets on reload)
- No mobile responsiveness (1440px+ target)
- No drag-and-drop file upload (placeholder only)
