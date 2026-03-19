from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, MedicalProfile
from schemas import MedicalProfileCreate, MedicalProfileUpdate, MedicalProfileOut
from pydantic import BaseModel
from auth import get_current_user
from datetime import datetime

router = APIRouter()

class PatientVerifyRequest(BaseModel):
    patient_identifier: str
    date_of_birth: str

@router.post("/verify")
def verify_patient(request: PatientVerifyRequest, db: Session = Depends(get_db)):
    # This route is public so it doesn't need get_current_user
    identifier = request.patient_identifier.strip()
    dob = request.date_of_birth.strip()
    
    # Try by mobile or email
    user = db.query(User).filter(
        (User.mobile_number == identifier) | 
        (User.email == identifier)
    ).first()
    
    if not user:
        # Try checking if identifier is purely digits and might be ID
        if identifier.isdigit():
            user = db.query(User).filter(User.id == int(identifier)).first()
            
    if not user:
        raise HTTPException(status_code=404, detail="No patient account found. Please register as a patient first.")
        
    # Now check DOB in medical profile
    profile = db.query(MedicalProfile).filter(MedicalProfile.user_id == user.id, MedicalProfile.date_of_birth == dob).first()
    if not profile:
        # If the user doesn't have a profile or DOB doesn't match
        # Let's be lenient if no profile exists for demo purposes, but strictly we reject it
        raise HTTPException(status_code=404, detail="Verification failed. Details do not match our records.")
        
    return {
        "verified": True,
        "patientName": user.name,
        "patientId": user.id,
        "mobile": user.mobile_number,
        "email": user.email
    }

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
