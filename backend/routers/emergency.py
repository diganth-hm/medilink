from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import urllib.request
import urllib.parse
import json
from typing import List
from database import get_db
import models
from models import QRCode, User, MedicalProfile
from schemas import EmergencyDataOut
from fastapi import Request
from jose import jwt, JWTError
import hashlib
from auth import SECRET_KEY, ALGORITHM

router = APIRouter()

@router.get("/hospitals")
def get_nearby_hospitals(lat: float, lng: float, radius: int = 5000):
    query = f"""
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:{radius},{lat},{lng});
      way["amenity"="hospital"](around:{radius},{lat},{lng});
      relation["amenity"="hospital"](around:{radius},{lat},{lng});
    );
    out center;
    """
    url = "https://overpass-api.de/api/interpreter?data=" + urllib.parse.quote(query.strip())
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'MediLink/1.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        hospitals = []
        for index, elem in enumerate(data.get("elements", [])):
            if index >= 15: # limit to top 15
                break
            tags = elem.get("tags", {})
            name = tags.get("name", "Unknown Hospital")
            phone = tags.get("phone", tags.get("contact:phone", "N/A"))
            address = tags.get("addr:full", tags.get("addr:street", "Address not available"))
            
            hospitals.append({
                "id": elem.get("id"),
                "name": name,
                "phone": phone,
                "address": address,
                "emergency": "24/7 Available" if tags.get("emergency") == "yes" else "Unknown",
                "dist": f"~{radius/1000} km"
            })
            
        return {"hospitals": hospitals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def emergency_status():
    return {"status": "ok", "message": "Emergency services available"}

@router.get("/{qr_token}", response_model=EmergencyDataOut)
def get_emergency_data(qr_token: str, request: Request, db: Session = Depends(get_db)):
    """
    Public endpoint for emergency responders. 
    Verifies JWT token expiry + hash rotation.
    Logs each access for the user's audit history.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired QR token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Basic format check and decode (jose handles exp check automatically if present)
    try:
        payload = jwt.decode(qr_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if user_id is None or token_type != "qr":
            raise HTTPException(404, "Invalid QR token format")
    except JWTError:
        raise HTTPException(404, "QR token expired or corrupted")

    # 2. Verify hash rotation
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(404, "User not found")
        
    token_hash = hashlib.sha256(qr_token.encode()).hexdigest()
    if user.current_qr_token_hash != token_hash:
        raise HTTPException(404, "This QR code has been revoked or regenerated")

    # 3. Log access
    access_log = models.QRAccessLog(
        user_id=user.id,
        ip_address=request.client.host
    )
    db.add(access_log)
    db.commit()

    # 4. Fetch and Return masked profile
    profile = db.query(MedicalProfile).filter(MedicalProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Medical profile not found")

    return EmergencyDataOut(
        patient_name=user.name,
        medilink_id=user.medilink_id,
        blood_group=profile.blood_group,
        allergies=profile.allergies,
        current_medications=profile.current_medications,
        chronic_conditions=profile.chronic_conditions,
        emergency_contacts=profile.emergency_contacts or [],
        doctor_name=profile.doctor_name,
        doctor_phone=profile.doctor_phone,
        has_pacemaker=profile.has_pacemaker,
        has_implants=profile.has_implants,
        is_diabetic=profile.is_diabetic,
        is_cardiac_patient=profile.is_cardiac_patient,
        is_epileptic=profile.is_epileptic,
        is_asthmatic=profile.is_asthmatic,
        prescriptions=db.query(models.Prescription).filter(models.Prescription.user_id == user.id, models.Prescription.is_active == True).all()
    )
