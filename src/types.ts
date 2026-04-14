export interface Thread {
  id: string
  name: string
  contextId: string
  lastMessageAt: string
  hermesSessionId?: string
  model?: string
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

export interface KnownModel {
  name: string
  lastUsedAt: string
  useCount: number
}

export interface ToolCall {
  id: string
  name: string
  arguments?: string
  result?: string
  status: 'running' | 'complete' | 'error'
  timestamp: string
}

export interface Message {
  id: string
  threadId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  status: 'sent' | 'streaming' | 'error'
  durationMs?: number
  tokenUsage?: { input_tokens: number; output_tokens: number; cache_read_tokens?: number }
  toolCalls?: ToolCall[]
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
