"""Echo-Hermes Bridge — FastAPI WebSocket server connecting Echo frontend to Hermes CLI."""

import asyncio
import json
import logging
import re
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from process_manager import SubprocessManager
from skills import discover_skills
from sessions import get_session_info

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

manager = SubprocessManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await manager.start()
    logger.info("Bridge started")
    yield
    await manager.stop()
    logger.info("Bridge stopped")


app = FastAPI(title="Echo-Hermes Bridge", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/skills")
async def get_skills():
    return await discover_skills()


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    info = get_session_info(session_id)
    if not info:
        return {"found": False}
    return {"found": True, **info}


@app.websocket("/ws/{thread_id}")
async def websocket_endpoint(websocket: WebSocket, thread_id: str):
    await websocket.accept()
    logger.info("WebSocket connected for thread %s", thread_id)

    try:
        await websocket.send_json({"type": "connected"})

        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            if data.get("type") != "message":
                continue

            content = data.get("content", "").strip()
            if not content:
                await websocket.send_json({"type": "error", "message": "Empty message"})
                continue

            skills = data.get("skills", [])
            client_session_id = data.get("sessionId")
            model = data.get("model")
            logger.info(
                "WS MESSAGE: thread=%s, client_sessionId=%s, skills=%s, model=%s",
                thread_id, client_session_id, skills, model,
            )

            # Always sync bridge's session state with client's sessionId (DB is source of truth)
            # If client sends a value, use it. If client sends None/empty, clear it (start new session).
            session = manager.get_or_create(thread_id)
            session.session_id = client_session_id if client_session_id else None
            logger.info("Session state for thread %s: session_id=%s", thread_id, session.session_id)

            # Signal that agent is thinking
            await websocket.send_json({"type": "thinking"})

            try:
                async def on_tool(event: dict):
                    await websocket.send_json(event)

                response, session_id, duration_ms = await manager.run_message(
                    thread_id, content,
                    on_tool=on_tool, skills=skills, model=model,
                )
                logger.info(
                    "Streaming response: thread=%s sessionId=%s response_len=%d duration_ms=%d",
                    thread_id, session_id, len(response), duration_ms,
                )

                # Fake-stream response text (Hermes -Q buffers full response at end)
                chunks = re.findall(r"\S+\s*|\s+", response)
                for chunk in chunks:
                    await websocket.send_json({"type": "chunk", "content": chunk})
                    await asyncio.sleep(0.015)

                await websocket.send_json({
                    "type": "done",
                    "sessionId": session_id,
                    "durationMs": duration_ms,
                })
            except Exception as e:
                logger.exception("Error running Hermes for thread %s", thread_id)
                await websocket.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for thread %s", thread_id)
    except Exception:
        logger.exception("Unexpected error in WebSocket for thread %s", thread_id)
