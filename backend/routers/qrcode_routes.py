from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import QRCode, User
from schemas import QRCodeOut
from auth import get_current_user
import qrcode
import io
import uuid
from jose import jwt
from datetime import datetime, timedelta
import hashlib
from auth import SECRET_KEY, ALGORITHM

router = APIRouter()

BASE_URL = "https://medilink-1hjl.vercel.app"


@router.post("/generate", response_model=QRCodeOut)
def generate_qr(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Generate a new QR token as a JWT with 24h expiry.
    Stores the hash in the User record for validation.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. Create JWT token
    exp = datetime.utcnow() + timedelta(hours=24)
    token_payload = {"sub": str(user_id), "type": "qr", "exp": exp}
    qr_token = jwt.encode(token_payload, SECRET_KEY, algorithm=ALGORITHM)
    
    # 2. Hash it for storage/validation
    token_hash = hashlib.sha256(qr_token.encode()).hexdigest()
    user.current_qr_token_hash = token_hash
    
    # Still keep a record in qr_codes table for history/compatibility
    db.query(QRCode).filter(QRCode.user_id == user_id).delete()
    new_qr = QRCode(user_id=user_id, qr_token=qr_token)
    db.add(new_qr)
    
    db.commit()
    db.refresh(new_qr)
    return new_qr

@router.post("/regenerate", response_model=QRCodeOut)
def regenerate_qr(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """Forces generation of a new QR token, invalidating the old one."""
    return generate_qr(user_id, db)


@router.get("/my-qr")
def get_my_qr(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    qr_record = db.query(QRCode).filter(QRCode.user_id == user_id).order_by(QRCode.created_at.desc()).first()
    if not qr_record:
        raise HTTPException(status_code=404, detail="No QR code found. Please generate one first.")

    # Generate QR image
    emergency_url = f"{BASE_URL}/emergency/{qr_record.qr_token}"
    qr_img = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr_img.add_data(emergency_url)
    qr_img.make(fit=True)
    img = qr_img.make_image(fill_color="#1e293b", back_color="white")

    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@router.get("/my-qr-info")
def get_my_qr_info(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    qr_record = db.query(QRCode).filter(QRCode.user_id == user_id).order_by(QRCode.created_at.desc()).first()
    if not qr_record:
        raise HTTPException(status_code=404, detail="No QR code found.")
    user = db.query(User).filter(User.id == user_id).first()
    return {
        "qr_token": qr_record.qr_token,
        "medilink_id": user.medilink_id if user else None,
        "emergency_url": f"{BASE_URL}/emergency/{qr_record.qr_token}",
        "created_at": qr_record.created_at
    }
