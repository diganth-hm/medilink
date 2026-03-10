from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import QRCode, User, MedicalProfile
from schemas import EmergencyDataOut

router = APIRouter()


@router.get("/{qr_token}", response_model=EmergencyDataOut)
def get_emergency_data(qr_token: str, db: Session = Depends(get_db)):
    qr_record = db.query(QRCode).filter(QRCode.qr_token == qr_token).first()
    if not qr_record:
        raise HTTPException(status_code=404, detail="Invalid or expired QR code")

    user = db.query(User).filter(User.id == qr_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient not found")

    profile = db.query(MedicalProfile).filter(MedicalProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Medical profile not found for this patient")

    return EmergencyDataOut(
        patient_name=user.name,
        blood_group=profile.blood_group,
        date_of_birth=profile.date_of_birth,
        allergies=profile.allergies,
        current_medications=profile.current_medications,
        chronic_conditions=profile.chronic_conditions,
        surgical_history=profile.surgical_history,
        immunization_records=profile.immunization_records,
        psychiatric_medications=profile.psychiatric_medications,
        emergency_contact_name=profile.emergency_contact_name,
        emergency_contact_phone=profile.emergency_contact_phone,
        emergency_contact_relation=profile.emergency_contact_relation,
        doctor_name=profile.doctor_name,
        doctor_phone=profile.doctor_phone,
        has_pacemaker=profile.has_pacemaker,
        has_implants=profile.has_implants,
        is_diabetic=profile.is_diabetic,
        is_cardiac_patient=profile.is_cardiac_patient,
        is_epileptic=profile.is_epileptic,
        is_asthmatic=profile.is_asthmatic,
    )
