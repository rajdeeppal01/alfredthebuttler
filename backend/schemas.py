from pydantic import BaseModel
from typing import Optional, Dict, Any

class ChoreBase(BaseModel):
    title: str

class ChoreCreate(ChoreBase):
    pass

class Chore(ChoreBase):
    id: int
    completed: bool

    class Config:
        from_attributes = True

class NoteCreate(BaseModel):
    title: str
    content: str

class ChatRequest(BaseModel):
    text: str
    context: Optional[Dict[str, Any]] = None

class ReminderBase(BaseModel):
    title: str
    due_date: str

class ReminderCreate(ReminderBase):
    pass

class Reminder(ReminderBase):
    id: int

    class Config:
        from_attributes = True

class StickyNoteBase(BaseModel):
    title: str
    content: str

class StickyNoteCreate(StickyNoteBase):
    pass

class StickyNote(StickyNoteBase):
    id: str

    class Config:
        from_attributes = True

class StreakBase(BaseModel):
    title: str
    color: str

class StreakCreate(StreakBase):
    pass

class Streak(StreakBase):
    id: str
    current_streak: int
    longest_streak: int
    last_completed_date: Optional[str] = None

    class Config:
        from_attributes = True
