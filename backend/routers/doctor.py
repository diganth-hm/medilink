from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import QRCode, User, MedicalProfile, MedicalRecord
from schemas import MedicalRecordOut
from auth import get_current_user
from typing import List

router = APIRouter()


def _require_doctor(current_user_id: int, db: Session) -> User:
    """Ensures the requesting user is an authenticated doctor."""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "doctor":
        raise HTTPException(status_code=403, detail="Access denied: Doctor role required")
    return user


@router.get("/patient-records/{qr_token}")
def get_patient_full_records(
    qr_token: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    """
    Full medical disclosure for verified doctors only.
    Returns: complete medical profile + all uploaded documents.
    """
    _require_doctor(current_user_id, db)

    # Resolve patient from QR token
    qr_record = db.query(QRCode).filter(QRCode.qr_token == qr_token).first()
    if not qr_record:
        raise HTTPException(status_code=404, detail="Invalid or expired QR code")

    patient = db.query(User).filter(User.id == qr_record.user_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    profile = db.query(MedicalProfile).filter(MedicalProfile.user_id == patient.id).first()
    records = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.user_id == patient.id)
        .order_by(MedicalRecord.uploaded_at.desc())
        .all()
    )

    record_list = [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "file_type": r.file_type,
            "original_filename": r.original_filename,
            "file_size": r.file_size,
            "uploaded_at": r.uploaded_at.isoformat(),
            "download_url": f"/records/{r.id}/download",
        }
        for r in records
    ]

    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "email": patient.email,
            "role": patient.role,
        },
        "medical_profile": {
            "blood_group": profile.blood_group if profile else None,
            "date_of_birth": profile.date_of_birth if profile else None,
            "allergies": profile.allergies if profile else None,
            "current_medications": profile.current_medications if profile else None,
            "chronic_conditions": profile.chronic_conditions if profile else None,
            "surgical_history": profile.surgical_history if profile else None,
            "immunization_records": profile.immunization_records if profile else None,
            "psychiatric_medications": profile.psychiatric_medications if profile else None,
            "emergency_contact_name": profile.emergency_contact_name if profile else None,
            "emergency_contact_phone": profile.emergency_contact_phone if profile else None,
            "emergency_contact_relation": profile.emergency_contact_relation if profile else None,
            "doctor_name": profile.doctor_name if profile else None,
            "doctor_phone": profile.doctor_phone if profile else None,
            "has_pacemaker": profile.has_pacemaker if profile else None,
            "has_implants": profile.has_implants if profile else None,
            "is_diabetic": profile.is_diabetic if profile else None,
            "is_cardiac_patient": profile.is_cardiac_patient if profile else None,
            "is_epileptic": profile.is_epileptic if profile else None,
            "is_asthmatic": profile.is_asthmatic if profile else None,
            "updated_at": profile.updated_at.isoformat() if profile and profile.updated_at else None,
        } if profile else None,
        "uploaded_records": record_list,
        "total_records": len(record_list),
    }
