# Echo Phase 3 — Persistence + State Management

**Date:** 2026-04-10
**Status:** Approved
**Scope:** Replace mock data with IndexedDB persistence via Dexie.js. Working CRUD for contexts, threads, messages, skills. Inline creation UI.

## Overview

Move from hardcoded mock data to persistent IndexedDB storage. Components auto-update via Dexie's `useLiveQuery`. New Context and New Thread buttons become functional with inline input UX.

## New Dependency

- `dexie` — IndexedDB wrapper with typed schemas and reactive queries (~16KB gzipped)

## Database Schema

```ts
import Dexie, { type EntityTable } from 'dexie'

interface DbContext {
  id: string
  name: string
  emoji: string
  order: number
}

interface DbThread {
  id: string
  contextId: string
  name: string
  lastMessageAt: string
}

interface DbMessage {
  id: string
  threadId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  status: 'sent' | 'streaming' | 'error'
  kairos?: {
    context: string
    emoji: string
    selfInitiated: boolean
  }
}

interface DbSkill {
  id: string
  name: string
  description: string
  enabled: boolean
}
```

**Dexie table definitions:**

```ts
db.version(1).stores({
  contexts: 'id, order',
  threads:  'id, contextId, lastMessageAt',
  messages: 'id, threadId, timestamp',
  skills:   'id',
})
```

Indexed fields: `threads.contextId` (lookup threads by context), `messages.threadId` (lookup messages by thread), `messages.timestamp` (sort order).

## Seeding

On app init, check `db.contexts.count() === 0`. If empty, seed all 4 tables from current mock data. This runs once — after that, mock data is ignored.

Seed data matches existing `mockData.ts` content: 4 contexts, 7 threads, 6 messages, 5 skills. Contexts get sequential `order` values (0, 1, 2, 3).

## State Management Changes

### useWorkspace.ts (refactor)

Replace `useState<Context[]>(mockContexts)` with Dexie live queries:

```ts
const contexts = useLiveQuery(() => db.contexts.orderBy('order').toArray())
const threads = useLiveQuery(() => db.threads.toArray())
```

Derive `filteredContexts` by joining contexts + threads in a `useMemo`. `expandedContextIds` and `activeThreadId` remain local React state (UI-only).

The hook now returns CRUD functions alongside query results:
- `createContext(name: string, emoji: string): Promise<string>`
- `createThread(contextId: string, name: string): Promise<string>`
- `deleteContext(contextId: string): Promise<void>`
- `deleteThread(threadId: string): Promise<void>`

### App.tsx (refactor)

Messages and skills come from Dexie:

```ts
const activeMessages = useLiveQuery(
  () => activeThreadId
    ? db.messages.where('threadId').equals(activeThreadId).sortBy('timestamp')
    : [],
  [activeThreadId]
)

const skills = useLiveQuery(() => db.skills.toArray())
```

`handleToggleSkill` writes to DB: `db.skills.update(id, { enabled: !current })`.

`handleSend` in ChatStage writes to DB: `db.messages.add(...)`.

### Remove mockData dependency

After seeding logic is in place, `mockData.ts` becomes the seed source only — imported by `db/index.ts`, not by hooks or App.tsx.

## CRUD Operations

### Create Context

```ts
async function createContext(name: string, emoji: string): Promise<string> {
  const id = crypto.randomUUID()
  const maxOrder = await db.contexts.orderBy('order').last()
  await db.contexts.add({
    id,
    name,
    emoji,
    order: (maxOrder?.order ?? -1) + 1,
  })
  return id
}
```

### Create Thread

```ts
async function createThread(contextId: string, name: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.threads.add({
    id,
    contextId,
    name,
    lastMessageAt: new Date().toISOString(),
  })
  return id
}
```

### Send Message

```ts
async function sendMessage(threadId: string, content: string): Promise<void> {
  await db.messages.add({
    id: crypto.randomUUID(),
    threadId,
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
    status: 'sent',
  })
  await db.threads.update(threadId, {
    lastMessageAt: new Date().toISOString(),
  })
}
```

### Delete Context (cascade)

```ts
async function deleteContext(contextId: string): Promise<void> {
  await db.transaction('rw', [db.contexts, db.threads, db.messages], async () => {
    const threads = await db.threads.where('contextId').equals(contextId).toArray()
    const threadIds = threads.map(t => t.id)
    await db.messages.where('threadId').anyOf(threadIds).delete()
    await db.threads.where('contextId').equals(contextId).delete()
    await db.contexts.delete(contextId)
  })
}
```

### Delete Thread (cascade)

```ts
async function deleteThread(threadId: string): Promise<void> {
  await db.transaction('rw', [db.threads, db.messages], async () => {
    await db.messages.where('threadId').equals(threadId).delete()
    await db.threads.delete(threadId)
  })
}
```

### Toggle Skill

```ts
async function toggleSkill(skillId: string): Promise<void> {
  const skill = await db.skills.get(skillId)
  if (skill) {
    await db.skills.update(skillId, { enabled: !skill.enabled })
  }
}
```

## Inline Creation UX

### New Context (Sidebar bottom)

1. Click "+ New Context" button → button replaced by inline input row
2. Input row: emoji picker (default "📁") + text input + Enter to create
3. Emoji picker: simple grid of 6-8 preset emojis (📁💼💻🌊📂🎯🔬📝), click to select
4. Enter creates context, Escape cancels, input auto-focuses
5. After creation, new context appears in tree (expanded, empty)

### New Thread (inside expanded context)

1. Click "+ New Thread" → replaced by text input
2. Enter creates thread, Escape cancels, auto-focuses
3. After creation, new thread selected as active, chat stage shows empty

Both use a simple `isCreating` boolean state pattern — no modals.

## Component Changes

### Sidebar.tsx

- Replace "+ New Context" button with inline creation toggle
- New local state: `isCreatingContext: boolean`
- Emoji selector component (simple grid, local state)

### ContextItem.tsx

- Replace "+ New Thread" button with inline creation toggle
- New local state: `isCreatingThread: boolean`

### ChatStage.tsx

- `handleSend` now calls `sendMessage()` DB function instead of just toggling typing state
- Still show typing indicator for 1.5s after send (mock Echo response)

### App.tsx

- Remove `useState<Skill[]>(mockSkills)` — skills from `useLiveQuery`
- Remove `mockMessages` import — messages from `useLiveQuery`
- Pass DB CRUD functions down or keep in hooks

## File Structure

```
src/
  db/
    index.ts              — NEW: Dexie DB definition, schema, seed logic
    operations.ts         — NEW: CRUD functions (create/delete/toggle)
  hooks/
    useWorkspace.ts       — MODIFY: useLiveQuery instead of useState
  components/
    sidebar/
      Sidebar.tsx         — MODIFY: inline context creation
      ContextItem.tsx     — MODIFY: inline thread creation
      InlineInput.tsx     — NEW: reusable inline input component
      EmojiPicker.tsx     — NEW: simple preset emoji grid
    chat/
      ChatStage.tsx       — MODIFY: send writes to DB
  data/
    mockData.ts           — KEEP: used as seed source only
  App.tsx                 — MODIFY: skills/messages from DB
  types.ts                — KEEP: no changes (DB types mirror app types)
```

## Non-Goals

- No sync between tabs (single-tab usage assumed)
- No undo/restore for deletes
- No context/thread reordering (order is creation order)
- No message editing or deletion by user
- No export/import of data
- No DB migration strategy beyond v1 (handle in Phase 4 if needed)
