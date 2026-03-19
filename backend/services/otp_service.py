"""
OTP Service — secure OTP generation, storage (bcrypt-hashed), and verification.
Features:
  - 6-digit random OTP
  - bcrypt-hashed before DB storage
  - 5-minute expiry (configurable via OTP_EXPIRY_MINUTES env var)
  - Max 5 verification attempts
  - Old OTPs cleaned up on each new request for the same identifier
"""

import random
import string
import logging
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from models import OTPToken

logger = logging.getLogger("medilink.otp")

OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "15"))
MAX_ATTEMPTS = 5

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_otp(otp: str) -> str:
    return _pwd_ctx.hash(otp)


def _verify_otp_hash(plain: str, hashed: str) -> bool:
    return _pwd_ctx.verify(plain, hashed)


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically random numeric OTP."""
    return "".join(random.choices(string.digits, k=length))


def create_otp(db: Session, identifier: str, channel: str) -> str:
    """
    Create a new OTP for the given identifier (email or phone).
    - Clears any existing OTPs for the identifier.
    - Stores a bcrypt hash — never the raw code.
    - Returns the raw OTP (to be sent to the user).
    """
    # Remove stale records
    db.query(OTPToken).filter(OTPToken.identifier == identifier).delete()
    db.commit()

    otp_code = generate_otp()
    print(f"[DEBUG] Generated OTP: {otp_code} for identifier: {identifier}")
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    db_otp = OTPToken(
        identifier=identifier,
        otp_code=_hash_otp(otp_code),   # store hash, not plain text
        channel=channel,
        expires_at=expires_at,
        used=False,
        attempts=0,
    )
    db.add(db_otp)
    db.commit()

    logger.info("[OTP] Generated OTP for %s on channel %s (expires in %d min)", identifier, channel, OTP_EXPIRY_MINUTES)
    return otp_code   # return plain code so notification_service can send it


def verify_otp(db: Session, identifier: str, otp_code: str) -> bool:
    """
    Verify OTP for identifier.
    - Checks expiry.
    - Checks attempt limit.
    - Verifies bcrypt hash.
    - Marks as used on success.
    - Increments attempt counter on failure.
    """
    otp_record = db.query(OTPToken).filter(OTPToken.identifier == identifier).first()

    if not otp_record or otp_record.used:
        logger.warning("[OTP] Verification attempt for %s — no valid active record found", identifier)
        return False

    if datetime.utcnow() > otp_record.expires_at:
        db.delete(otp_record)
        db.commit()
        logger.warning("[OTP] OTP expired for %s", identifier)
        return False

    if otp_record.attempts >= MAX_ATTEMPTS:
        logger.warning("[OTP] Max attempts exceeded for %s", identifier)
        return False

    if _verify_otp_hash(otp_code, otp_record.otp_code):
        otp_record.used = True
        db.commit()
        logger.info("[OTP] OTP verified successfully for %s", identifier)
        return True
    else:
        otp_record.attempts += 1
        db.commit()
        logger.warning(
            "[OTP] Invalid OTP for %s (attempt %d/%d)",
            identifier, otp_record.attempts, MAX_ATTEMPTS
        )
        return False


def get_otp_remaining_seconds(db: Session, identifier: str) -> int:
    """Return seconds remaining until OTP expires, or 0 if not found/expired/used."""
    record = db.query(OTPToken).filter(OTPToken.identifier == identifier, OTPToken.used == False).first()
    if not record:
        return 0
    remaining = (record.expires_at - datetime.utcnow()).total_seconds()
    return max(0, int(remaining))
