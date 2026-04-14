"""Manage Hermes CLI subprocesses — one per-message invocation with session persistence."""

import asyncio
import logging
import os
import re
import shutil
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable

from ansi import strip_ansi
from tool_poller import poll_for_tools, snapshot_cursor

logger = logging.getLogger(__name__)

# Resolve hermes binary: env override > shutil.which > hardcoded fallback
HERMES_COMMAND = (
    os.getenv("HERMES_COMMAND")
    or shutil.which("hermes")
    or "/Users/kz/.local/bin/hermes"
)
PROCESS_TIMEOUT = int(os.getenv("PROCESS_TIMEOUT", "3600"))


_RESUME_LINE = re.compile(r"^\W*Resumed session\b")


def _strip_banners(lines: list[str]) -> list[str]:
    """Remove Hermes CLI banner/decorative lines from response output."""
    result = []
    for line in lines:
        stripped = line.strip()
        # Skip resumed session banner: any arrow char + "Resumed session ..."
        if _RESUME_LINE.match(stripped):
            continue
        # Skip Hermes decorative line with unicode box-drawing chars: "╭── ⚕ Hermes ───..."
        if "Hermes" in stripped and any(c in stripped for c in ("╭", "╮", "╰", "╯", "─", "━")):
            continue
        # Skip pure horizontal rule lines
        if stripped and all(c in "─━╌╍═-" for c in stripped):
            continue
        result.append(line)
    return result


@dataclass
class HermesSession:
    thread_id: str
    session_id: str | None = None
    last_used: float = field(default_factory=time.time)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class SubprocessManager:
    def __init__(self) -> None:
        self.sessions: dict[str, HermesSession] = {}
        self._cleanup_task: asyncio.Task | None = None

    async def start(self) -> None:
        logger.info("Hermes binary: %s", HERMES_COMMAND)
        logger.info("Binary exists: %s", os.path.exists(HERMES_COMMAND))
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop(self) -> None:
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

    def get_or_create(self, thread_id: str) -> HermesSession:
        if thread_id not in self.sessions:
            self.sessions[thread_id] = HermesSession(thread_id=thread_id)
        return self.sessions[thread_id]

    async def run_message(
        self,
        thread_id: str,
        content: str,
        on_tool: Callable[[dict], Awaitable[None]] | None = None,
        skills: list[str] | None = None,
        model: str | None = None,
        image_path: str | None = None,
    ) -> tuple[str, str | None, int]:
        """Run one Hermes message. Returns (response, session_id, duration_ms)."""
        session = self.get_or_create(thread_id)

        async with session.lock:
            session.last_used = time.time()
            t0 = time.perf_counter()

            # Snapshot DB cursor BEFORE subprocess so poller only sees new rows
            cursor_start = await asyncio.to_thread(snapshot_cursor)
            stop_event = asyncio.Event()
            poller_task: asyncio.Task | None = None
            if on_tool is not None:
                poller_task = asyncio.create_task(
                    poll_for_tools(on_tool, stop_event, cursor_start, session_filter=session.session_id)
                )

            try:
                # First attempt (with --resume if session exists)
                stdout_text, stderr_text, returncode = await self._exec(
                    self._build_command(session, content, skills=skills, model=model, image_path=image_path)
                )

                # Retry without --resume on ANY failure when session_id was set
                if returncode != 0 and session.session_id is not None:
                    logger.info(
                        "First attempt failed for thread %s (session %s), retrying fresh. "
                        "Exit code: %d, stdout: %.200s, stderr: %.200s",
                        thread_id, session.session_id, returncode, stdout_text, stderr_text,
                    )
                    session.session_id = None
                    stdout_text, stderr_text, returncode = await self._exec(
                        self._build_command(session, content, skills=skills, model=model, image_path=image_path)
                    )
            finally:
                # Stop poller and wait for final sweep
                stop_event.set()
                if poller_task:
                    try:
                        await asyncio.wait_for(poller_task, timeout=2.0)
                    except (asyncio.TimeoutError, asyncio.CancelledError):
                        pass

            if returncode != 0:
                # Log full raw output for debugging
                logger.error(
                    "Hermes failed for thread %s.\n"
                    "  Exit code: %d\n"
                    "  RAW STDOUT:\n%s\n"
                    "  RAW STDERR:\n%s",
                    thread_id, returncode, stdout_text, stderr_text,
                )
                raise RuntimeError(
                    f"Hermes exited with code {returncode}. "
                    f"stderr: {stderr_text[:500]}. "
                    f"stdout: {stdout_text[:500]}"
                )

            # Drop Hermes streaming-render lines (they end with \r\n)
            # Final clean output uses pure \n. Keeping both causes duplicated text.
            # Split on \n, filter lines that still have a \r at end (pre-strip).
            raw_lines = stdout_text.split("\n")
            final_lines = [line for line in raw_lines if not line.endswith("\r")]
            dedup_text = "\n".join(final_lines)
            clean_output = strip_ansi(dedup_text).strip()
            logger.info("CLEAN OUTPUT (last 200 chars): %s", repr(clean_output[-200:]))

            response, new_session_id = self._parse_output(clean_output)
            logger.info("PARSED: response_len=%d, session_id=%s", len(response), new_session_id)

            if new_session_id:
                session.session_id = new_session_id
                logger.info(
                    "Thread %s mapped to Hermes session %s",
                    thread_id,
                    new_session_id,
                )
            else:
                logger.warning("Thread %s: no session_id parsed, current=%s", thread_id, session.session_id)

            duration_ms = int((time.perf_counter() - t0) * 1000)
            return response, session.session_id, duration_ms

    async def _exec(self, cmd: list[str]) -> tuple[str, str, int]:
        logger.info("EXECUTING COMMAND: %s", cmd)

        # Pass user's full shell env so Hermes finds config, API keys, PATH
        env = os.environ.copy()
        env["HOME"] = os.path.expanduser("~")

        # Log key env vars for debugging
        logger.debug(
            "ENV: HOME=%s, PATH=%.200s, HERMES_HOME=%s",
            env.get("HOME"), env.get("PATH", ""), env.get("HERMES_HOME", "(unset)"),
        )

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        stdout_bytes, stderr_bytes = await proc.communicate()

        stdout_text = stdout_bytes.decode(errors="replace").strip()
        stderr_text = stderr_bytes.decode(errors="replace").strip()

        if stderr_text:
            logger.warning("Hermes stderr:\n%s", stderr_text)
        if stdout_text:
            logger.info("Hermes stdout:\n%s", stdout_text[:1000])

        return stdout_text, stderr_text, proc.returncode or 0

    def _build_command(
        self, session: HermesSession, content: str,
        skills: list[str] | None = None, model: str | None = None,
        image_path: str | None = None,
    ) -> list[str]:
        cmd = [HERMES_COMMAND, "chat", "-Q", "-q", content, "-m", model or "qwen/qwen3.6-plus"]
        if session.session_id:
            cmd.extend(["--resume", session.session_id])
        if skills:
            cmd.extend(["--skills", ",".join(skills)])
        if image_path:
            cmd.extend(["--image", image_path])
        return cmd

    @staticmethod
    def _parse_output(output: str) -> tuple[str, str | None]:
        # Search lines from bottom for session_id
        lines = output.strip().split("\n")
        session_id = None
        response_end = len(lines)
        for i in range(len(lines) - 1, -1, -1):
            line = lines[i].strip()
            if line.startswith("session_id:"):
                session_id = line.replace("session_id:", "").strip()
                response_end = i
                logger.info("Parsed session_id: %s", session_id)
                break

        response_lines = lines[:response_end]
        cleaned = _strip_banners(response_lines)
        response = "\n".join(cleaned).strip()

        if session_id is None:
            logger.warning("No session_id found in Hermes output. Last 3 lines: %s", lines[-3:])

        return response, session_id

    async def _cleanup_loop(self) -> None:
        while True:
            await asyncio.sleep(60)
            now = time.time()
            expired = [
                tid
                for tid, session in self.sessions.items()
                if now - session.last_used > PROCESS_TIMEOUT
            ]
            for tid in expired:
                logger.info("Removing idle session for thread %s", tid)
                del self.sessions[tid]
