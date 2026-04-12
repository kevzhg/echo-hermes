"""Manage Hermes CLI subprocesses — one per-message invocation with session persistence."""

import asyncio
import logging
import os
import shutil
import time
from dataclasses import dataclass, field

from ansi import strip_ansi

logger = logging.getLogger(__name__)

# Resolve hermes binary: env override > shutil.which > hardcoded fallback
HERMES_COMMAND = (
    os.getenv("HERMES_COMMAND")
    or shutil.which("hermes")
    or "/Users/kz/.local/bin/hermes"
)
PROCESS_TIMEOUT = int(os.getenv("PROCESS_TIMEOUT", "3600"))


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

    async def run_message(self, thread_id: str, content: str, skills: list[str] | None = None) -> str:
        session = self.get_or_create(thread_id)

        async with session.lock:
            session.last_used = time.time()

            # First attempt (with --resume if session exists)
            stdout_text, stderr_text, returncode = await self._exec(
                self._build_command(session, content, skills=skills)
            )

            # Retry without --resume on ANY failure when session_id was set
            # Covers: session not found, session corruption, stale session
            if returncode != 0 and session.session_id is not None:
                logger.info(
                    "First attempt failed for thread %s (session %s), retrying fresh. "
                    "Exit code: %d, stdout: %.200s, stderr: %.200s",
                    thread_id, session.session_id, returncode, stdout_text, stderr_text,
                )
                session.session_id = None
                stdout_text, stderr_text, returncode = await self._exec(
                    self._build_command(session, content, skills=skills)
                )

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

            clean_output = strip_ansi(stdout_text).strip()

            response, new_session_id = self._parse_output(clean_output)

            if new_session_id:
                session.session_id = new_session_id
                logger.info(
                    "Thread %s mapped to Hermes session %s",
                    thread_id,
                    new_session_id,
                )

            return response

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

    def _build_command(self, session: HermesSession, content: str, skills: list[str] | None = None) -> list[str]:
        cmd = [HERMES_COMMAND, "chat", "-Q", "-q", content, "-m", "qwen/qwen3.6-plus"]
        if session.session_id:
            cmd.extend(["--resume", session.session_id])
        if skills:
            cmd.extend(["--skills", ",".join(skills)])
        return cmd

    @staticmethod
    def _parse_output(output: str) -> tuple[str, str | None]:
        separator = "\nsession_id: "
        if separator in output:
            parts = output.rsplit(separator, 1)
            response = parts[0].strip()
            session_id = parts[1].strip()
            return response, session_id

        # Try line-by-line for edge cases
        lines = output.strip().split("\n")
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].startswith("session_id: "):
                session_id = lines[i].replace("session_id: ", "").strip()
                response = "\n".join(lines[:i]).strip()
                return response, session_id

        # No session_id found — return full output as response
        logger.warning("No session_id found in Hermes output")
        return output, None

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
