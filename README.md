# Echo

Personal web frontend for the [Hermes](https://github.com/nousresearch/hermes-agent) AI agent. A premium dark-mode workspace for chatting with Hermes, managing skills, and organizing conversations into contexts and threads.

![Stack](https://img.shields.io/badge/React-19-61dafb) ![Stack](https://img.shields.io/badge/TypeScript-strict-3178c6) ![Stack](https://img.shields.io/badge/Vite-8-646cff) ![Stack](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![Stack](https://img.shields.io/badge/FastAPI-0.115-009688)

## Architecture

```
Echo Frontend (React) ←WebSocket→ Bridge (FastAPI) ←subprocess→ Hermes CLI
     :5173                             :8000                  hermes chat -Q
```

- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4. IndexedDB persistence via Dexie.
- **Bridge**: FastAPI server that wraps `hermes chat -Q` subprocess calls, exposes WebSocket for chat and REST for skills/sessions metadata.
- **Hermes**: Unmodified — bridge uses the official CLI programmatic flags.

## Features

- **3-pane workspace** — sidebar (contexts + threads), chat stage, inspector (skills)
- **Contexts + Threads** — two-level hierarchy with drag-to-reorder on both
- **Favorites bar** — pin any thread for quick access
- **Session mapping** — each thread links to a Hermes session ID (manual paste or auto-capture)
- **Context window meter** — live token usage + message count, updates per message
- **Skills management** — sync with real Hermes skills, pin for quick access, activate for forced-use (persistent purple pill), left-click pinned skill types its name into chat
- **Kairos time labels** — context-tagged message timestamps, amber highlighting for agent-initiated messages
- **Markdown + syntax-highlighted code blocks** — full rendering with copy buttons
- **Typing indicator** — amber pulsing dots while Hermes processes

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Hermes agent installed (`hermes` in PATH) — see [nousresearch/hermes-agent](https://github.com/nousresearch/hermes-agent)

### Install

```bash
# Frontend
npm install

# Bridge
cd bridge
pip install -r requirements.txt
cd ..
```

### Run

```bash
# Terminal 1 — bridge
cd bridge
uvicorn main:app --port 8000

# Terminal 2 — frontend
npm run dev
```

Open http://localhost:5173

## Project Structure

```
Echo/
├── bridge/                    # Python FastAPI bridge
│   ├── main.py                # WebSocket + REST endpoints
│   ├── process_manager.py     # Hermes subprocess management
│   ├── skills.py              # Discover Hermes skills
│   ├── sessions.py            # Read session metadata from Hermes SQLite
│   └── ansi.py                # Strip ANSI escape codes from CLI output
├── src/
│   ├── components/
│   │   ├── layout/            # 3-pane shell
│   │   ├── sidebar/           # Contexts, threads, favorites
│   │   ├── chat/              # Messages, input, markdown
│   │   └── inspector/         # Skills, files, mind tabs
│   ├── db/                    # Dexie IndexedDB layer
│   ├── hooks/                 # useWorkspace, useHermesConnection
│   └── types.ts
└── docs/superpowers/specs/    # Design specs per phase
```

## Configuration

Create `bridge/.env` from the example:

```bash
HERMES_COMMAND=hermes       # or absolute path to hermes binary
BRIDGE_PORT=8000
PROCESS_TIMEOUT=3600        # seconds before idle sessions are cleaned up
```

## License

MIT
