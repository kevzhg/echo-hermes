# Smart Dual-Model Routing + Manual Override

**Date:** 2026-04-11
**Status:** Planned (not yet implemented)

## Context

Echo currently hardcodes `qwen/qwen3.6-plus` for every message. We want automatic model selection based on message complexity — simple questions use a fast instruct model, complex/analytical queries use the thinking model. User can force thinking mode via a toggle button.

## Models

- **Instruct (fast):** `qwen/qwen3.5-flash-02-23`
- **Thinking (deep):** `qwen/qwen3.6-plus`

## Changes

### 1. Create `src/utils/intentRouter.ts` (new)

```ts
const THINKING_MODEL = 'qwen/qwen3.6-plus'
const INSTRUCT_MODEL = 'qwen/qwen3.5-flash-02-23'

const THINKING_KEYWORDS = ['why', 'analyze', 'architecture', 'complex', 'debug', 'fix', 'explain', 'compare', 'design', 'refactor']
const CODE_BLOCK_PATTERN = /```/

function getBestModel(text: string, forceThinking?: boolean): string
```

- If `forceThinking` → return THINKING_MODEL
- If text contains code blocks (```) → THINKING_MODEL
- If text contains any THINKING_KEYWORDS (word boundary match) → THINKING_MODEL
- Default → INSTRUCT_MODEL

Also export: `isThinkingModel(model: string): boolean` helper for UI feedback.

### 2. Update `src/types.ts`

Add optional `model` field to Message:
```ts
model?: string  // which model was used for this response
```

### 3. Update `src/hooks/useHermesConnection.ts`

Change `send` signature to accept model:
```ts
const send = useCallback(async (content: string, model: string) => {
  ...
  ws.send(JSON.stringify({ type: 'message', content, model }))
}, [])
```

Store model on the streaming message via new `createStreamingMessage(threadId, model)` param.

### 4. Update `src/db/operations.ts`

`createStreamingMessage(threadId, model?)` — stores model on the message record.

### 5. Update `src/components/chat/ChatInput.tsx`

- Add `forceThinking` boolean state + toggle button
- Import `Brain` from lucide-react
- Button between paperclip and textarea: brain icon, toggles amber when active
- `onSend` signature changes to `(content: string, forceThinking: boolean) => void`
- On send, pass `forceThinking` to parent
- Reset `forceThinking` to false after send

### 6. Update `src/components/chat/ChatStage.tsx`

- Import `getBestModel` from utils
- ChatStage wraps the routing:
```ts
const handleSend = (content: string, forceThinking: boolean) => {
  const model = getBestModel(content, forceThinking)
  onSend(content, model)
}
```
- Update `onSend` prop to `(content: string, model: string) => void`

### 7. Update `src/App.tsx`

`hermesSend` from hook now takes `(content, model)`. Wire through.

### 8. Update `src/components/chat/MessageBubble.tsx`

When streaming + empty:
- If `message.model` is thinking model → "Echo is thinking deeply..."
- Else → "Echo is thinking..." (existing dots)

### 9. Update `bridge/process_manager.py`

`_build_command` takes dynamic model:
```python
def _build_command(self, session, content, model):
    cmd = [HERMES_COMMAND, "chat", "-Q", "-q", content, "-m", model]
```

### 10. Update `bridge/main.py`

WebSocket handler extracts `model` from message payload:
```python
model = data.get("model", "qwen/qwen3.6-plus")
response = await manager.run_message(thread_id, content, model)
```

## File Changes

| File | Action |
|------|--------|
| `src/utils/intentRouter.ts` | Create — getBestModel + isThinkingModel |
| `src/types.ts` | Modify — add model? to Message |
| `src/db/operations.ts` | Modify — createStreamingMessage accepts model |
| `src/hooks/useHermesConnection.ts` | Modify — send accepts model, passes to WS + DB |
| `src/components/chat/ChatInput.tsx` | Modify — brain toggle, onSend(content, forceThinking) |
| `src/components/chat/ChatStage.tsx` | Modify — routes intent, passes model |
| `src/App.tsx` | Modify — wire (content, model) through |
| `src/components/chat/MessageBubble.tsx` | Modify — thinking feedback based on model |
| `bridge/process_manager.py` | Modify — dynamic model in _build_command |
| `bridge/main.py` | Modify — extract model from WS payload |

## Verification

1. Send "hello" → uses instruct model (fast response)
2. Send "why does React re-render?" → auto-routes to thinking model
3. Send message with code block → thinking model
4. Click brain toggle + send "hello" → forces thinking model
5. Brain toggle resets after send
6. Streaming bubble shows "thinking deeply..." for thinking model
7. Bridge logs show correct `-m` flag per request
