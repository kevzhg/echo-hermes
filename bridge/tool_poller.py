"""Poll Hermes SQLite for new tool calls during subprocess execution.

Strategy: capture max(messages.id) before subprocess starts, then poll for
new rows every POLL_INTERVAL_MS. Convert assistant/tool rows into structured
events streamed to the frontend via on_tool callback.
"""

import asyncio
import json
import logging
import os
import sqlite3
from typing import Awaitable, Callable

logger = logging.getLogger(__name__)

DB_PATH = os.path.expanduser("~/.hermes/state.db")
POLL_INTERVAL_MS = 200


def _max_message_id() -> int:
    """Snapshot the current max message id (cursor for new rows)."""
    if not os.path.exists(DB_PATH):
        return 0
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        try:
            row = conn.execute("SELECT COALESCE(MAX(id), 0) FROM messages").fetchone()
            return int(row[0]) if row else 0
        finally:
            conn.close()
    except sqlite3.Error as e:
        logger.warning("Failed to read max message id: %s", e)
        return 0


def _fetch_new_rows(after_id: int) -> list[dict]:
    """Return messages newer than after_id, in id order."""
    if not os.path.exists(DB_PATH):
        return []
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                """
                SELECT id, session_id, role, content, tool_call_id, tool_calls, tool_name, timestamp
                FROM messages WHERE id > ?
                ORDER BY id
                """,
                (after_id,),
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()
    except sqlite3.Error as e:
        logger.warning("Failed to fetch new messages: %s", e)
        return []


def _row_to_events(row: dict) -> list[dict]:
    """Convert a DB row into one or more tool events for the frontend.

    Returns events of shape:
      {"type": "tool", "id": str, "status": "complete", "name": str,
       "arguments": str, "result": str | None, "isError": bool}
    """
    events = []
    role = row.get("role")

    if role == "assistant":
        # Assistant messages may include tool_calls JSON
        tc_str = row.get("tool_calls")
        if not tc_str:
            return events
        try:
            tool_calls = json.loads(tc_str)
        except Exception:
            return events
        if not isinstance(tool_calls, list):
            return events
        for tc in tool_calls:
            fn = (tc.get("function") or {})
            name = fn.get("name") or tc.get("name") or "unknown"
            args = fn.get("arguments") or tc.get("arguments") or ""
            call_id = tc.get("id") or tc.get("call_id") or f"call_{row['id']}_{name}"
            events.append({
                "type": "tool",
                "id": call_id,
                "status": "running",
                "name": name,
                "arguments": args if isinstance(args, str) else json.dumps(args),
            })

    elif role == "tool":
        # Tool result row — match to its assistant call by tool_call_id
        call_id = row.get("tool_call_id") or f"result_{row['id']}"
        name = row.get("tool_name") or "tool"
        content = row.get("content") or ""
        is_error = "error" in content.lower()[:200] or "does not exist" in content.lower()[:200]
        events.append({
            "type": "tool",
            "id": call_id,
            "status": "error" if is_error else "complete",
            "name": name,
            "result": content[:500],  # truncate large results
        })

    return events


async def poll_for_tools(
    on_tool: Callable[[dict], Awaitable[None]],
    stop_event: asyncio.Event,
    cursor_start: int,
    session_filter: str | None = None,
) -> None:
    """Poll until stop_event is set. Emit tool events for new rows.

    cursor_start: max message id at start (don't emit anything <= this)
    session_filter: if set, only emit events for this session_id (for
    multi-process safety). May be None initially; can be set later by
    caller mutating an external reference (we just compare on each poll).
    """
    cursor = cursor_start
    seen_call_ids: set[str] = set()

    while not stop_event.is_set():
        try:
            rows = await asyncio.to_thread(_fetch_new_rows, cursor)
        except Exception as e:
            logger.warning("Tool poll failed: %s", e)
            rows = []

        for row in rows:
            cursor = max(cursor, int(row["id"]))
            if session_filter and row.get("session_id") != session_filter:
                continue
            for ev in _row_to_events(row):
                # Dedupe — running event before complete
                key = f"{ev['id']}:{ev['status']}"
                if key in seen_call_ids:
                    continue
                seen_call_ids.add(key)
                try:
                    await on_tool(ev)
                except Exception as e:
                    logger.warning("on_tool callback raised: %s", e)

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=POLL_INTERVAL_MS / 1000)
        except asyncio.TimeoutError:
            pass

    # Final sweep after subprocess exits — catch anything written between last poll and exit
    try:
        rows = await asyncio.to_thread(_fetch_new_rows, cursor)
        for row in rows:
            if session_filter and row.get("session_id") != session_filter:
                continue
            for ev in _row_to_events(row):
                key = f"{ev['id']}:{ev['status']}"
                if key in seen_call_ids:
                    continue
                seen_call_ids.add(key)
                await on_tool(ev)
    except Exception:
        pass


def snapshot_cursor() -> int:
    """Public helper — caller calls this BEFORE spawning subprocess."""
    return _max_message_id()
