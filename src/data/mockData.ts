import type { Context, Message, Skill } from '../types'

export const mockContexts: Context[] = [
  {
    id: 'ctx-workplace',
    name: 'Workplace',
    emoji: '💼',
    threads: [
      { id: 'thr-okr', name: 'Q2 OKR Planning', contextId: 'ctx-workplace', lastMessageAt: '2026-04-08T14:42:00Z' },
      { id: 'thr-onboard', name: 'Client Onboarding', contextId: 'ctx-workplace', lastMessageAt: '2026-04-08T13:15:00Z' },
      { id: 'thr-standup', name: 'Team Standup Notes', contextId: 'ctx-workplace', lastMessageAt: '2026-04-08T11:00:00Z' },
    ],
  },
  {
    id: 'ctx-tech',
    name: 'Tech',
    emoji: '💻',
    threads: [
      { id: 'thr-rust', name: 'Rust Learning Path', contextId: 'ctx-tech', lastMessageAt: '2026-04-07T20:00:00Z' },
      { id: 'thr-infra', name: 'Infra Migration', contextId: 'ctx-tech', lastMessageAt: '2026-04-07T16:30:00Z' },
    ],
  },
  {
    id: 'ctx-philosophy',
    name: 'Philosophy',
    emoji: '🌊',
    threads: [
      { id: 'thr-freewill', name: 'Free Will Debate', contextId: 'ctx-philosophy', lastMessageAt: '2026-04-06T22:00:00Z' },
    ],
  },
  {
    id: 'ctx-project',
    name: 'Project Alpha',
    emoji: '📂',
    threads: [
      { id: 'thr-alpha-main', name: 'Main Thread', contextId: 'ctx-project', lastMessageAt: '2026-04-08T09:00:00Z' },
    ],
  },
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
  },
]

export const mockSkills: Skill[] = [
  { id: 'skill-web', name: 'web_search', description: 'Search the web for information', enabled: true },
  { id: 'skill-code', name: 'code_exec', description: 'Execute code in sandbox', enabled: true },
  { id: 'skill-memory', name: 'memory', description: 'Persistent memory access', enabled: true },
  { id: 'skill-file', name: 'file_ops', description: 'File system operations', enabled: false },
  { id: 'skill-cron', name: 'cron', description: 'Scheduled task runner', enabled: true },
]
