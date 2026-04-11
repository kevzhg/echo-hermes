import { db } from './index'

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
  await db.threads.add({
    id,
    contextId,
    name,
    lastMessageAt: new Date().toISOString(),
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

export async function toggleSkill(skillId: string): Promise<void> {
  const skill = await db.skills.get(skillId)
  if (skill) {
    await db.skills.update(skillId, { enabled: !skill.enabled })
  }
}
