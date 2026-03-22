from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import FundraisingApplication, User
from schemas import FundraisingApplicationCreate, FundraisingApplicationOut
from auth import get_current_user
from services.notification_service import send_email
from datetime import datetime
from typing import List

router = APIRouter()

@router.post("/apply", response_model=FundraisingApplicationOut)
def apply_for_fundraising(
    application_data: FundraisingApplicationCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    current_user = db.query(User).filter(User.id == current_user_id).first()
    
    new_app = FundraisingApplication(
        **application_data.model_dump(),
        user_id=current_user_id,
        status="pending"
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    # ── EMAIL 1: Admin Notification ──
    admin_body = f"""
    <h2>New Fundraising Application Received</h2>
    <p><b>Name:</b> {new_app.name}</p>
    <p><b>Email:</b> {new_app.email}</p>
    <p><b>MediLink ID:</b> {current_user.medilink_id}</p>
    <p><b>Medical Condition:</b> {new_app.medical_condition}</p>
    <p><b>Amount Requested:</b> ₹{new_app.estimated_cost}</p>
    <p><b>Reason:</b> {new_app.description}</p>
    <p><b>Submitted At:</b> {new_app.created_at}</p>
    """
    send_email("medilinkorg68@gmail.com", f"New Fundraising Application — {new_app.name}", admin_body)
    
    # ── EMAIL 2: Applicant Confirmation ──
    applicant_body = f"""
    <h2>Thank you, {new_app.name}!</h2>
    <p>Your fundraising application has been received by MediLink.</p>
    <p><b>Application ID:</b> {new_app.id}</p>
    <p><b>Amount Requested:</b> ₹{new_app.estimated_cost}</p>
    <p>Our team will review your application within 3-5 business days.</p>
    <p>You will receive an update at this email address.</p>
    <p>You can withdraw your application at any time from your MediLink dashboard.</p>
    <br>
    <p>MediLink Emergency Medical System</p>
    """
    send_email(new_app.email, "MediLink — Your Fundraising Application Was Received", applicant_body)
    
    return new_app

@router.get("/my-applications", response_model=List[FundraisingApplicationOut])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    apps = db.query(FundraisingApplication).filter(FundraisingApplication.user_id == current_user_id).all()
    return apps


@router.put("/{application_id}/withdraw", response_model=FundraisingApplicationOut)
def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    """Sets status = 'withdrawn' and sends confirmation."""
    application = db.query(FundraisingApplication).filter(
        FundraisingApplication.id == application_id,
        FundraisingApplication.user_id == current_user_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized")
        
    if application.status in ["approved", "rejected", "withdrawn"]:
        raise HTTPException(status_code=400, detail=f"Cannot withdraw application in status: {application.status}")
        
    application.status = "withdrawn"
    db.commit()
    db.refresh(application)
    
    # Send email confirmation
    subject = "MediLink — Application Withdrawn"
    body = f"<p>Your fundraising application (ID: {application.id}) has been successfully withdrawn.</p>"
    send_email(application.email, subject, body)
    
    return application


@router.get("/approved", response_model=List[FundraisingApplicationOut])
def get_approved_applications(
    db: Session = Depends(get_db)
):
    """Public endpoint to see all verified fundraising campaigns."""
    return db.query(FundraisingApplication).filter(FundraisingApplication.status == "verified").all()
