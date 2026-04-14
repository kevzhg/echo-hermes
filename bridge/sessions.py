"""Query Hermes SQLite session store for session metadata and messages."""

import json
import logging
import os
import sqlite3

logger = logging.getLogger(__name__)

DB_PATH = os.path.expanduser("~/.hermes/state.db")


def get_session_info(session_id: str) -> dict | None:
    """Return session metadata: tokens, message count, model, title, cost."""
    if not os.path.exists(DB_PATH):
        return None

    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        try:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, title, model, message_count, tool_call_count,
                       input_tokens, output_tokens, cache_read_tokens,
                       cache_write_tokens, reasoning_tokens, estimated_cost_usd,
                       started_at, ended_at
                FROM sessions WHERE id = ?
                """,
                (session_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            result = dict(row)

            # Estimate CURRENT context window usage (not cumulative API total).
            # DB input_tokens sums ALL API calls across ALL turns (inflated).
            # Real context = system prompt (~25k) + conversation content.
            # Estimate conversation content from message text length / 4.
            cur.execute(
                "SELECT COALESCE(SUM(LENGTH(content)), 0) FROM messages WHERE session_id = ?",
                (session_id,),
            )
            total_chars = cur.fetchone()[0] or 0
            conversation_tokens = total_chars // 4
            system_prompt_estimate = 25000  # Hermes system prompt is ~20-30k tokens
            result["estimated_context_tokens"] = conversation_tokens + system_prompt_estimate

            return result
        finally:
            conn.close()
    except sqlite3.Error as e:
        logger.warning("Failed to query session %s: %s", session_id, e)
        return None


def get_session_messages(session_id: str) -> list[dict]:
    """Return all messages for a session, ordered by timestamp."""
    if not os.path.exists(DB_PATH):
        return []

    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                """
                SELECT id, role, content, tool_call_id, tool_calls, tool_name,
                       reasoning, timestamp
                FROM messages
                WHERE session_id = ?
                ORDER BY id
                """,
                (session_id,),
            ).fetchall()
            result = []
            for r in rows:
                msg: dict = {
                    "id": r["id"],
                    "role": r["role"],
                    "content": (r["content"] or "")[:2000],
                    "timestamp": r["timestamp"],
                }
                if r["tool_name"]:
                    msg["toolName"] = r["tool_name"]
                if r["tool_call_id"]:
                    msg["toolCallId"] = r["tool_call_id"]
                if r["tool_calls"]:
                    try:
                        tc = json.loads(r["tool_calls"])
                        msg["toolCalls"] = [
                            {"name": (t.get("function") or {}).get("name") or "unknown",
                             "arguments": ((t.get("function") or {}).get("arguments") or "")[:500]}
                            for t in (tc if isinstance(tc, list) else [])
                        ]
                    except Exception:
                        pass
                if r["reasoning"]:
                    msg["reasoning"] = (r["reasoning"] or "")[:1000]
                result.append(msg)
            return result
        finally:
            conn.close()
    except sqlite3.Error as e:
        logger.warning("Failed to get messages for session %s: %s", session_id, e)
        return []
