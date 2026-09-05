from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
import uvicorn
from pydantic import BaseModel
from fastapi.responses import FileResponse
from fastapi.responses import FileResponse, Response
import os

import schemas
from integrations.gmail import get_unread_emails
from integrations.github import get_github_notifications
from integrations.obsidian import get_recent_obsidian_notes, create_obsidian_note
from integrations.voice import generate_audio_stream

import json

# Initialize Firebase
firebase_env = os.getenv("FIREBASE_SERVICE_ACCOUNT")
db = None

if firebase_env:
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(json.loads(firebase_env))
            firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"Firebase Init Error: {e}")
        db = None
else:
    cred_path = os.path.join(os.path.dirname(__file__), 'firebase_credentials.json')
    if os.path.exists(cred_path):
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        db = firestore.client()

app = FastAPI(title="Assistant Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Assistant Backend is running"}

@app.get("/chores")
def read_chores():
    if not db:
        return []
    docs = db.collection("chores").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@app.post("/chores")
def create_chore(chore: schemas.ChoreCreate):
    if not db:
        return {"error": "Firebase not connected"}
    doc_ref = db.collection("chores").document()
    doc_data = {"title": chore.title, "completed": False}
    doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}

class ChoreUpdate(BaseModel):
    completed: bool

@app.put("/chores/{chore_id}")
def update_chore(chore_id: str, chore_update: ChoreUpdate):
    if not db:
        return {"error": "Firebase not connected"}
    doc_ref = db.collection("chores").document(chore_id)
    doc_ref.update({"completed": chore_update.completed})
    return {"id": chore_id, "completed": chore_update.completed}

@app.delete("/chores/{chore_id}")
def delete_chore(chore_id: str):
    if not db:
        return {"error": "Firebase not connected"}
    db.collection("chores").document(chore_id).delete()
    return {"status": "deleted"}


@app.get("/emails")
def read_emails():
    return get_unread_emails()

@app.get("/projects/github")
def read_github():
    return get_github_notifications()

@app.get("/projects/obsidian")
def read_obsidian():
    return get_recent_obsidian_notes()

@app.post("/projects/obsidian")
def add_obsidian_note(note: schemas.NoteCreate):
    success = create_obsidian_note(note.title, note.content)
    if success:
        return {"status": "created"}
    return {"error": "Failed to create note"}

@app.get("/voice/play")
async def play_voice(text: str):
    audio_bytes = await generate_audio_stream(text)
    return Response(content=audio_bytes, media_type="audio/mpeg")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
