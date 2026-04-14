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
const RECONNECT_BASE = 1000
const RECONNECT_MAX = 16000

interface HermesConnection {
  sendMessage: (content: string) => void
  isConnected: boolean
}

export function useHermesConnection(threadId: string | null): HermesConnection {
  const [isConnected, setIsConnected] = useState(false)
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

      if (data.type === 'chunk') {
        const msgId = currentMsgIdRef.current
        if (msgId && data.content) {
          await appendToStreamingMessage(msgId, data.content)
        }
      } else if (data.type === 'tool') {
        const msgId = currentMsgIdRef.current
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
      } else if (data.type === 'done') {
        const msgId = currentMsgIdRef.current
        if (msgId) {
          if (typeof data.content === 'string' && data.content.length > 0) {
            await updateStreamingMessage(msgId, data.content)
          } else {
            await finalizeStreamingMessage(msgId, data.durationMs)
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
        const msgId = currentMsgIdRef.current
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

  // Clean up orphaned streaming messages on mount/thread change
  useEffect(() => {
    if (threadId) {
      db.messages
        .where('threadId')
        .equals(threadId)
        .filter(m => m.status === 'streaming')
        .modify({ status: 'error', content: '[Connection lost]' })
    }
  }, [threadId])

  const send = useCallback(async (content: string, forcedSkills?: string[]) => {
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
      sessionId: sessionId || undefined,
      skills: forcedSkills && forcedSkills.length > 0 ? forcedSkills : undefined,
      model: model || undefined,
    }
    console.log('[Echo] WS send:', { model: payload.model, sessionId: payload.sessionId })
    ws.send(JSON.stringify(payload))
  }, [])

  return { sendMessage: send, isConnected }
}
