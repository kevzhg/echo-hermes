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

export async function renameThread(threadId: string, name: string): Promise<void> {
  await db.threads.update(threadId, { name })
}

export async function setThreadSessionId(threadId: string, hermesSessionId: string | undefined): Promise<void> {
  await db.threads.update(threadId, { hermesSessionId: hermesSessionId || undefined })
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

      // Remove stale skills not in Hermes anymore
      for (const existing of existingSkills) {
        if (!incomingNames.has(existing.name)) {
          await db.skills.delete(existing.id)
        }
      }
    })
  } catch {
    // Bridge not running — keep existing skills
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
