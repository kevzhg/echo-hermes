import type { Context, Thread, Message, Skill } from '../types'

export const mockContexts: Context[] = [
  { id: 'ctx-workplace', name: 'Workplace', emoji: '💼', order: 0 },
  { id: 'ctx-tech', name: 'Tech', emoji: '💻', order: 1 },
  { id: 'ctx-philosophy', name: 'Philosophy', emoji: '🌊', order: 2 },
  { id: 'ctx-project', name: 'Project Alpha', emoji: '📂', order: 3 },
]

export const mockThreads: Thread[] = [
  { id: 'thr-okr', name: 'Q2 OKR Planning', contextId: 'ctx-workplace', lastMessageAt: '2026-04-08T14:42:00Z', order: 0, favorite: true },
  { id: 'thr-onboard', name: 'Client Onboarding', contextId: 'ctx-workplace', lastMessageAt: '2026-04-08T13:15:00Z', order: 1, favorite: false },
  { id: 'thr-standup', name: 'Team Standup Notes', contextId: 'ctx-workplace', lastMessageAt: '2026-04-08T11:00:00Z', order: 2, favorite: false },
  { id: 'thr-rust', name: 'Rust Learning Path', contextId: 'ctx-tech', lastMessageAt: '2026-04-07T20:00:00Z', order: 0, favorite: false },
  { id: 'thr-infra', name: 'Infra Migration', contextId: 'ctx-tech', lastMessageAt: '2026-04-07T16:30:00Z', order: 1, favorite: false },
  { id: 'thr-freewill', name: 'Free Will Debate', contextId: 'ctx-philosophy', lastMessageAt: '2026-04-06T22:00:00Z', order: 0, favorite: false },
  { id: 'thr-alpha-main', name: 'Main Thread', contextId: 'ctx-project', lastMessageAt: '2026-04-08T09:00:00Z', order: 0, favorite: false },
]

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    threadId: 'thr-okr',
    role: 'user',
    content: 'How do I set up a cron job in Hermes?',
    timestamp: '2026-04-08T14:41:00Z',
    status: 'sent',
  },
  {
    id: 'msg-2',
    threadId: 'thr-okr',
    role: 'assistant',
    content: 'You can use the `cron_scheduler` skill. Define a schedule with a standard cron expression.\n\n**Steps:**\n1. Enable the `cron` skill in your tools config\n2. Use the `/cron` command with an expression\n3. Attach a callback function\n\nThe scheduler supports standard 5-field cron syntax.',
    timestamp: '2026-04-08T14:41:15Z',
    status: 'sent',
    kairos: { context: 'Workplace', emoji: '💼', selfInitiated: false },
  },
  {
    id: 'msg-3',
    threadId: 'thr-okr',
    role: 'user',
    content: 'Show me a Python example',
    timestamp: '2026-04-08T14:42:00Z',
    status: 'sent',
  },
  {
    id: 'msg-4',
    threadId: 'thr-okr',
    role: 'assistant',
    content: 'Here\'s an example:\n\n```python\nfrom hermes import cron\n\n@cron.schedule("*/5 * * * *")\ndef check_updates():\n    results = search_web("latest news")\n    return summarize(results)\n```\n\nThis runs `check_updates` every 5 minutes. The decorator registers it with the cron scheduler automatically.',
    timestamp: '2026-04-08T14:42:10Z',
    status: 'sent',
    kairos: { context: 'Workplace', emoji: '💼', selfInitiated: false },
  },
  {
    id: 'msg-5',
    threadId: 'thr-okr',
    role: 'assistant',
    content: 'I noticed your cron job from earlier might conflict with the existing `daily_report` schedule. Want me to check for overlaps?',
    timestamp: '2026-04-08T15:15:00Z',
    status: 'sent',
    kairos: { context: 'Workplace', emoji: '💼', selfInitiated: true },
  },
  {
    id: 'msg-6',
    threadId: 'thr-okr',
    role: 'assistant',
    content: 'Rust build for `infra-core` finished. 3 warnings, 0 errors. Full log in Files tab.',
    timestamp: '2026-04-08T15:22:00Z',
    status: 'sent',
    kairos: { context: 'Tech', emoji: '💻', selfInitiated: true },
  },
]

export const mockSkills: Skill[] = [
  { id: 'skill-web', name: 'web_search', category: 'research', source: 'builtin', pinned: false, active: false, favorite: false },
  { id: 'skill-code', name: 'code_exec', category: 'productivity', source: 'builtin', pinned: false, active: false, favorite: false },
  { id: 'skill-memory', name: 'memory', category: 'productivity', source: 'builtin', pinned: false, active: false, favorite: false },
  { id: 'skill-file', name: 'file_ops', category: 'productivity', source: 'builtin', pinned: false, active: false, favorite: false },
  { id: 'skill-cron', name: 'cron', category: 'devops', source: 'builtin', pinned: false, active: false, favorite: false },
]
