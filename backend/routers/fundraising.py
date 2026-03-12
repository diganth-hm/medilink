from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import FundraisingApplication
from schemas import FundraisingApplicationCreate, FundraisingApplicationOut
from auth import get_current_user
from services.notification_service import notify_admin_fundraising
from typing import List

router = APIRouter()

@router.post("/apply", response_model=FundraisingApplicationOut)
def apply_for_fundraising(
    application_data: FundraisingApplicationCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    new_app = FundraisingApplication(
        **application_data.model_dump(),
        user_id=current_user_id
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    # Notify Admin
    notify_admin_fundraising(application_data.model_dump())
    
    return new_app

@router.get("/my-applications", response_model=List[FundraisingApplicationOut])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    apps = db.query(FundraisingApplication).filter(FundraisingApplication.user_id == current_user_id).all()
    return apps
