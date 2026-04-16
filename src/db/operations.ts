import { db } from './index'
import type { Note } from '../types'

export async function createContext(name: string, emoji: string): Promise<string> {
  const id = crypto.randomUUID()
  const last = await db.contexts.orderBy('order').last()
  await db.contexts.add({
    id,
    name,
    emoji,
    order: (last?.order ?? -1) + 1,
  })
  return id
}

export async function createThread(contextId: string, name: string): Promise<string> {
  const id = crypto.randomUUID()
  const siblings = await db.threads.where('contextId').equals(contextId).toArray()
  const maxOrder = siblings.reduce((max, t) => Math.max(max, t.order ?? 0), -1)
  await db.threads.add({
    id,
    contextId,
    name,
    lastMessageAt: new Date().toISOString(),
    order: maxOrder + 1,
    favorite: false,
  })
  return id
}

export async function sendMessage(threadId: string, content: string): Promise<void> {
  const now = new Date().toISOString()
  await db.messages.add({
    id: crypto.randomUUID(),
    threadId,
    role: 'user',
    content,
    timestamp: now,
    status: 'sent',
  })
  await db.threads.update(threadId, { lastMessageAt: now })
}

export async function deleteContext(contextId: string): Promise<void> {
  await db.transaction('rw', [db.contexts, db.threads, db.messages], async () => {
    const threads = await db.threads.where('contextId').equals(contextId).toArray()
    const threadIds = threads.map(t => t.id)
    if (threadIds.length > 0) {
      await db.messages.where('threadId').anyOf(threadIds).delete()
    }
    await db.threads.where('contextId').equals(contextId).delete()
    await db.contexts.delete(contextId)
  })
}

export async function deleteThread(threadId: string): Promise<void> {
  await db.transaction('rw', [db.threads, db.messages], async () => {
    await db.messages.where('threadId').equals(threadId).delete()
    await db.threads.delete(threadId)
  })
}

export async function renameThread(threadId: string, name: string): Promise<void> {
  await db.threads.update(threadId, { name })
}

export async function setThreadSessionId(threadId: string, hermesSessionId: string | undefined): Promise<void> {
  await db.threads.update(threadId, { hermesSessionId: hermesSessionId || undefined })
}

export async function setThreadModel(threadId: string, model: string | undefined): Promise<void> {
  await db.threads.update(threadId, { model: model || undefined })
}

export async function recordKnownModel(name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  const now = new Date().toISOString()
  const existing = await db.knownModels.get(trimmed)
  if (existing) {
    await db.knownModels.update(trimmed, {
      lastUsedAt: now,
      useCount: (existing.useCount ?? 0) + 1,
    })
  } else {
    await db.knownModels.add({ name: trimmed, lastUsedAt: now, useCount: 1 })
  }
}

export async function deleteKnownModel(name: string): Promise<void> {
  await db.knownModels.delete(name)
}

export async function renameContext(contextId: string, name: string, emoji: string): Promise<void> {
  await db.contexts.update(contextId, { name, emoji })
}

export async function reorderContexts(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.contexts, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.contexts.update(orderedIds[i], { order: i })
    }
  })
}

export async function reorderThreads(_contextId: string, orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.threads, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.threads.update(orderedIds[i], { order: i })
    }
  })
}

export async function toggleThreadFavorite(threadId: string): Promise<void> {
  const thread = await db.threads.get(threadId)
  if (thread) {
    await db.threads.update(threadId, { favorite: !thread.favorite })
  }
}

export async function createStreamingMessage(threadId: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.messages.add({
    id,
    threadId,
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString(),
    status: 'streaming',
  })
  return id
}

export async function updateStreamingMessage(messageId: string, content: string): Promise<void> {
  await db.messages.update(messageId, { content, status: 'sent' })
}

export async function appendToStreamingMessage(messageId: string, chunk: string): Promise<void> {
  await db.messages.where('id').equals(messageId).modify(m => {
    m.content = (m.content ?? '') + chunk
  })
}

export async function finalizeStreamingMessage(messageId: string, durationMs?: number): Promise<void> {
  const patch: { status: 'sent'; durationMs?: number } = { status: 'sent' }
  if (typeof durationMs === 'number') patch.durationMs = durationMs
  await db.messages.update(messageId, patch)
}

export async function appendToolCall(
  messageId: string,
  tool: { id: string; name: string; arguments?: string; status: 'running' | 'complete' | 'error' },
): Promise<void> {
  await db.messages.where('id').equals(messageId).modify(m => {
    const existing = m.toolCalls ?? []
    // If already exists by id (e.g. duplicate event), skip
    if (existing.some(t => t.id === tool.id)) return
    existing.push({ ...tool, timestamp: new Date().toISOString() })
    m.toolCalls = existing
  })
}

export async function updateToolCall(
  messageId: string,
  toolId: string,
  patch: { status?: 'running' | 'complete' | 'error'; result?: string },
): Promise<void> {
  await db.messages.where('id').equals(messageId).modify(m => {
    const list = m.toolCalls ?? []
    const idx = list.findIndex(t => t.id === toolId)
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch }
    } else {
      // No matching tool exists yet — happens when result row arrives before assistant tool_calls row
      // Insert as standalone with the data we have
      list.push({
        id: toolId,
        name: 'tool',
        status: patch.status ?? 'complete',
        result: patch.result,
        timestamp: new Date().toISOString(),
      })
    }
    m.toolCalls = list
  })
}

export async function failStreamingMessage(messageId: string, error: string): Promise<void> {
  await db.messages.update(messageId, { content: error, status: 'error' })
}

export async function syncSkillsFromBridge(): Promise<void> {
  try {
    const res = await fetch('http://localhost:8000/api/skills')
    if (!res.ok) return

    const categories: { category: string; skills: { name: string; source: string }[] }[] = await res.json()

    const existingSkills = await db.skills.toArray()
    const existingByName = new Map(existingSkills.map(s => [s.name, s]))
    const incomingNames = new Set<string>()

    await db.transaction('rw', db.skills, async () => {
      for (const cat of categories) {
        for (const s of cat.skills) {
          incomingNames.add(s.name)
          const existing = existingByName.get(s.name)
          if (existing) {
            // Update category/source, keep pinned state
            await db.skills.update(existing.id, {
              category: cat.category,
              source: s.source,
            })
          } else {
            // New skill — default unpinned/inactive/unfavorited
            await db.skills.add({
              id: crypto.randomUUID(),
              name: s.name,
              category: cat.category,
              source: s.source,
              pinned: false,
              active: false,
              favorite: false,
            })
          }
        }
      }

      // Remove ANY skill not in Hermes list (including old mock data)
      for (const existing of existingSkills) {
        if (!incomingNames.has(existing.name)) {
          await db.skills.delete(existing.id)
        }
      }
    })
    console.log('[Echo] Skills synced:', incomingNames.size, 'skills from bridge')
  } catch (e) {
    console.warn('[Echo] Skills sync failed (bridge offline?):', e)
  }
}

export async function toggleSkillPin(skillId: string): Promise<void> {
  const skill = await db.skills.get(skillId)
  if (skill) {
    await db.skills.update(skillId, { pinned: !skill.pinned })
  }
}

export async function toggleSkillActive(skillId: string): Promise<void> {
  const skill = await db.skills.get(skillId)
  if (skill) {
    await db.skills.update(skillId, { active: !skill.active })
  }
}

export async function toggleSkillFavorite(skillId: string): Promise<void> {
  const skill = await db.skills.get(skillId)
  if (skill) {
    await db.skills.update(skillId, { favorite: !skill.favorite })
  }
}

export async function cloneSkill(skillId: string): Promise<void> {
  const skill = await db.skills.get(skillId)
  if (skill) {
    await db.skills.add({
      id: crypto.randomUUID(),
      name: `${skill.name} (Copy)`,
      category: skill.category,
      source: 'local',
      pinned: false,
      active: false,
      favorite: false,
    })
  }
}

export async function deleteSkill(skillId: string): Promise<void> {
  await db.skills.delete(skillId)
}

// --- Reminders ---

export async function createReminder(
  title: string, dueAt: string, threadId?: string, contextId?: string,
): Promise<string> {
  const id = crypto.randomUUID()
  await db.reminders.add({
    id, title, dueAt, threadId, contextId,
    completed: false,
    createdAt: new Date().toISOString(),
  })
  return id
}

export async function completeReminder(id: string): Promise<void> {
  await db.reminders.update(id, { completed: true })
}

export async function uncompleteReminder(id: string): Promise<void> {
  await db.reminders.update(id, { completed: false })
}

export async function deleteReminder(id: string): Promise<void> {
  await db.reminders.delete(id)
}

// --- Notes ---

export async function getNote(id: string): Promise<Note | undefined> {
  return db.notes.get(id)
}

export async function upsertNote(
  id: string,
  patch: Partial<Note> & { content?: string },
): Promise<void> {
  const now = new Date().toISOString()
  const existing = await db.notes.get(id)
  if (existing) {
    // Bump updatedAt whenever content changes; callers can override for syncedAt-only writes.
    const nextUpdatedAt =
      patch.content !== undefined && patch.content !== existing.content
        ? now
        : (patch.updatedAt ?? existing.updatedAt)
    await db.notes.update(id, { ...patch, updatedAt: nextUpdatedAt })
    return
  }
  await db.notes.add({
    id,
    content: patch.content ?? '',
    filePath: patch.filePath,
    syncedAt: patch.syncedAt,
    updatedAt: patch.updatedAt ?? now,
  })
}
