"""Query Hermes SQLite session store for session metadata."""

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
            return dict(row)
        finally:
            conn.close()
    except sqlite3.Error as e:
        logger.warning("Failed to query session %s: %s", session_id, e)
        return None
