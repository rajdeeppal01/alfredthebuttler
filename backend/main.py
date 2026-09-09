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
from integrations.obsidian import get_recent_obsidian_notes, create_obsidian_note, get_obsidian_graph
from integrations.voice import generate_audio_stream
from integrations.ai import process_voice_command

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
    try:
        docs = db.collection("chores").stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        return [{"error": str(e)}]

@app.post("/chores")
def create_chore(chore: schemas.ChoreCreate):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        doc_ref = db.collection("chores").document()
        doc_data = {"title": chore.title, "completed": False}
        doc_ref.set(doc_data)
        return {"id": doc_ref.id, **doc_data}
    except Exception as e:
        return {"error": str(e)}

class ChoreUpdate(BaseModel):
    completed: bool

@app.put("/chores/{chore_id}")
def update_chore(chore_id: str, chore_update: ChoreUpdate):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        doc_ref = db.collection("chores").document(chore_id)
        doc_ref.update({"completed": chore_update.completed})
        return {"id": chore_id, "completed": chore_update.completed}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/chores/{chore_id}")
def delete_chore(chore_id: str):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        db.collection("chores").document(chore_id).delete()
        return {"status": "deleted"}
    except Exception as e:
        return {"error": str(e)}

# --- Streaks API ---

@app.get("/streaks")
def read_streaks():
    if not db:
        return []
    try:
        docs = db.collection("streaks").stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        return [{"error": str(e)}]

@app.post("/streaks")
def create_streak(streak: schemas.StreakCreate):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        doc_ref = db.collection("streaks").document()
        doc_data = {
            "title": streak.title,
            "color": streak.color,
            "current_streak": 0,
            "longest_streak": 0,
            "last_completed_date": None
        }
        doc_ref.set(doc_data)
        return {"id": doc_ref.id, **doc_data}
    except Exception as e:
        return {"error": str(e)}

class StreakComplete(BaseModel):
    last_completed_date: str

@app.put("/streaks/{streak_id}")
def update_streak(streak_id: str, streak_update: StreakComplete):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        doc_ref = db.collection("streaks").document(streak_id)
        doc = doc_ref.get()
        if not doc.exists:
            return {"error": "Streak not found"}
        data = doc.to_dict()
        
        # Increment streak
        new_current = data.get("current_streak", 0) + 1
        new_longest = max(data.get("longest_streak", 0), new_current)
        
        update_data = {
            "current_streak": new_current,
            "longest_streak": new_longest,
            "last_completed_date": streak_update.last_completed_date
        }
        doc_ref.update(update_data)
        return {"id": streak_id, **data, **update_data}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/streaks/{streak_id}")
def delete_streak(streak_id: str):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        db.collection("streaks").document(streak_id).delete()
        return {"status": "deleted"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/reminders")
def read_reminders():
    if not db:
        return []
    try:
        docs = db.collection("reminders").stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        return [{"error": str(e)}]

@app.post("/reminders")
def create_reminder(reminder: schemas.ReminderCreate):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        doc_ref = db.collection("reminders").document()
        doc_data = {"title": reminder.title, "due_date": reminder.due_date}
        doc_ref.set(doc_data)
        return {"id": doc_ref.id, **doc_data}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/reminders/{reminder_id}")
def delete_reminder(reminder_id: str):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        db.collection("reminders").document(reminder_id).delete()
        return {"status": "deleted"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/sticky_notes")
def read_sticky_notes():
    if not db:
        return []
    try:
        docs = db.collection("sticky_notes").stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        return [{"error": str(e)}]

@app.post("/sticky_notes")
def create_sticky_note(note: schemas.StickyNoteCreate):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        doc_ref = db.collection("sticky_notes").document()
        doc_data = {"title": note.title, "content": note.content}
        doc_ref.set(doc_data)
        return {"id": doc_ref.id, **doc_data}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/sticky_notes/{note_id}")
def delete_sticky_note(note_id: str):
    if not db:
        return {"error": "Firebase not connected"}
    try:
        db.collection("sticky_notes").document(note_id).delete()
        return {"status": "deleted"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/emails")
def read_emails():
    return get_unread_emails()

@app.get("/projects/github")
def read_github():
    return get_github_notifications()

@app.get("/projects/obsidian")
def read_obsidian():
    return get_recent_obsidian_notes()

@app.get("/projects/obsidian/graph")
def read_obsidian_graph():
    return get_obsidian_graph()

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

@app.post("/chat")
def handle_chat(req: schemas.ChatRequest):
    from integrations.ai import process_voice_command
    
    intent = process_voice_command(req.text, req.context)
    action = intent.get("action", "none")
    response_text = intent.get("response", "I have processed your command.")
    
    if action == "add_chore":
        title = intent.get("title")
        if title:
            create_chore(schemas.ChoreCreate(title=title))
            
    elif action == "delete_chore":
        title = intent.get("title", "").lower()
        if title and db:
            docs = db.collection("chores").stream()
            for doc in docs:
                if title in doc.to_dict().get("title", "").lower():
                    db.collection("chores").document(doc.id).delete()
                    break

    elif action == "toggle_streak":
        title = intent.get("title", "").lower()
        if title and db:
            docs = db.collection("streaks").stream()
            from datetime import datetime
            today = datetime.now().strftime("%Y-%m-%d")
            
            for doc in docs:
                data = doc.to_dict()
                if title in data.get("title", "").lower():
                    if data.get("last_completed_date") != today:
                        new_current = data.get("current_streak", 0) + 1
                        new_longest = max(data.get("longest_streak", 0), new_current)
                        db.collection("streaks").document(doc.id).update({
                            "current_streak": new_current,
                            "longest_streak": new_longest,
                            "last_completed_date": today
                        })
                    break

    elif action == "add_note":
        title = intent.get("title", "Voice Note")
        content = intent.get("content", "")
        create_obsidian_note(title, content)
        
    elif action == "check_github":
        github_data = get_github_notifications()
        if not github_data:
            response_text = "I checked your GitHub account, but there are no recent pushes."
        elif github_data and "Error" in github_data[0].get("type", ""):
            error_msg = github_data[0].get("title", "Unknown error")
            response_text = f"I couldn't access your GitHub account. Error details: {error_msg}"
        else:
            data = github_data[0]
            repo = data.get("repository", "a repository")
            msg = data.get("title", "some commits")
            commits_today = data.get("commits_today", 0)
            dormant = data.get("dormant_repo", "None")
            
            response_text = f"Your latest push was to '{repo}' with the commit message: '{msg}'. "
            response_text += f"You have pushed {commits_today} commits across all repositories today. "
            if dormant != "None":
                response_text += f"By the way, you haven't touched the '{dormant}' repository in over a week."
            
    return {"response": response_text, "action": action}

@app.get("/list_models")
def list_models():
    api_key = os.getenv("GEMINI_API_KEY")
    import urllib.request, json
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

@app.get("/test_model")
def test_model():
    api_key = os.getenv("GEMINI_API_KEY")
    import urllib.request, json
    
    prompt = "Test prompt"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return {"error_code": e.code, "error_body": e.read().decode('utf-8')}
    except Exception as e:
        return {"error": str(e)}

@app.post("/generate_rundown")
def generate_rundown_endpoint(context: schemas.ChatRequest):
    from integrations.ai import generate_greeting
    greeting = generate_greeting(context.context)
    return {"greeting": greeting}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
