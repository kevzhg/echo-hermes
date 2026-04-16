import { useState, useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Context, Thread, ContextWithThreads } from '../types'
import { db } from '../db/index'
import { createContext, createThread, deleteContext, deleteThread } from '../db/operations'

interface WorkspaceState {
  expandedContextIds: Set<string>
  activeThreadId: string | null
  activeThread: Thread | null
  activeContext: Context | null
  toggleContextExpanded: (contextId: string) => void
  setActiveThread: (threadId: string | null) => void
  filterQuery: string
  setFilterQuery: (query: string) => void
  filteredContexts: ContextWithThreads[]
  createContext: (name: string, emoji: string) => Promise<string>
  createThread: (contextId: string, name: string) => Promise<string>
  deleteContext: (contextId: string) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
}

export function useWorkspace(): WorkspaceState {
  const rawContexts = useLiveQuery(() => db.contexts.orderBy('order').toArray()) ?? []
  const allThreads = useLiveQuery(() => db.threads.toArray()) ?? []

  // Restore expand/collapse + active thread from localStorage
  const [expandedContextIds, setExpandedContextIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('echo-expanded-contexts')
      if (saved) return new Set(JSON.parse(saved))
    } catch { /* ignore */ }
    return new Set()
  })
  const [initializedExpand, setInitializedExpand] = useState(false)

  // First load: if no saved state, expand all contexts
  if (!initializedExpand && rawContexts.length > 0) {
    if (expandedContextIds.size === 0) {
      const all = new Set(rawContexts.map(c => c.id))
      setExpandedContextIds(all)
      try { localStorage.setItem('echo-expanded-contexts', JSON.stringify([...all])) } catch { /* */ }
    }
    setInitializedExpand(true)
  }

  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('echo-active-thread') || null
    } catch { return null }
  })
  const [filterQuery, setFilterQuery] = useState('')

  const toggleContextExpanded = useCallback((contextId: string) => {
    setExpandedContextIds(prev => {
      const next = new Set(prev)
      if (next.has(contextId)) {
        next.delete(contextId)
      } else {
        next.add(contextId)
      }
      try { localStorage.setItem('echo-expanded-contexts', JSON.stringify([...next])) } catch { /* */ }
      return next
    })
  }, [])

  const setActiveThread = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId)
    try {
      if (threadId) localStorage.setItem('echo-active-thread', threadId)
      else localStorage.removeItem('echo-active-thread')
    } catch { /* */ }
    if (!threadId) return
    const parentThread = allThreads.find(t => t.id === threadId)
    if (parentThread) {
      setExpandedContextIds(prev => {
        const next = new Set(prev)
        next.add(parentThread.contextId)
        return next
      })
    }
  }, [allThreads])

  const activeThread = useMemo(() => {
    return allThreads.find(t => t.id === activeThreadId) ?? null
  }, [allThreads, activeThreadId])

  const activeContext = useMemo(() => {
    if (!activeThread) return null
    return rawContexts.find(ctx => ctx.id === activeThread.contextId) ?? null
  }, [rawContexts, activeThread])

  // Join contexts + threads, then filter
  const filteredContexts = useMemo((): ContextWithThreads[] => {
    const joined: ContextWithThreads[] = rawContexts.map(ctx => ({
      ...ctx,
      threads: allThreads.filter(t => t.contextId === ctx.id).sort((a, b) => a.order - b.order),
    }))

    if (!filterQuery.trim()) return joined

    const q = filterQuery.toLowerCase()
    return joined
      .map(ctx => {
        const nameMatch = ctx.name.toLowerCase().includes(q)
        const matchingThreads = ctx.threads.filter(t =>
          t.name.toLowerCase().includes(q)
        )
        if (nameMatch) return ctx
        if (matchingThreads.length > 0) return { ...ctx, threads: matchingThreads }
        return null
      })
      .filter((ctx): ctx is ContextWithThreads => ctx !== null)
  }, [rawContexts, allThreads, filterQuery])

  return {
    expandedContextIds,
    activeThreadId,
    activeThread,
    activeContext,
    toggleContextExpanded,
    setActiveThread,
    filterQuery,
    setFilterQuery,
    filteredContexts,
    createContext,
    createThread,
    deleteContext,
    deleteThread,
  }
}
