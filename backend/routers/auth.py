from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, OTPRecord
from schemas import UserRegister, UserLogin, Token, UserOut, OTPRequest, OTPVerify
from auth import hash_password, verify_password, create_access_token
from services.otp_service import create_otp, verify_otp
from services.notification_service import send_email, send_sms

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    valid_roles = ["patient", "doctor", "hospital", "responder"]
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    # Standard password login
    if user_data.email and user_data.password:
        user = db.query(User).filter(User.email == user_data.email).first()
        if not user or not verify_password(user_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
    # OTP Login support
    elif user_data.email or user_data.mobile_number:
        # This assumes the user has already verified the OTP via /verify-otp
        # and we are just providing a session. 
        # But per requirements, we should replace/extend login with OTP.
        raise HTTPException(status_code=400, detail="Use OTP verification flow for login")
    else:
        raise HTTPException(status_code=400, detail="Invalid login credentials")

    token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.post("/send-otp")
def send_otp_route(request: OTPRequest, db: Session = Depends(get_db)):
    otp = create_otp(db, request.identifier)
    
    if "@" in request.identifier:
        send_email(request.identifier, "Your MediLink OTP", f"Your OTP is: {otp}. It expires in 2 minutes.")
    else:
        send_sms(request.identifier, f"Your MediLink OTP is: {otp}. It expires in 2 minutes.")
    
    return {"message": "OTP sent successfully"}


@router.post("/verify-otp", response_model=Token)
def verify_otp_route(request: OTPVerify, db: Session = Depends(get_db)):
    if not verify_otp(db, request.identifier, request.otp_code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Resolve user
    user = db.query(User).filter(
        (User.email == request.identifier) | (User.mobile_number == request.identifier)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")
        
    token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )
