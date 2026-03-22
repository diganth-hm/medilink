from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, create_access_token
import os
import base64
from datetime import datetime
from typing import Dict, Optional

router = APIRouter()

# Global dict to store challenges (In production, use Redis or short-lived DB field)
# Key: challenge_str, Value: { "user_id": int, "type": "registration" | "authentication", "medilink_id": str }
CHALLENGES: Dict[str, dict] = {}

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def base64url_decode(data: str) -> bytes:
    # Add padding if needed
    padding = len(data) % 4
    if padding:
        data += '=' * (4 - padding)
    return base64.urlsafe_b64decode(data)

@router.get("/registration-challenge")
def get_registration_challenge(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    user = db.query(models.User).filter(models.User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    challenge = os.urandom(32)
    challenge_str = base64url_encode(challenge)
    
    # Store challenge temporarily
    CHALLENGES[challenge_str] = {
        "user_id": current_user_id,
        "type": "registration",
        "created_at": datetime.utcnow()
    }
    
    return {
        "challenge": challenge_str,
        "user_id": str(user.id),
        "user_name": user.email,
        "display_name": user.name or user.email,
        "rp_id": "localhost",
        "rp_name": "MediLink"
    }

@router.post("/register")
def register_biometric(
    data: dict,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    credential_id = data.get("credential_id")
    public_key = data.get("public_key")
    device_name = data.get("device_name")
    
    if not all([credential_id, public_key]):
        raise HTTPException(status_code=400, detail="Missing credential data")
        
    # Check if a credential already exists for this device ID (simplified)
    existing = db.query(models.BiometricCredential).filter(
        models.BiometricCredential.user_id == current_user_id,
        models.BiometricCredential.credential_id == credential_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Device already enrolled")
        
    # Create new credential
    btn = models.BiometricCredential(
        user_id = current_user_id,
        credential_id = credential_id,
        public_key = public_key,
        device_name = device_name,
        created_at = datetime.utcnow()
    )
    db.add(btn)
    db.commit()
    
    return {"message": "Biometric enrolled successfully", "credential_id": credential_id}

@router.get("/authentication-challenge")
def get_authentication_challenge(
    medilink_id: str,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.medilink_id == medilink_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    credential = db.query(models.BiometricCredential).filter(
        models.BiometricCredential.user_id == user.id
    ).order_by(models.BiometricCredential.created_at.desc()).first()
    
    if not credential:
        raise HTTPException(status_code=400, detail="Biometrics not enrolled for this patient")
        
    challenge = os.urandom(32)
    challenge_str = base64url_encode(challenge)
    
    CHALLENGES[challenge_str] = {
        "user_id": user.id,
        "type": "authentication",
        "created_at": datetime.utcnow()
    }
    
    return {
        "challenge": challenge_str,
        "credential_id": credential.credential_id
    }

@router.post("/verify")
def verify_biometric(
    data: dict,
    db: Session = Depends(get_db)
):
    medilink_id = data.get("medilink_id")
    assertion = data.get("assertion") # The WebAuthn assertion response (base64url)
    
    # In a real implementation with fido2-tools, we would verify the signature.
    # For now, we simulate a successful verification.
    user = db.query(models.User).filter(models.User.medilink_id == medilink_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update last used
    credential = db.query(models.BiometricCredential).filter(
        models.BiometricCredential.user_id == user.id
    ).order_by(models.BiometricCredential.created_at.desc()).first()
    
    if credential:
        credential.last_used = datetime.utcnow()
        credential.sign_count += 1
        db.commit()
        
    # Create JWT
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": {
        "id": user.id, "name": user.name, "email": user.email, "role": user.role
    }}

@router.get("/status")
def get_biometric_status(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    credential = db.query(models.BiometricCredential).filter(
        models.BiometricCredential.user_id == current_user_id
    ).order_by(models.BiometricCredential.created_at.desc()).first()
    
    if not credential:
        return {"enrolled": False}
        
    return {
        "enrolled": True,
        "device_name": credential.device_name,
        "enrolled_at": credential.created_at,
        "last_used": credential.last_used
    }

@router.delete("/credential")
def delete_biometric_credential(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    db.query(models.BiometricCredential).filter(
        models.BiometricCredential.user_id == current_user_id
    ).delete()
    db.commit()
    return {"message": "Biometric credential removed successfully"}
