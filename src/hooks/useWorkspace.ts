import { useState, useCallback, useMemo } from 'react'
import type { Context, Thread } from '../types'
import { mockContexts } from '../data/mockData'

interface WorkspaceState {
  contexts: Context[]
  expandedContextIds: Set<string>
  activeThreadId: string | null
  activeThread: Thread | null
  activeContext: Context | null
  toggleContextExpanded: (contextId: string) => void
  setActiveThread: (threadId: string) => void
  filterQuery: string
  setFilterQuery: (query: string) => void
  filteredContexts: Context[]
}

export function useWorkspace(): WorkspaceState {
  const [contexts] = useState<Context[]>(mockContexts)
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
    const parentContext = mockContexts.find(ctx =>
      ctx.threads.some(t => t.id === threadId)
    )
    if (parentContext) {
      setExpandedContextIds(prev => {
        const next = new Set(prev)
        next.add(parentContext.id)
        return next
      })
    }
  }, [])

  const activeThread = useMemo(() => {
    for (const ctx of contexts) {
      const thread = ctx.threads.find(t => t.id === activeThreadId)
      if (thread) return thread
    }
    return null
  }, [contexts, activeThreadId])

  const activeContext = useMemo(() => {
    if (!activeThread) return null
    return contexts.find(ctx => ctx.id === activeThread.contextId) ?? null
  }, [contexts, activeThread])

  const filteredContexts = useMemo(() => {
    if (!filterQuery.trim()) return contexts
    const q = filterQuery.toLowerCase()
    return contexts
      .map(ctx => {
        const nameMatch = ctx.name.toLowerCase().includes(q)
        const matchingThreads = ctx.threads.filter(t =>
          t.name.toLowerCase().includes(q)
        )
        if (nameMatch) return ctx
        if (matchingThreads.length > 0) return { ...ctx, threads: matchingThreads }
        return null
      })
      .filter((ctx): ctx is Context => ctx !== null)
  }, [contexts, filterQuery])

  return {
    contexts,
    expandedContextIds,
    activeThreadId,
    activeThread,
    activeContext,
    toggleContextExpanded,
    setActiveThread,
    filterQuery,
    setFilterQuery,
    filteredContexts,
  }
}
