from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
from pydantic import BaseModel

from database import engine, get_db, Base
import models
import schemas

models.Base.metadata.create_all(bind=engine)

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

@app.get("/chores", response_model=list[schemas.Chore])
def read_chores(db: Session = Depends(get_db)):
    return db.query(models.Chore).all()

@app.post("/chores", response_model=schemas.Chore)
def create_chore(chore: schemas.ChoreCreate, db: Session = Depends(get_db)):
    db_chore = models.Chore(title=chore.title)
    db.add(db_chore)
    db.commit()
    db.refresh(db_chore)
    return db_chore

class ChoreUpdate(BaseModel):
    completed: bool

@app.put("/chores/{chore_id}", response_model=schemas.Chore)
def update_chore(chore_id: int, chore_update: ChoreUpdate, db: Session = Depends(get_db)):
    db_chore = db.query(models.Chore).filter(models.Chore.id == chore_id).first()
    if db_chore:
        db_chore.completed = chore_update.completed
        db.commit()
        db.refresh(db_chore)
    return db_chore

@app.delete("/chores/{chore_id}")
def delete_chore(chore_id: int, db: Session = Depends(get_db)):
    db_chore = db.query(models.Chore).filter(models.Chore.id == chore_id).first()
    if db_chore:
        db.delete(db_chore)
        db.commit()
    return {"status": "deleted"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

