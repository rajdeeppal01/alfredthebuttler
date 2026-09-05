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
