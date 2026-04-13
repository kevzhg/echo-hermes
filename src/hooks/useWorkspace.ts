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
  setActiveThread: (threadId: string) => void
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

  const [expandedContextIds, setExpandedContextIds] = useState<Set<string>>(
    new Set(['ctx-workplace'])
  )
  const [activeThreadId, setActiveThreadId] = useState<string | null>('thr-okr')
  const [filterQuery, setFilterQuery] = useState('')

  const toggleContextExpanded = useCallback((contextId: string) => {
    setExpandedContextIds(prev => {
      const next = new Set(prev)
      if (next.has(contextId)) {
        next.delete(contextId)
      } else {
        next.add(contextId)
      }
      return next
    })
  }, [])

  const setActiveThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId)
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
