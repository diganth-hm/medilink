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

router = APIRouter()

BASE_URL = "https://medilink-1hjl.vercel.app"


@router.post("/generate", response_model=QRCodeOut)
def generate_qr(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    # Invalidate old QR codes
    db.query(QRCode).filter(QRCode.user_id == user_id).delete()

    qr_token = str(uuid.uuid4())
    new_qr = QRCode(user_id=user_id, qr_token=qr_token)
    db.add(new_qr)
    db.commit()
    db.refresh(new_qr)
    return new_qr


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
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@router.get("/my-qr-info")
def get_my_qr_info(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    qr_record = db.query(QRCode).filter(QRCode.user_id == user_id).order_by(QRCode.created_at.desc()).first()
    if not qr_record:
        raise HTTPException(status_code=404, detail="No QR code found.")
    return {
        "qr_token": qr_record.qr_token,
        "emergency_url": f"{BASE_URL}/emergency/{qr_record.qr_token}",
        "created_at": qr_record.created_at
    }
