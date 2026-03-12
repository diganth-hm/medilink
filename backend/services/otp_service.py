import random
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import OTPRecord
import os

OTP_EXPIRY_MINUTES = 2

def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))

def create_otp(db: Session, identifier: str) -> str:
    # Clear existing OTPs for this identifier
    db.query(OTPRecord).filter(OTPRecord.identifier == identifier).delete()
    
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    db_otp = OTPRecord(
        identifier=identifier,
        otp_code=otp_code,
        expires_at=expires_at,
        attempts=0
    )
    db.add(db_otp)
    db.commit()
    return otp_code

def verify_otp(db: Session, identifier: str, otp_code: str) -> bool:
    otp_record = db.query(OTPRecord).filter(OTPRecord.identifier == identifier).first()
    
    if not otp_record:
        return False
    
    if datetime.utcnow() > otp_record.expires_at:
        db.delete(otp_record)
        db.commit()
        return False
    
    if otp_record.attempts >= 5:
        return False
    
    if otp_record.otp_code == otp_code:
        db.delete(otp_record)
        db.commit()
        return True
    else:
        otp_record.attempts += 1
        db.commit()
        return False
