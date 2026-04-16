import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '../db/index'
import {
  sendMessage,
  createStreamingMessage,
  appendToStreamingMessage,
  updateStreamingMessage,
  finalizeStreamingMessage,
  failStreamingMessage,
  setThreadSessionId,
  setThreadModel,
  recordKnownModel,
  appendToolCall,
  updateToolCall,
} from '../db/operations'

const BRIDGE_URL = 'ws://localhost:8000/ws'
const BRIDGE_HTTP = 'http://localhost:8000'
const RECONNECT_BASE = 1000
const RECONNECT_MAX = 16000

interface HermesDBMessage {
  id: number
  role: string
  content: string
  timestamp: number | string
  toolName?: string
  toolCallId?: string
  toolCalls?: { name: string; arguments?: string }[]
  reasoning?: string
}

/**
 * Reconcile local streaming/connection-lost messages against Hermes session history.
 * Used on reconnect when the server reports no run is in flight — the last
 * assistant turn may have completed during the disconnect gap and been persisted
 * to the Hermes DB but never delivered over the (dead) WebSocket.
 */
async function hydrateFromSession(threadId: string, sessionId: string): Promise<void> {
  const candidates = await db.messages
    .where('threadId')
    .equals(threadId)
    .filter(m => m.status === 'streaming' || (m.status === 'error' && m.content === '[Connection lost]'))
    .sortBy('timestamp')
  if (candidates.length === 0) return

  let hermes: HermesDBMessage[]
  try {
    const res = await fetch(`${BRIDGE_HTTP}/api/sessions/${sessionId}/messages`)
    if (!res.ok) return
    hermes = await res.json()
  } catch (e) {
    console.warn('[Echo] hydrate fetch failed:', e)
    return
  }

  // Limit to the last turn: everything after the final user message.
  let lastUserIdx = -1
  for (let i = hermes.length - 1; i >= 0; i--) {
    if (hermes[i].role === 'user') { lastUserIdx = i; break }
  }
  const turn = lastUserIdx >= 0 ? hermes.slice(lastUserIdx + 1) : hermes

  // Find the final assistant reply + collect tool results keyed by tool name.
  let assistantContent = ''
  let toolCalls: { name: string; arguments?: string }[] = []
  for (let i = turn.length - 1; i >= 0; i--) {
    if (turn[i].role === 'assistant') {
      assistantContent = turn[i].content
      toolCalls = turn[i].toolCalls ?? []
      break
    }
  }
  const toolResults = new Map<string, string>()
  for (const m of turn) {
    if (m.role === 'tool' && m.toolName) {
      toolResults.set(m.toolName, m.content)
    }
  }

  // Replace the oldest orphan with the authoritative assistant turn.
  const target = candidates[0]
  if (!target.id) return
  if (assistantContent) {
    await updateStreamingMessage(target.id, assistantContent)
    await finalizeStreamingMessage(target.id)
    let seq = 0
    for (const tc of toolCalls) {
      const toolId = `hydrated_${Date.now()}_${seq++}`
      await appendToolCall(target.id, {
        id: toolId,
        name: tc.name,
        arguments: tc.arguments,
        status: 'complete',
      })
      const result = toolResults.get(tc.name)
      if (result) await updateToolCall(target.id, toolId, { status: 'complete', result })
    }
    console.log('[Echo] Hydrated orphan from Hermes session:', target.id)
  }

  // Any remaining orphans get the [Connection lost] marker.
  for (let i = assistantContent ? 1 : 0; i < candidates.length; i++) {
    const m = candidates[i]
    if (m.id && m.status === 'streaming') {
      await failStreamingMessage(m.id, '[Connection lost]')
    }
  }
}

export interface MindEvent {
  dbId: number
  role: string
  content: string
  timestamp: number
  toolName?: string
  toolCalls?: { name: string }[]
  reasoning?: string
}

interface HermesConnection {
  sendMessage: (content: string) => void
  isConnected: boolean
  mindEvents: MindEvent[]
}

export function useHermesConnection(threadId: string | null): HermesConnection {
  const [isConnected, setIsConnected] = useState(false)
  const [mindEvents, setMindEvents] = useState<MindEvent[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const currentMsgIdRef = useRef<string | null>(null)
  const reconnectDelayRef = useRef(RECONNECT_BASE)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closedIntentionallyRef = useRef(false)
  const threadIdRef = useRef(threadId)

  // Keep threadIdRef in sync
  threadIdRef.current = threadId

  const cleanup = useCallback(() => {
    closedIntentionallyRef.current = true
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'cleanup')
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const connect = useCallback((tid: string) => {
    cleanup()
    closedIntentionallyRef.current = false

    const ws = new WebSocket(`${BRIDGE_URL}/${tid}`)

    ws.onopen = () => {
      setIsConnected(true)
      reconnectDelayRef.current = RECONNECT_BASE
    }

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'connected') {
        const tid = threadIdRef.current
        if (!tid) return
        const running: boolean = !!data.running
        const serverMsgId: string | null = data.currentMsgId ?? null
        const serverSessionId: string | null = data.sessionId ?? null

        if (running && serverMsgId) {
          // Server is still mid-run. Point our streaming ref at the known
          // placeholder so chunks + done land on the right local message.
          currentMsgIdRef.current = serverMsgId
        } else if (!running && serverSessionId) {
          // No active run. Replace any orphan streaming/[Connection lost]
          // placeholder with the authoritative assistant turn from Hermes.
          await hydrateFromSession(tid, serverSessionId)
        }
        return
      }

      if (data.type === 'chunk') {
        const msgId = currentMsgIdRef.current || data.msgId
        if (msgId && data.content) {
          await appendToStreamingMessage(msgId, data.content)
        }
      } else if (data.type === 'tool') {
        const msgId = currentMsgIdRef.current || data.msgId
        if (msgId && data.id) {
          if (data.status === 'running') {
            await appendToolCall(msgId, {
              id: data.id,
              name: data.name || 'tool',
              arguments: data.arguments,
              status: 'running',
            })
          } else {
            await updateToolCall(msgId, data.id, {
              status: data.status,
              result: data.result,
            })
          }
        }
      } else if (data.type === 'mind') {
        setMindEvents(prev => {
          if (prev.some(e => e.dbId === data.dbId)) return prev
          return [...prev, data as MindEvent]
        })
      } else if (data.type === 'done') {
        const msgId = currentMsgIdRef.current || data.msgId
        if (msgId) {
          if (typeof data.content === 'string' && data.content.length > 0) {
            await updateStreamingMessage(msgId, data.content)
          } else {
            await finalizeStreamingMessage(msgId, data.durationMs)
          }
          // Store per-call token usage on the message
          if (data.tokenUsage) {
            await db.messages.update(msgId, { tokenUsage: data.tokenUsage })
          }
          currentMsgIdRef.current = null
        }
        // Auto-link session ID on first message for empty threads
        if (threadIdRef.current) {
          const thread = await db.threads.get(threadIdRef.current)
          if (!thread?.hermesSessionId && data.sessionId) {
            console.log('[Echo] Auto-linking sessionId:', threadIdRef.current, '→', data.sessionId)
            await setThreadSessionId(threadIdRef.current, data.sessionId)
          } else if (!data.sessionId) {
            console.warn('[Echo] No sessionId in done response — bridge parse may have failed')
          }
        }
      } else if (data.type === 'error') {
        const msgId = currentMsgIdRef.current || data.msgId
        if (msgId) {
          await failStreamingMessage(msgId, data.message || 'Unknown error')
          currentMsgIdRef.current = null
        }
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null

      if (!closedIntentionallyRef.current && threadIdRef.current) {
        const delay = reconnectDelayRef.current
        reconnectDelayRef.current = Math.min(delay * 2, RECONNECT_MAX)
        reconnectTimerRef.current = setTimeout(() => {
          if (threadIdRef.current) {
            connect(threadIdRef.current)
          }
        }, delay)
      }
    }

    ws.onerror = () => {
      // onclose fires after onerror, reconnect handled there
    }

    wsRef.current = ws
  }, [cleanup])

  // Connect/disconnect on threadId change
  useEffect(() => {
    if (threadId) {
      connect(threadId)
    } else {
      cleanup()
    }
    return cleanup
  }, [threadId, connect, cleanup])

  // Stale-streaming guard: if the server-sent `connected` event never arrives
  // (e.g. bridge offline), mark orphan streaming messages as lost after a
  // grace period so the UI doesn't spin forever. When the bridge is reachable,
  // the `connected` handler resolves orphans via hydrateFromSession before
  // this timer fires.
  useEffect(() => {
    if (!threadId) return
    const tid = threadId
    const timer = setTimeout(() => {
      db.messages
        .where('threadId')
        .equals(tid)
        .filter(m => m.status === 'streaming')
        .modify({ status: 'error', content: '[Connection lost]' })
    }, 4000)
    return () => clearTimeout(timer)
  }, [threadId])

  const send = useCallback(async (content: string, forcedSkills?: string[], imagePath?: string) => {
    const tid = threadIdRef.current
    const ws = wsRef.current
    if (!tid || !ws || ws.readyState !== WebSocket.OPEN) return

    // Intercept "/model <name>" — set thread model, no Hermes call
    const modelMatch = content.match(/^\/model\s+(\S+)\s*$/)
    if (modelMatch) {
      const newModel = modelMatch[1]
      await setThreadModel(tid, newModel)
      await recordKnownModel(newModel)
      const ackId = await createStreamingMessage(tid)
      await updateStreamingMessage(ackId, `Model switched to \`${newModel}\` for this thread.`)
      return
    }

    // Write user message to DB
    await sendMessage(tid, content)

    // Create streaming placeholder for assistant response
    const msgId = await createStreamingMessage(tid)
    currentMsgIdRef.current = msgId

    // Get thread's Hermes session ID + model
    const thread = await db.threads.get(tid)
    const sessionId = thread?.hermesSessionId
    const model = thread?.model
    if (model) await recordKnownModel(model)

    // Send to bridge
    const payload = {
      type: 'message',
      content,
      msgId,
      sessionId: sessionId || undefined,
      skills: forcedSkills && forcedSkills.length > 0 ? forcedSkills : undefined,
      model: model || undefined,
      imagePath: imagePath || undefined,
    }
    console.log('[Echo] WS send:', { model: payload.model, sessionId: payload.sessionId, msgId })
    ws.send(JSON.stringify(payload))
  }, [])

  return { sendMessage: send, isConnected, mindEvents }
}
