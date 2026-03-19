import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, OTPToken
from schemas import UserRegister, UserLogin, Token, UserOut, OTPRequest, OTPVerify
from auth import hash_password, verify_password, create_access_token, get_current_user
from services.otp_service import create_otp, verify_otp, get_otp_remaining_seconds
from services.notification_service import send_email, send_sms
from pydantic import BaseModel
import os

logger = logging.getLogger("medilink.auth")

router = APIRouter()

class BiometricEnrollRequest(BaseModel):
    biometric_template: str

class BiometricVerifyRequest(BaseModel):
    credential_id: str

OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    valid_roles = ["patient", "doctor", "hospital", "responder"]
    if user_data.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info("[AUTH] New user registered: %s (role=%s)", user_data.email, user_data.role)
    token = create_access_token(data={"sub": str(new_user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(new_user)
    )


@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Standard email + password login. Now returns otp_required."""
    if user_data.email and user_data.password:
        user = db.query(User).filter(User.email == user_data.email).first()
        if not user or not verify_password(user_data.password, user.password_hash):
            logger.warning("[AUTH] Failed password login for: %s", user_data.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        logger.info("[AUTH] Password matched for: %s, requiring OTP", user_data.email)
        return {"status": "otp_required", "identifier": user.email}
    else:
        raise HTTPException(
            status_code=400,
            detail="Please provide email and password. For OTP login use /send-otp and /verify-otp."
        )


@router.post("/send-otp")
async def send_otp_route(request: OTPRequest, db: Session = Depends(get_db)):
    """
    Generate a 6-digit OTP for the given email or mobile number.
    The OTP is bcrypt-hashed in storage and delivered via SMTP/SMS.
    In dev mode (no credentials configured), the OTP appears in server logs.
    """
    print(f"[DEBUG] send-otp called")
    print(f"[DEBUG] SMTP_USER present: {bool(os.getenv('SMTP_USER'))}")
    print(f"[DEBUG] SMTP_PASS present: {bool(os.getenv('SMTP_PASS'))}")
    
    print(f"[DEBUG] send-otp called with data: {request}")
    identifier = request.identifier.strip()

    # Verify the user exists before sending OTP (security: don't reveal if user exists vs not)
    user = db.query(User).filter(
        (User.email == identifier) | (User.mobile_number == identifier)
    ).first()

    # Always generate OTP and try to send — don't leak user existence
    channel = request.channel.strip().lower()
    otp_code = create_otp(db, identifier, channel)

    is_email = (channel == "email")
    expiry_min = OTP_EXPIRY_MINUTES
    
    otp_message = (
        f"Your verification OTP is: {otp_code}\n"
        f"This OTP expires in {expiry_min} minutes."
    )

    sent = False
    if is_email:
        sent = send_email(identifier, "Your Login OTP", otp_message)
        if sent:
            logger.info("[AUTH] OTP generation and email send SUCCESS for %s", identifier)
        else:
            logger.error("[AUTH] OTP generated but email sending FAILED for %s", identifier)
    else:
        sent = send_sms(identifier, otp_message)
        logger.info("[AUTH] OTP SMS %s for %s", "sent" if sent else "FAILED (dev mode)", identifier)

    # TODO: REMOVE BEFORE PRODUCTION DEPLOYMENT
    if not sent or os.getenv("ENVIRONMENT") != "production":
        print(f"\n[DEV MODE] DEV OTP for {identifier}: {otp_code}\n")

    response = {
        "message": "OTP generated successfully.",
        "expires_in_seconds": expiry_min * 60,
    }

    # Raise error if real delivery failed (never fall back silently in production)
    if not sent and os.getenv("ENVIRONMENT") == "production":
        raise HTTPException(
            status_code=500,
            detail="Email or SMS service not configured. Please contact support."
        )

    if user is None:
        # Don't expose that user doesn't exist, but log it
        logger.warning("[AUTH] OTP requested for unregistered identifier: %s", identifier)

    return response


@router.post("/verify-otp")
def verify_otp_route(request: OTPVerify, db: Session = Depends(get_db)):
    """
    Verify the OTP and return a JWT access token on success.
    """
    identifier = request.identifier.strip()
    otp_code = request.otp_code.strip()

    logger.info("[AUTH] OTP verification attempt for %s", identifier)

    if not verify_otp(db, identifier, otp_code):
        # Check if record still exists (i.e. wrong code vs expired)
        record = db.query(OTPToken).filter(OTPToken.identifier == identifier, OTPToken.used == False).first()
        if record and record.attempts >= 5:
            detail = "Too many failed attempts. Please request a new OTP."
        else:
            detail = "Invalid or expired OTP. Please try again."
        raise HTTPException(status_code=400, detail=detail)

    # Resolve user
    user = db.query(User).filter(
        (User.email == identifier) | (User.mobile_number == identifier)
    ).first()

    if not user:
        logger.info("[AUTH] OTP verified for new registration: %s", identifier)
        return {"status": "verified", "message": "OTP verified successfully. Proceed to registration."}

    token = create_access_token(data={"sub": str(user.id)})
    logger.info("[AUTH] OTP login success for user %s (%s)", user.id, identifier)

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/biometric/enroll")
def enroll_biometric(request: BiometricEnrollRequest, db: Session = Depends(get_db), current_user_id: int = Depends(get_current_user)):
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.biometric_template = request.biometric_template
    db.commit()
    logger.info("[AUTH] Biometric enrolled for user %s", user.id)
    return {"success": True, "message": "Biometric enrolled successfully"}


@router.post("/biometric/verify")
def verify_biometric(request: BiometricVerifyRequest, db: Session = Depends(get_db)):
    # In a real app, you would verify the signature/challenge using a library like fido2
    # For this prototype we match the credential ID (template) stored during enrollment
    
    user = db.query(User).filter(User.biometric_template == request.credential_id).first()
    if not user:
        logger.warning("[AUTH] Biometric verification failed: no matching template found")
        raise HTTPException(status_code=404, detail="No matching biometric enrollment found")
        
    token = create_access_token(data={"sub": str(user.id)})
    logger.info("[AUTH] Biometric login success for user %s", user.id)
    
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user).model_dump()
    }
