from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, MedicalProfile
from schemas import MedicalProfileCreate, MedicalProfileUpdate, MedicalProfileOut
from pydantic import BaseModel
from auth import get_current_user
from datetime import datetime
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

router = APIRouter()

# ── Helper: lazily import to avoid circular imports ───────────────────────────
def _get_gen():
    from main import generate_medilink_id
    return generate_medilink_id

def _ensure_medilink_id(user: User, db: Session) -> str:
    """Generate and persist a medilink_id if the user doesn't have one yet."""
    if not user.medilink_id:
        generate_medilink_id = _get_gen()
        # Collision-safe loop (extremely unlikely to iterate)
        for _ in range(10):
            candidate = generate_medilink_id()
            collision = db.query(User).filter(User.medilink_id == candidate).first()
            if not collision:
                user.medilink_id = candidate
                db.commit()
                db.refresh(user)
                break
    return user.medilink_id


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
    profile = db.query(MedicalProfile).filter(
        MedicalProfile.user_id == user.id,
        MedicalProfile.date_of_birth == dob
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Verification failed. Details do not match our records.")

    return {
        "verified": True,
        "patientName": user.name,
        "patientId": user.id,
        "mobile": user.mobile_number,
        "email": user.email,
    }


def _profile_response(profile: MedicalProfile, user: User) -> dict:
    """Build a dict from MedicalProfileOut + inject medilink_id from the user model."""
    out = MedicalProfileOut.model_validate(profile).model_dump()
    out["medilink_id"] = user.medilink_id
    return out


@router.get("/profile")
def get_profile(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    profile = db.query(MedicalProfile).filter(MedicalProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Medical profile not found")
    return _profile_response(profile, user)


@router.post("/profile", status_code=status.HTTP_201_CREATED)
def create_profile(
    profile_data: MedicalProfileCreate,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(MedicalProfile).filter(MedicalProfile.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists. Use PUT to update.")

    user = db.query(User).filter(User.id == user_id).first()
    _ensure_medilink_id(user, db)

    profile = MedicalProfile(user_id=user_id, **profile_data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _profile_response(profile, user)


@router.put("/profile")
def update_profile(
    profile_data: MedicalProfileUpdate,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    _ensure_medilink_id(user, db)

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
    return _profile_response(profile, user)
