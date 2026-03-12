import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, OTPRecord
from schemas import UserRegister, UserLogin, Token, UserOut, OTPRequest, OTPVerify
from auth import hash_password, verify_password, create_access_token
from services.otp_service import create_otp, verify_otp, get_otp_remaining_seconds
from services.notification_service import send_email, send_sms
import os

logger = logging.getLogger("medilink.auth")

router = APIRouter()

OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
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
    return new_user


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Standard email + password login."""
    if user_data.email and user_data.password:
        user = db.query(User).filter(User.email == user_data.email).first()
        if not user or not verify_password(user_data.password, user.password_hash):
            logger.warning("[AUTH] Failed password login for: %s", user_data.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        logger.info("[AUTH] Password login success: %s", user_data.email)
        token = create_access_token(data={"sub": str(user.id)})
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserOut.model_validate(user)
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Please provide email and password. For OTP login use /send-otp and /verify-otp."
        )


@router.post("/send-otp")
def send_otp_route(request: OTPRequest, db: Session = Depends(get_db)):
    """
    Generate a 6-digit OTP for the given email or mobile number.
    The OTP is bcrypt-hashed in storage and delivered via SMTP/SMS.
    In dev mode (no credentials configured), the OTP appears in server logs.
    """
    identifier = request.identifier.strip()

    # Verify the user exists before sending OTP (security: don't reveal if user exists vs not)
    user = db.query(User).filter(
        (User.email == identifier) | (User.mobile_number == identifier)
    ).first()

    # Always generate OTP and try to send — don't leak user existence
    otp_code = create_otp(db, identifier)

    is_email = "@" in identifier
    expiry_min = OTP_EXPIRY_MINUTES
    otp_message = (
        f"Your MediLink OTP is: {otp_code}. "
        f"It expires in {expiry_min} minutes. "
        f"Do not share this code with anyone."
    )

    sent = False
    if is_email:
        sent = send_email(identifier, "Your MediLink Login OTP", otp_message)
        logger.info("[AUTH] OTP email %s for %s", "sent" if sent else "FAILED (dev mode)", identifier)
    else:
        sent = send_sms(identifier, otp_message)
        logger.info("[AUTH] OTP SMS %s for %s", "sent" if sent else "FAILED (dev mode)", identifier)

    response = {
        "message": "OTP generated successfully.",
        "expires_in_seconds": expiry_min * 60,
    }

    # In dev mode (no real delivery), hint in the response
    if not sent:
        response["dev_note"] = (
            "No SMS/Email provider configured. "
            "Check server logs for the OTP code (search for 'OTP CODE')."
        )
        # Also return otp in dev mode only (remove in strict production)
        if os.getenv("ENVIRONMENT", "development").lower() == "development":
            response["dev_otp"] = otp_code
            logger.warning("[DEV] Returning OTP in response body — disable in production!")

    if user is None:
        # Don't expose that user doesn't exist, but log it
        logger.warning("[AUTH] OTP requested for unregistered identifier: %s", identifier)

    return response


@router.post("/verify-otp", response_model=Token)
def verify_otp_route(request: OTPVerify, db: Session = Depends(get_db)):
    """
    Verify the OTP and return a JWT access token on success.
    """
    identifier = request.identifier.strip()
    otp_code = request.otp_code.strip()

    logger.info("[AUTH] OTP verification attempt for %s", identifier)

    if not verify_otp(db, identifier, otp_code):
        # Check if record still exists (i.e. wrong code vs expired)
        record = db.query(OTPRecord).filter(OTPRecord.identifier == identifier).first()
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
        logger.warning("[AUTH] OTP verified but no user found for: %s", identifier)
        raise HTTPException(
            status_code=404,
            detail="Account not found. Please register first."
        )

    token = create_access_token(data={"sub": str(user.id)})
    logger.info("[AUTH] OTP login success for user %s (%s)", user.id, identifier)

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )
