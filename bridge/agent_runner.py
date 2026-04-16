"""In-process Hermes agent runner with real token streaming via AIAgent Python API.

Replaces SubprocessManager. No subprocess, no stdout parsing, no ANSI stripping.
Uses stream_delta_callback for real-time token delivery over WebSocket.
Uses SessionDB for native Hermes session persistence.
"""

import asyncio
import logging
import os
import sys
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable

logger = logging.getLogger(__name__)

# Make Hermes importable
HERMES_ROOT = os.path.expanduser("~/.hermes/hermes-agent")
if HERMES_ROOT not in sys.path:
    sys.path.insert(0, HERMES_ROOT)

try:
    from run_agent import AIAgent
    from hermes_state import SessionDB
    HERMES_AVAILABLE = True
    logger.info("Hermes Python API loaded from %s", HERMES_ROOT)
except ImportError as e:
    HERMES_AVAILABLE = False
    logger.error("Failed to import Hermes: %s. Bridge will not function.", e)

from pathlib import Path
DB_PATH = Path(os.path.expanduser("~/.hermes/state.db"))
DEFAULT_MODEL = "MiniMax-M2.7"
SESSION_TIMEOUT = int(os.getenv("PROCESS_TIMEOUT", "3600"))


@dataclass
class SessionState:
    thread_id: str
    session_id: str | None = None
    last_used: float = field(default_factory=time.time)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    # Currently-attached client socket. Kept as `object` to avoid a FastAPI
    # import here; callers treat it as a WebSocket.
    sink: object | None = None
    # True while an agent turn is executing in the thread pool. Used by the
    # bridge to tell a reconnecting client whether to wait for resumption or
    # hydrate from the Hermes DB.
    running: bool = False
    # Client-supplied ID of the local message placeholder for the current run.
    # Echoed back on `connected` / `chunk` / `done` so a reconnecting client
    # knows which local message the stream belongs to.
    current_msg_id: str | None = None


class AgentRunner:
    """Manages Hermes AIAgent calls with session persistence and real-time streaming."""

    def __init__(self) -> None:
        self.sessions: dict[str, SessionState] = {}
        self._cleanup_task: asyncio.Task | None = None
        self._db: SessionDB | None = None

    async def start(self) -> None:
        if not HERMES_AVAILABLE:
            raise RuntimeError("Hermes Python API not available")
        if os.path.exists(DB_PATH):
            self._db = SessionDB(db_path=DB_PATH)
            logger.info("SessionDB connected: %s", DB_PATH)
        else:
            logger.warning("Hermes DB not found at %s — sessions won't persist", DB_PATH)
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop(self) -> None:
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

    def get_or_create(self, thread_id: str) -> SessionState:
        if thread_id not in self.sessions:
            self.sessions[thread_id] = SessionState(thread_id=thread_id)
        return self.sessions[thread_id]

    async def run_message(
        self,
        thread_id: str,
        content: str,
        on_chunk: Callable[[str], Awaitable[None]] | None = None,
        on_tool: Callable[[dict], Awaitable[None]] | None = None,
        skills: list[str] | None = None,
        model: str | None = None,
        image_path: str | None = None,
    ) -> tuple[str, str | None, int, dict]:
        """Run one agent turn. Returns (final_response, session_id, duration_ms, token_usage).

        Callbacks fire from a worker thread — bridge must handle async bridging.
        """
        if not HERMES_AVAILABLE:
            raise RuntimeError("Hermes Python API not available")

        session = self.get_or_create(thread_id)

        async with session.lock:
            session.last_used = time.time()
            t0 = time.perf_counter()
            loop = asyncio.get_running_loop()

            # Load conversation history from Hermes DB
            history = []
            if session.session_id and self._db:
                try:
                    history = self._db.get_messages_as_conversation(session.session_id) or []
                    logger.info("Loaded %d history messages for session %s", len(history), session.session_id)
                except Exception as e:
                    logger.warning("Failed to load session history: %s", e)
                    history = []

            # Build sync callbacks that bridge to async
            def sync_stream_cb(delta: str | None) -> None:
                if delta is None or not on_chunk:
                    return
                asyncio.run_coroutine_threadsafe(on_chunk(delta), loop)

            def sync_tool_start_cb(tool_name: str, tool_input: dict) -> None:
                if not on_tool:
                    return
                asyncio.run_coroutine_threadsafe(
                    on_tool({
                        "type": "tool",
                        "id": f"tool_{time.time_ns()}",
                        "status": "running",
                        "name": tool_name,
                        "arguments": str(tool_input)[:500],
                    }),
                    loop,
                )

            def sync_tool_complete_cb(tool_name: str, result: str) -> None:
                if not on_tool:
                    return
                asyncio.run_coroutine_threadsafe(
                    on_tool({
                        "type": "tool",
                        "id": f"tool_{time.time_ns()}",
                        "status": "complete",
                        "name": tool_name,
                        "result": (result or "")[:500],
                    }),
                    loop,
                )

            # Create agent for this turn
            agent_kwargs = {
                "model": model or DEFAULT_MODEL,
                "session_id": session.session_id,
                "session_db": self._db,
                "platform": "cli",
                "quiet_mode": True,
                "skip_context_files": False,  # Load SOUL.md for identity + language protocol
                "stream_delta_callback": sync_stream_cb,
                "tool_start_callback": sync_tool_start_cb,
                "tool_complete_callback": sync_tool_complete_cb,
                "persist_session": True,
                "max_iterations": 300,
            }

            # Image attachment — pass as prefill message with image content
            prefill = None
            if image_path and os.path.exists(image_path):
                agent_kwargs["prefill_messages"] = [{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"file://{image_path}"}},
                        {"type": "text", "text": content},
                    ],
                }]
                # Override content to empty since it's in prefill
                content = ""

            try:
                agent = AIAgent(**agent_kwargs)

                # run_conversation is synchronous — dispatch to thread pool
                session.running = True
                try:
                    result = await loop.run_in_executor(
                        None,
                        lambda: agent.run_conversation(
                            content if content else None,
                            conversation_history=history,
                        ),
                    )
                finally:
                    session.running = False

                final_response = result.get("final_response") or ""
                new_session_id = getattr(agent, "session_id", None)

                if new_session_id:
                    session.session_id = new_session_id

                duration_ms = int((time.perf_counter() - t0) * 1000)

                logger.info(
                    "Agent done: thread=%s session=%s response_len=%d duration=%dms tokens_in=%d tokens_out=%d",
                    thread_id,
                    session.session_id,
                    len(final_response),
                    duration_ms,
                    result.get("input_tokens", 0),
                    result.get("output_tokens", 0),
                )

                return final_response, session.session_id, duration_ms, {
                    "input_tokens": result.get("input_tokens", 0),
                    "output_tokens": result.get("output_tokens", 0),
                    "cache_read_tokens": result.get("cache_read_tokens", 0),
                }

            except Exception as e:
                duration_ms = int((time.perf_counter() - t0) * 1000)
                logger.exception("Agent error for thread %s after %dms", thread_id, duration_ms)
                raise RuntimeError(f"Agent error: {e}") from e

    async def _cleanup_loop(self) -> None:
        while True:
            await asyncio.sleep(60)
            now = time.time()
            expired = [
                tid for tid, s in self.sessions.items()
                if now - s.last_used > SESSION_TIMEOUT
            ]
            for tid in expired:
                logger.info("Removing idle session for thread %s", tid)
                del self.sessions[tid]
