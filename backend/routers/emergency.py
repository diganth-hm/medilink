from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import urllib.request
import urllib.parse
import json
from database import get_db
from models import QRCode, User, MedicalProfile
from schemas import EmergencyDataOut

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


@router.get("/hospitals-gmaps")
def get_hospitals_google(lat: float, lng: float, radius: int = 10000):
    """Proxy Google Maps Places Nearby Search server-side to avoid browser CORS."""
    import os
    gmaps_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if not gmaps_key:
        raise HTTPException(status_code=501, detail="GOOGLE_MAPS_API_KEY not configured. Use /hospitals endpoint instead.")

    url = (
        f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        f"?location={lat},{lng}&radius={radius}&type=hospital&key={gmaps_key}"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MediLink/1.0"})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())

        results = []
        for place in data.get("results", [])[:15]:
            geo = place.get("geometry", {}).get("location", {})
            results.append({
                "place_id": place.get("place_id"),
                "name": place.get("name", "Unknown Hospital"),
                "vicinity": place.get("vicinity", "Address not available"),
                "opening_hours": place.get("opening_hours"),
                "geometry": {"location": geo},
                "rating": place.get("rating"),
                "user_ratings_total": place.get("user_ratings_total"),
            })
        return {"results": results, "status": data.get("status")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Maps error: {str(e)}")


@router.get("/{qr_token}", response_model=EmergencyDataOut)
def get_emergency_data(qr_token: str, db: Session = Depends(get_db)):
    qr_record = db.query(QRCode).filter(QRCode.qr_token == qr_token).first()
    if not qr_record:
        raise HTTPException(status_code=404, detail="Invalid or expired QR code")

    user = db.query(User).filter(User.id == qr_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient not found")

    profile = db.query(MedicalProfile).filter(MedicalProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Medical profile not found for this patient")

    return EmergencyDataOut(
        patient_name=user.name,
        blood_group=profile.blood_group,
        date_of_birth=profile.date_of_birth,
        allergies=profile.allergies,
        current_medications=profile.current_medications,
        chronic_conditions=profile.chronic_conditions,
        surgical_history=profile.surgical_history,
        immunization_records=profile.immunization_records,
        psychiatric_medications=profile.psychiatric_medications,
        emergency_contact_name=profile.emergency_contact_name,
        emergency_contact_phone=profile.emergency_contact_phone,
        emergency_contact_relation=profile.emergency_contact_relation,
        doctor_name=profile.doctor_name,
        doctor_phone=profile.doctor_phone,
        has_pacemaker=profile.has_pacemaker,
        has_implants=profile.has_implants,
        is_diabetic=profile.is_diabetic,
        is_cardiac_patient=profile.is_cardiac_patient,
        is_epileptic=profile.is_epileptic,
        is_asthmatic=profile.is_asthmatic,
    )
