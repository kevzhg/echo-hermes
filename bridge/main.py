"""Echo-Hermes Bridge — FastAPI WebSocket server connecting Echo frontend to Hermes CLI."""

import json
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from process_manager import SubprocessManager
from skills import discover_skills

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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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

            # Signal that agent is thinking
            await websocket.send_json({"type": "thinking"})

            try:
                response = await manager.run_message(thread_id, content, skills=skills)
                await websocket.send_json({"type": "done", "content": response})
            except Exception as e:
                logger.exception("Error running Hermes for thread %s", thread_id)
                await websocket.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for thread %s", thread_id)
    except Exception:
        logger.exception("Unexpected error in WebSocket for thread %s", thread_id)
