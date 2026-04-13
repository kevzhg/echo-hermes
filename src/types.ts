export interface Thread {
  id: string
  name: string
  contextId: string
  lastMessageAt: string
  hermesSessionId?: string
  order: number
  favorite: boolean
}

export interface Context {
  id: string
  name: string
  emoji: string
  order: number
}

export type ContextWithThreads = Context & { threads: Thread[] }

export interface Message {
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

export interface Skill {
  id: string
  name: string
  category: string
  source: string
  pinned: boolean
  active: boolean
  favorite: boolean
}

export interface SkillCategory {
  category: string
  skills: { name: string; source: string }[]
}

export type AgentStatus = 'online' | 'thinking' | 'offline'
