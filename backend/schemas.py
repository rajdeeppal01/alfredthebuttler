from pydantic import BaseModel

class ChoreBase(BaseModel):
    title: str

class ChoreCreate(ChoreBase):
    pass

class Chore(ChoreBase):
    id: int
    completed: bool

    class Config:
        from_attributes = True
