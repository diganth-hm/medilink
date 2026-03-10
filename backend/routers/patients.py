from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, MedicalProfile
from schemas import MedicalProfileCreate, MedicalProfileUpdate, MedicalProfileOut
from auth import get_current_user
from datetime import datetime

router = APIRouter()


@router.get("/profile", response_model=MedicalProfileOut)
def get_profile(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(MedicalProfile).filter(MedicalProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Medical profile not found")
    return profile


@router.post("/profile", response_model=MedicalProfileOut, status_code=status.HTTP_201_CREATED)
def create_profile(profile_data: MedicalProfileCreate, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(MedicalProfile).filter(MedicalProfile.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists. Use PUT to update.")

    profile = MedicalProfile(user_id=user_id, **profile_data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/profile", response_model=MedicalProfileOut)
def update_profile(profile_data: MedicalProfileUpdate, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(MedicalProfile).filter(MedicalProfile.user_id == user_id).first()
    if not profile:
        # Auto-create if doesn't exist
        profile = MedicalProfile(user_id=user_id, **profile_data.model_dump())
        db.add(profile)
    else:
        for key, value in profile_data.model_dump().items():
            setattr(profile, key, value)
        profile.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(profile)
    return profile
