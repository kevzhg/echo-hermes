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

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
            if not content and not data.get("imagePath"):
                await websocket.send_json({"type": "error", "message": "Empty message"})
                continue

            skills = data.get("skills", [])
            client_session_id = data.get("sessionId")
            model = data.get("model")
            image_path = data.get("imagePath")

            logger.info(
                "WS MESSAGE: thread=%s sessionId=%s model=%s skills=%s image=%s",
                thread_id, client_session_id, model, skills, bool(image_path),
            )

            # Sync session state from client
            session = runner.get_or_create(thread_id)
            session.session_id = client_session_id if client_session_id else None

            # Signal thinking
            await websocket.send_json({"type": "thinking"})

            try:
                async def on_chunk(delta: str):
                    await websocket.send_json({"type": "chunk", "content": delta})

                async def on_tool(event: dict):
                    await websocket.send_json(event)

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

                await websocket.send_json({
                    "type": "done",
                    "sessionId": session_id,
                    "durationMs": duration_ms,
                    "tokenUsage": token_usage,
                })

            except Exception as e:
                logger.exception("Error running agent for thread %s", thread_id)
                await websocket.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for thread %s", thread_id)
    except Exception:
        logger.exception("Unexpected error in WebSocket for thread %s", thread_id)
