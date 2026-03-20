import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import User, OTPToken
from schemas import UserRegister, UserLogin, Token, UserOut, OTPRequest, OTPVerify, SendOTPRequest
from auth import hash_password, verify_password, create_access_token, get_current_user
from services.otp_service import generate_otp, hash_otp, verify_otp, get_otp_remaining_seconds
from services.notification_service import send_email, send_otp_sms, send_otp_email
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional
import os

logger = logging.getLogger("medilink.auth")

router = APIRouter()

class BiometricEnrollRequest(BaseModel):
    biometric_template: str

class BiometricVerifyRequest(BaseModel):
    credential_id: str

class OTPLoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))


from sqlalchemy import or_

@router.post("/register", response_model=Token)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    try:
        # 1. Uniqueness check for email and phone
        filters = []
        if user_data.email:
            filters.append(User.email == user_data.email)
        if user_data.mobile_number:
            filters.append(User.mobile_number == user_data.mobile_number)
        
        if filters:
            existing_user = db.query(User).filter(or_(*filters)).first()
            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="An account with this email or phone already exists. Please login instead."
                )

        # 2. Validation for roles
        valid_roles = ["patient", "doctor", "hospital", "responder"]
        if user_data.role not in valid_roles:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role. Must be one of: {valid_roles}"
            )

        # 3. Create user
        new_user = User(
            name=user_data.name,
            email=user_data.email,
            mobile_number=user_data.mobile_number,
            password_hash=hash_password(user_data.password),
            role=user_data.role,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info("[AUTH] New user registered: %s (role=%s)", user_data.email or user_data.mobile_number, user_data.role)
        
        # 4. Return token
        token = create_access_token(data={"sub": str(new_user.id)})
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserOut.model_validate(new_user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AUTH] Registration failed: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Registration failed. Please try again."
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
async def send_otp_route(request: SendOTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Generate a 6-digit OTP for the given email AND/OR mobile number.
    Uses BackgroundTasks for instant response.
    """
    print(f"[DEBUG] send-otp called with data: {request}")
    
    identifier = request.email or request.phone
    if not identifier:
        raise HTTPException(status_code=400, detail="Must provide email or phone")
    
    identifier = str(identifier).strip().lower()

    # Generate ONE code
    otp_code = generate_otp()
    
    # Resolve user context if available (for the email template name)
    user = db.query(User).filter(
        (User.email == identifier) | (User.mobile_number == identifier)
    ).first()
    user_name = request.name or (user.name if user else "User")

    # Cleanup old ones
    db.query(OTPToken).filter(OTPToken.identifier == identifier).delete()
    db.commit()

    # Save to DB
    expiry_min = OTP_EXPIRY_MINUTES
    new_otp = OTPToken(
        identifier=identifier,
        otp_code=hash_otp(otp_code),
        channel="both" if (request.email and request.phone) else ("email" if request.email else "sms"),
        expires_at=datetime.utcnow() + timedelta(minutes=expiry_min),
        used=False,
        attempts=0
    )
    db.add(new_otp)
    db.commit()

    # Queue background tasks
    if request.email:
        background_tasks.add_task(send_otp_email, request.email, otp_code, user_name)
        logger.info("[AUTH] Queued email OTP task for %s", request.email)
    
    if request.phone:
        background_tasks.add_task(send_otp_sms, request.phone, otp_code)
        logger.info("[AUTH] Queued SMS OTP task for %s", request.phone)

    if os.getenv("ENVIRONMENT") != "production":
        print(f"\n[DEV MODE] DEV OTP for {identifier}: {otp_code}\n")

    return {
        "success": True,
        "message": "OTP is being sent.",
        "expires_in_seconds": expiry_min * 60,
    }

@router.post("/login/send-otp")
async def login_send_otp_route(request: OTPLoginRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Generate a 6-digit OTP for the given email or mobile number using passwordless flow.
    """
    identifier = request.email if request.email else request.phone
    if not identifier:
        raise HTTPException(status_code=400, detail="Must provide email or phone")
    
    identifier = str(identifier).strip().lower()

    user = db.query(User).filter(
        (User.email == identifier) | (User.mobile_number == identifier)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Account not found. Please register first.")

    otp_code = generate_otp()
    
    # Cleanup old ones
    db.query(OTPToken).filter(OTPToken.identifier == identifier).delete()
    db.commit()

    expiry_min = OTP_EXPIRY_MINUTES
    new_otp = OTPToken(
        identifier=identifier,
        otp_code=hash_otp(otp_code),
        channel="email" if request.email else "sms",
        expires_at=datetime.utcnow() + timedelta(minutes=expiry_min),
        used=False,
        attempts=0
    )
    db.add(new_otp)
    db.commit()

    if request.email:
        background_tasks.add_task(send_otp_email, request.email, otp_code, user.name)
    else:
        background_tasks.add_task(send_otp_sms, request.phone, otp_code)

    if os.getenv("ENVIRONMENT") != "production":
        print(f"\n[DEV MODE] DEV OTP for {identifier}: {otp_code}\n")

    return {
        "success": True,
        "message": "OTP sent successfully.",
    }



@router.post("/verify-otp")
def verify_otp_route(request: OTPVerify, db: Session = Depends(get_db)):
    """
    Verify the OTP and return a JWT access token on success.
    """
    identifier = request.email or request.phone or request.identifier
    if not identifier:
        raise HTTPException(status_code=400, detail="Must provide identifier (email or phone)")
    
    identifier = str(identifier).strip().lower()
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
