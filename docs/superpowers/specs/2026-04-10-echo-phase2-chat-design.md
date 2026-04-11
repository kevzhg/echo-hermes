# Echo Phase 2 — Chat Experience

**Date:** 2026-04-10
**Status:** Approved
**Scope:** Chat message list, markdown rendering, code blocks, input area, typing indicator, kairos time labels. Builds on Phase 1 shell.

## Overview

Replace ChatStage placeholder with full chat experience: message rendering with markdown/code blocks, auto-expanding input, typing indicator, and kairos contextual time labels.

## New Dependencies

- `react-markdown` — markdown rendering in Echo messages
- `react-syntax-highlighter` — code block syntax highlighting
- `remark-gfm` — GitHub-flavored markdown (tables, strikethrough, etc.)

## Data Model Changes

### Message (updated)

```ts
interface Message {
  id: string
  threadId: string
  role: 'user' | 'assistant'
  content: string        // markdown
  timestamp: string      // ISO 8601
  status: 'sent' | 'streaming' | 'error'
  kairos?: {
    context: string      // "Workplace", "Tech", "Philosophy"
    emoji: string        // "💼", "💻", "🌊"
    selfInitiated: boolean
  }
}
```

### Mock Data Additions

Extend `mockMessages` for thread `thr-okr`:
1. User: "How do I set up a cron job in Hermes?" (existing)
2. Echo: Markdown with inline code + ordered list (existing)
3. User: "Show me a Python example" (existing)
4. Echo: Fenced Python code block (existing)
5. Echo (self-initiated): "I noticed your cron job might conflict with `daily_report` schedule. Want me to check for overlaps?" — kairos: `{ context: "Workplace", emoji: "💼", selfInitiated: true }`
6. Echo (self-initiated, cross-context): "Rust build for `infra-core` finished. 3 warnings, 0 errors." — kairos: `{ context: "Tech", emoji: "💻", selfInitiated: true }`

Normal Echo responses get kairos with `selfInitiated: false`. User messages have no kairos.

## Component Architecture

### ChatStage.tsx (modify existing)

Composes: top bar breadcrumb + MessageList + ChatInput. Passes messages filtered by active thread.

### MessageList.tsx (new)

- Scrollable container, auto-scrolls to bottom on new messages
- Maps messages to MessageBubble components
- Inserts `⚡ Echo initiated` divider before self-initiated messages
- Shows TypingIndicator at bottom when Echo is processing

### MessageBubble.tsx (new)

Two visual variants based on `role`:

**User messages:**
- Right-aligned, `#27272a` bg
- Border-radius: `12px 12px 4px 12px` (tight bottom-right)
- Timestamp below: `#52525b`, 11px, 6px gap

**Echo messages:**
- Left-aligned, `#18181b` bg, `1px solid #27272a` border
- Border-radius: `12px 12px 12px 4px` (tight bottom-left)
- Content rendered via `react-markdown` with custom components
- Self-initiated: border changes to `rgba(245, 158, 11, 0.2)` (subtle amber)
- Max-width: 75-80%

**Kairos label (below bubble, Echo messages only):**
- Normal: `2:41 PM · 💼 Workplace` — context pill with zinc colors
- Self-initiated: `3:15 PM · 💼 Workplace · self-initiated` — amber-tinted pill, amber text
- User messages: chronos timestamp only, no kairos

### MarkdownRenderer.tsx (new)

Wraps `react-markdown` with custom component overrides:
- **Code blocks:** `react-syntax-highlighter` with `oneDark` theme, language label header, copy button
- **Inline code:** `#27272a` bg, monospace, `#fafafa` text
- **Bold/headings:** `#e4e4e7` (brighter than body text)
- **Lists:** Proper indentation, zinc-400 text
- **Links:** `#3b82f6`, underline on hover
- **Tables:** Bordered, alternating row backgrounds (if GFM enabled)

### CodeBlock.tsx (new)

Custom code block component used by MarkdownRenderer:
- Dark inset: `#09090b` bg, `1px solid #27272a` border, 6px radius
- Header bar: language label (left), copy button (right), `#0f0f10` bg
- Syntax highlighting via `react-syntax-highlighter` / `PrismLight`
- Copy button: copies code to clipboard, shows "Copied!" for 2s

### TypingIndicator.tsx (new)

- 3 amber dots (`#f59e0b`) with staggered CSS pulse animation
- Same bubble shape as Echo messages (left-aligned, `#18181b` bg)
- 1.4s animation cycle, opacity oscillates 0.1–0.9

### ChatInput.tsx (new)

- `<textarea>` with auto-expanding height
  - Min: 1 row (~40px). Max: 6 rows (~160px)
  - Resize on input via `scrollHeight` measurement
- Left: paperclip icon (Lucide `Paperclip`) — placeholder, non-functional
- Right: send button (Lucide `ArrowUp`)
  - Disabled state: `#3f3f46` bg, `#71717a` icon
  - Active state (text present): `#3b82f6` bg, white icon
- Enter to send, Shift+Enter for newline
- Keyboard hint text below input: "Shift+Enter for newline" / "Enter to send" in `#3f3f46`

### SelfInitiatedDivider.tsx (new)

- Centered horizontal rule with `⚡ Echo initiated` label
- Line: `#27272a`, label: `#71717a`, lightning: `#f59e0b`
- Inserted in MessageList before any message with `kairos.selfInitiated === true`

## Styling Tokens

| Element | Value |
|---------|-------|
| User bubble bg | `#27272a` |
| Echo bubble bg | `#18181b` |
| Echo bubble border | `1px solid #27272a` |
| Self-initiated border | `1px solid rgba(245,158,11,0.2)` |
| Kairos pill (normal) | bg `#18181b`, border `#27272a`, text `#71717a` |
| Kairos pill (self-initiated) | bg `rgba(245,158,11,0.08)`, border `rgba(245,158,11,0.15)`, text `#f59e0b` |
| Timestamp | `#52525b`, 11px, 6px below bubble |
| Code block bg | `#09090b` |
| Code header bg | `#0f0f10` |
| Send button active | `#3b82f6` |
| Send button disabled | `#3f3f46` |
| Typing dot color | `#f59e0b` |

## File Structure (new/modified)

```
src/
  components/
    chat/
      ChatStage.tsx          — MODIFY: compose MessageList + ChatInput
      MessageList.tsx         — NEW: scrollable message container
      MessageBubble.tsx       — NEW: user/echo bubble with kairos
      MarkdownRenderer.tsx    — NEW: react-markdown wrapper
      CodeBlock.tsx           — NEW: syntax-highlighted code block
      TypingIndicator.tsx     — NEW: amber pulsing dots
      ChatInput.tsx           — NEW: auto-expanding textarea + send
      SelfInitiatedDivider.tsx — NEW: ⚡ Echo initiated divider
  data/
    mockData.ts              — MODIFY: add kairos fields + self-initiated messages
  types.ts                   — MODIFY: add kairos to Message interface
```

## Non-Goals

- No real message sending (mock only)
- No streaming text animation (future)
- No file attachment upload (paperclip is placeholder)
- No message editing/deletion
- No search within messages
