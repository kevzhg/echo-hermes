"""Echo-Hermes Bridge — FastAPI WebSocket server with in-process Hermes Python API."""

import asyncio
import json
import logging
import os
import re
import tempfile
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.websockets import WebSocketState

from agent_runner import AgentRunner
from skills import discover_skills
from sessions import get_session_info, get_session_messages

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

runner = AgentRunner()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await runner.start()
    logger.info("Bridge started (Python API mode)")
    yield
    await runner.stop()
    logger.info("Bridge stopped")


app = FastAPI(title="Echo-Hermes Bridge", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = tempfile.mkdtemp(prefix="echo_uploads_")
logger.info("Upload directory: %s", UPLOAD_DIR)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
    path = os.path.join(UPLOAD_DIR, f"{os.urandom(8).hex()}{ext}")
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    logger.info("Image uploaded: %s (%d bytes)", path, len(content))
    return JSONResponse({"path": path, "size": len(content)})


@app.get("/api/skills")
async def get_skills():
    return await discover_skills()


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    info = get_session_info(session_id)
    if not info:
        return {"found": False}
    return {"found": True, **info}


@app.get("/api/sessions/{session_id}/messages")
async def get_session_msgs(session_id: str):
    return await asyncio.to_thread(get_session_messages, session_id)


# --- Wiki file sync -------------------------------------------------------

WIKI_CONFIG_PATH = os.path.expanduser("~/.echo/wiki_config.json")
_DEFAULT_WIKI_ROOT = os.path.expanduser(os.getenv("WIKI_ROOT", "~/wiki"))


def _load_wiki_root() -> str:
    """Read persisted wiki root from ~/.echo/wiki_config.json, fall back to env/default."""
    try:
        with open(WIKI_CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        root = data.get("root")
        if isinstance(root, str) and root:
            return os.path.expanduser(root)
    except FileNotFoundError:
        pass
    except Exception as e:
        logger.warning("Failed to read %s: %s — using default", WIKI_CONFIG_PATH, e)
    return _DEFAULT_WIKI_ROOT


def _save_wiki_root(root: str) -> None:
    os.makedirs(os.path.dirname(WIKI_CONFIG_PATH), exist_ok=True)
    tmp = WIKI_CONFIG_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"root": root}, f)
    os.replace(tmp, WIKI_CONFIG_PATH)


def _safe_wiki_path(root: str, relative: str) -> str:
    """Resolve `root/relative`, raise HTTPException if the path escapes root or is unsafe.

    Enforces:
      - relative is non-empty, no null bytes, no '..' segments
      - does not start with '/' or '~'
      - ends with '.md'
      - resolves (with symlinks) inside the real path of root
    """
    if not relative or "\x00" in relative:
        raise HTTPException(400, "invalid path")
    if relative.startswith(("/", "~")):
        raise HTTPException(400, "path must be relative to wiki root")
    # split on both '/' and os.sep so Windows-style slashes don't sneak through
    parts = [p for p in relative.replace("\\", "/").split("/") if p]
    if any(p == ".." or p == "." for p in parts):
        raise HTTPException(400, "path traversal not allowed")
    if not relative.endswith(".md"):
        raise HTTPException(400, "only .md files are supported")

    real_root = os.path.realpath(root)
    candidate = os.path.realpath(os.path.join(real_root, *parts))
    # Must stay under root (with a trailing sep guard against foo_bar/../foobarfile edge cases)
    if candidate != real_root and not candidate.startswith(real_root + os.sep):
        raise HTTPException(400, "path escapes wiki root")
    return candidate


def _wiki_config_payload() -> dict:
    root = _load_wiki_root()
    return {
        "root": root,
        "exists": os.path.isdir(root),
        "writable": os.path.isdir(root) and os.access(root, os.W_OK),
    }


class WikiConfigUpdate(BaseModel):
    root: str


class WikiSaveBody(BaseModel):
    path: str
    content: str


@app.get("/api/wiki/config")
async def wiki_get_config():
    return _wiki_config_payload()


@app.put("/api/wiki/config")
async def wiki_put_config(body: WikiConfigUpdate):
    root = os.path.expanduser(body.root.strip())
    if not root or not os.path.isabs(root):
        raise HTTPException(400, "root must be an absolute path")
    if not os.path.isdir(root):
        raise HTTPException(400, f"not a directory: {root}")
    if not os.access(root, os.W_OK):
        raise HTTPException(400, f"not writable: {root}")
    _save_wiki_root(root)
    return _wiki_config_payload()


@app.put("/api/wiki/save")
async def wiki_save(body: WikiSaveBody):
    root = _load_wiki_root()
    if not os.path.isdir(root):
        raise HTTPException(400, f"wiki root does not exist: {root}")
    target = _safe_wiki_path(root, body.path.strip())
    os.makedirs(os.path.dirname(target), exist_ok=True)
    tmp = target + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(body.content)
    os.replace(tmp, target)
    st = os.stat(target)
    logger.info("wiki saved: %s (%d bytes)", target, st.st_size)
    return {
        "path": body.path,
        "bytes": st.st_size,
        "modifiedAt": st.st_mtime,
    }


@app.get("/api/wiki/file")
async def wiki_read(path: str = Query(...)):
    root = _load_wiki_root()
    target = _safe_wiki_path(root, path.strip())
    if not os.path.isfile(target):
        return {"exists": False, "path": path}
    with open(target, "r", encoding="utf-8") as f:
        content = f.read()
    st = os.stat(target)
    return {
        "exists": True,
        "path": path,
        "content": content,
        "bytes": st.st_size,
        "modifiedAt": st.st_mtime,
    }


@app.get("/api/wiki/list")
async def wiki_list():
    root = _load_wiki_root()
    if not os.path.isdir(root):
        return {"root": root, "files": []}
    real_root = os.path.realpath(root)
    out: list[dict] = []
    # depth ≤ 2, skip _archive and hidden dirs, only .md files
    for entry in sorted(os.listdir(real_root)):
        if entry.startswith(".") or entry == "_archive":
            continue
        full = os.path.join(real_root, entry)
        if os.path.isfile(full) and entry.endswith(".md"):
            out.append({"path": entry, "bytes": os.path.getsize(full)})
        elif os.path.isdir(full):
            for sub in sorted(os.listdir(full)):
                if sub.startswith(".") or not sub.endswith(".md"):
                    continue
                sub_full = os.path.join(full, sub)
                if os.path.isfile(sub_full):
                    out.append({
                        "path": f"{entry}/{sub}",
                        "bytes": os.path.getsize(sub_full),
                    })
    return {"root": real_root, "files": out}


async def safe_send(ws: WebSocket, payload: dict) -> None:
    """Send JSON on a WebSocket that may have already closed. Never raises."""
    if ws.client_state != WebSocketState.CONNECTED:
        return
    try:
        await ws.send_json(payload)
    except (WebSocketDisconnect, RuntimeError) as e:
        logger.debug("safe_send skipped (%s): %s", type(e).__name__, e)


@app.websocket("/ws/{thread_id}")
async def websocket_endpoint(websocket: WebSocket, thread_id: str):
    await websocket.accept()
    logger.info("WebSocket connected for thread %s", thread_id)

    session = runner.get_or_create(thread_id)
    # Replace any prior sink. A previous connection's callbacks will now write here.
    session.sink = websocket

    try:
        await safe_send(websocket, {
            "type": "connected",
            "running": session.running,
            "sessionId": session.session_id,
            "currentMsgId": session.current_msg_id,
        })

        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await safe_send(websocket, {"type": "error", "message": "Invalid JSON"})
                continue

            if data.get("type") != "message":
                continue

            content = data.get("content", "").strip()
            if not content and not data.get("imagePath"):
                await safe_send(websocket, {"type": "error", "message": "Empty message"})
                continue

            skills = data.get("skills", [])
            client_session_id = data.get("sessionId")
            model = data.get("model")
            image_path = data.get("imagePath")
            msg_id = data.get("msgId")

            logger.info(
                "WS MESSAGE: thread=%s sessionId=%s model=%s skills=%s image=%s msgId=%s",
                thread_id, client_session_id, model, skills, bool(image_path), msg_id,
            )

            # Sync session state from client
            session.session_id = client_session_id if client_session_id else None
            session.current_msg_id = msg_id

            # Signal thinking (to whichever ws is currently attached)
            target = session.sink
            if target is not None:
                await safe_send(target, {"type": "thinking", "msgId": msg_id})

            try:
                # Callbacks read session.sink at call time so a reconnect re-routes the stream.
                async def on_chunk(delta: str):
                    sink = session.sink
                    if sink is not None:
                        await safe_send(sink, {"type": "chunk", "content": delta, "msgId": msg_id})

                async def on_tool(event: dict):
                    sink = session.sink
                    if sink is not None:
                        await safe_send(sink, {**event, "msgId": msg_id})

                response, session_id, duration_ms, token_usage = await runner.run_message(
                    thread_id,
                    content or "describe this image",
                    on_chunk=on_chunk,
                    on_tool=on_tool,
                    skills=skills,
                    model=model,
                    image_path=image_path,
                )

                logger.info(
                    "Done: thread=%s session=%s response_len=%d duration=%dms tokens_in=%d tokens_out=%d",
                    thread_id, session_id, len(response), duration_ms,
                    token_usage.get("input_tokens", 0), token_usage.get("output_tokens", 0),
                )

                sink = session.sink
                if sink is not None:
                    await safe_send(sink, {
                        "type": "done",
                        "sessionId": session_id,
                        "msgId": msg_id,
                        "durationMs": duration_ms,
                        "tokenUsage": token_usage,
                    })

            except Exception as e:
                logger.exception("Error running agent for thread %s", thread_id)
                sink = session.sink
                if sink is not None:
                    await safe_send(sink, {"type": "error", "msgId": msg_id, "message": str(e)})
            finally:
                session.current_msg_id = None

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for thread %s", thread_id)
    except Exception:
        logger.exception("Unexpected error in WebSocket for thread %s", thread_id)
    finally:
        # Only clear the sink if it still points at this socket — a later
        # reconnect may have already installed a new one.
        if session.sink is websocket:
            session.sink = None
