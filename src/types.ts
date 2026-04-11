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
  kairos?: {
    context: string
    emoji: string
    selfInitiated: boolean
  }
}

export interface Skill {
  id: string
  name: string
  description: string
  enabled: boolean
}

export type AgentStatus = 'online' | 'thinking' | 'offline'
