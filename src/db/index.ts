import Dexie, { type EntityTable } from 'dexie'
import type { Context, Thread, Message, Skill, KnownModel, Reminder } from '../types'

const db = new Dexie('EchoDB') as Dexie & {
  contexts: EntityTable<Context, 'id'>
  threads: EntityTable<Thread, 'id'>
  messages: EntityTable<Message, 'id'>
  skills: EntityTable<Skill, 'id'>
  knownModels: EntityTable<KnownModel, 'name'>
  reminders: EntityTable<Reminder, 'id'>
}

db.version(1).stores({
  contexts: 'id, order',
  threads: 'id, contextId, lastMessageAt',
  messages: 'id, threadId, timestamp',
  skills: 'id',
})

db.version(2).stores({
  contexts: 'id, order',
  threads: 'id, contextId, lastMessageAt',
  messages: 'id, threadId, timestamp',
  skills: 'id, category',
})

db.version(3).stores({
  contexts: 'id, order',
  threads: 'id, contextId, order',
  messages: 'id, threadId, timestamp',
  skills: 'id, category',
})

db.version(4).stores({
  contexts: 'id, order',
  threads: 'id, contextId, order',
  messages: 'id, threadId, timestamp',
  skills: 'id, category',
  knownModels: 'name, lastUsedAt',
})

db.version(5).stores({
  contexts: 'id, order',
  threads: 'id, contextId, order',
  messages: 'id, threadId, timestamp',
  skills: 'id, category',
  knownModels: 'name, lastUsedAt',
  reminders: 'id, dueAt, completed',
})

async function initDb(): Promise<void> {
  const count = await db.contexts.count()
  if (count > 0) return

  const { mockContexts, mockThreads, mockMessages, mockSkills } = await import('../data/mockData')

  await db.transaction('rw', [db.contexts, db.threads, db.messages, db.skills], async () => {
    await db.contexts.bulkAdd(mockContexts)
    await db.threads.bulkAdd(mockThreads)
    await db.messages.bulkAdd(mockMessages)
    await db.skills.bulkAdd(mockSkills)
  })
}

export { db, initDb }
