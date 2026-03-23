import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from typing import List, Optional
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
import re
import html
import logging
import secrets
import string
import uuid
import smtplib
from datetime import datetime, date
from fastapi.responses import JSONResponse
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

from limiter import limiter
from database import engine, Base, get_db, SessionLocal
import models
from routers import auth, patients, qrcode_routes, emergency, chatbot
import schemas
from auth import hash_password, verify_password, get_current_user, create_access_token
from schemas import (
    BiometricEnrollment, BiometricLogin, Token, UserOut, HealthRecordOut,
    AppointmentCreate, AppointmentUpdate, AppointmentOut,
    PrescriptionCreate, PrescriptionUpdate, PrescriptionOut,
    PasswordUpdate, UserPreferences, UserDelete, AccessLogOut
)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("medilink.main")

# ── MediLink ID Generator ─────────────────────────────────────────────────────
_ML_ALPHABET = string.ascii_uppercase + string.digits

def generate_medilink_id() -> str:
    """Return a unique patient identifier like 'ML-A3F9K2'."""
    suffix = ''.join(secrets.choice(_ML_ALPHABET) for _ in range(6))
    return f"ML-{suffix}"


def send_email(to_email: str, subject: str, html_body: str):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = os.getenv('MAIL_FROM', 'medilinkorg68@gmail.com')
    msg['To'] = to_email
    msg.attach(MIMEText(html_body, 'html'))
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(
                os.getenv('MAIL_USERNAME', 'medilinkorg68@gmail.com'),
                os.getenv('MAIL_PASSWORD', '')
            )
            server.sendmail(
                os.getenv('MAIL_FROM', 'medilinkorg68@gmail.com'),
                to_email,
                msg.as_string()
            )
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False


def run_migrations():
    """Safely attempt to add missing columns."""
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE users ADD COLUMN mobile_number VARCHAR(20)",
            "ALTER TABLE users ADD COLUMN biometric_template TEXT",
            "ALTER TABLE users ADD COLUMN medilink_id VARCHAR(20)",
            "ALTER TABLE users ADD COLUMN preferences TEXT",
            "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN locked_until DATETIME",
            "ALTER TABLE users ADD COLUMN current_qr_token_hash VARCHAR(255)",
            "ALTER TABLE medical_profiles ADD COLUMN emergency_contacts TEXT",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
                print(f"[MIGRATION] Ran: {stmt}")
            except Exception as e:
                conn.rollback()


def seed_database():
    """Seed with 2 demo patients for testing."""
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == "john.doe@demo.com").first()
        if existing:
            return

        patient1 = models.User(
            name="John Doe",
            email="john.doe@demo.com",
            password_hash=hash_password("demo1234"),
            role="patient",
        )
        db.add(patient1)
        db.flush()

        profile1 = models.MedicalProfile(
            user_id=patient1.id,
            blood_group="O+",
            date_of_birth="1975-06-15",
            allergies="Penicillin (severe anaphylaxis), Aspirin (causes hives), Shellfish",
            current_medications="Metoprolol 50mg (twice daily), Atorvastatin 40mg (nightly), Lisinopril 10mg (morning), Metformin 500mg (with meals)",
            chronic_conditions="Type 2 Diabetes (diagnosed 2015), Hypertension, Coronary Artery Disease",
            surgical_history="Coronary Artery Bypass Graft (CABG) - 2020, Appendectomy - 1998",
            immunization_records="COVID-19 (Pfizer, 2021, 2022), Flu vaccine (annual), Pneumococcal vaccine (2022)",
            psychiatric_medications="None",
            emergency_contact_name="Mary Doe",
            emergency_contact_phone="+1-555-0101",
            emergency_contact_relation="Spouse",
            doctor_name="Dr. Sarah Johnson",
            doctor_phone="+1-555-0200",
            has_pacemaker=False,
            has_implants=True,
            is_diabetic=True,
            is_cardiac_patient=True,
            is_epileptic=False,
            is_asthmatic=False,
        )
        db.add(profile1)
        db.flush()

        qr1 = models.QRCode(user_id=patient1.id, qr_token=str(uuid.uuid4()))
        db.add(qr1)

        patient2 = models.User(
            name="Jane Smith",
            email="jane.smith@demo.com",
            password_hash=hash_password("demo1234"),
            role="patient",
        )
        db.add(patient2)
        db.flush()

        profile2 = models.MedicalProfile(
            user_id=patient2.id,
            blood_group="AB-",
            date_of_birth="1990-03-22",
            allergies="Latex, Codeine (causes respiratory distress), NSAIDs",
            current_medications="Levetiracetam 500mg (twice daily), Salbutamol inhaler (PRN), Sertraline 100mg (morning), Montelukast 10mg (nightly)",
            chronic_conditions="Epilepsy (generalized tonic-clonic seizures), Asthma (moderate persistent), Major Depressive Disorder",
            surgical_history="Tonsillectomy - 2005",
            immunization_records="COVID-19 (Moderna, 2021, booster 2022), HPV Vaccine (complete series 2007), MMR (childhood), Varicella (childhood)",
            psychiatric_medications="Sertraline 100mg daily (SSRI for depression), Clonazepam 0.5mg PRN (for breakthrough anxiety only)",
            emergency_contact_name="Robert Smith",
            emergency_contact_phone="+1-555-0102",
            emergency_contact_relation="Brother",
            doctor_name="Dr. Michael Chen",
            doctor_phone="+1-555-0201",
            has_pacemaker=False,
            has_implants=False,
            is_diabetic=False,
            is_cardiac_patient=False,
            is_epileptic=True,
            is_asthmatic=True,
        )
        db.add(profile2)
        db.flush()

        qr2 = models.QRCode(user_id=patient2.id, qr_token=str(uuid.uuid4()))
        db.add(qr2)

        db.commit()
        print("[SUCCESS] Demo data seeded successfully!")
        print(f"   Patient 1: john.doe@demo.com / demo1234 (QR: {qr1.qr_token})")
        print(f"   Patient 2: jane.smith@demo.com / demo1234 (QR: {qr2.qr_token})")

    except Exception as e:
        print(f"[ERROR] Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("uploads", exist_ok=True)
    try:
        required = ["SMTP_USER", "SMTP_PASS", "TWILIO_SID", "TWILIO_TOKEN", "TWILIO_FROM"]
        missing = [k for k in required if not os.getenv(k)]
        if missing:
            logger.warning(f"CRITICAL: Missing environment variables for OTP services: {missing}")
            if os.getenv("ENVIRONMENT", "development").lower() == "production":
                raise RuntimeError(f"Missing required production env vars: {missing}")

        Base.metadata.create_all(bind=engine)
        run_migrations()
        seed_database()
    except Exception as e:
        logger.error(f"Startup error: {e}")
    yield


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), camera=(self)"
        response.headers["Cache-Control"] = "no-store"
        if "localhost" not in str(request.url):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


def sanitize_string(value: str) -> str:
    if not value or not isinstance(value, str):
        return value
    value = re.sub(r'<[^>]+>', '', value)
    value = html.escape(value)
    value = value.replace('\x00', '')
    return value[:500]


app = FastAPI(
    lifespan=lifespan,
    title="MediLink API",
    description="Emergency Medical Record Access System",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# IMPORTANT: In Starlette, last add_middleware call = outermost = runs FIRST.
# SecurityHeaders must be FIRST (innermost), CORS must be LAST (outermost).
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://medilink-1hjl.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://medilink-.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Core Routers ──────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/patient", tags=["Patient"])
app.include_router(qrcode_routes.router, prefix="/qrcode", tags=["QR Code"])
app.include_router(emergency.router, prefix="/emergency", tags=["Emergency"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["Chatbot"])

# ── Optional Routers ──────────────────────────────────────────────────────────
try:
    from routers import records
    app.include_router(records.router, prefix="/records", tags=["Medical Records"])
except (ImportError, AttributeError):
    print("WARNING: records router not found, skipping")

try:
    from routers import doctor
    app.include_router(doctor.router, prefix="/doctor", tags=["Doctor"])
except (ImportError, AttributeError):
    print("WARNING: doctor router not found, skipping")

try:
    from routers import fundraising
    app.include_router(fundraising.router, prefix="/fundraising", tags=["Fundraising"])
except (ImportError, AttributeError):
    print("WARNING: fundraising router not found, skipping")

try:
    from routers import biometric
    app.include_router(biometric.router, prefix="/biometric", tags=["Biometric"])
except (ImportError, AttributeError):
    print("WARNING: biometric router not found, skipping")


# ── Utility Endpoints ─────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Welcome to MediLink API", "docs": "/docs"}


@app.get("/health")
async def health_check():
    """Health check for Render keep-alive and monitoring."""
    return {"status": "ok"}


@app.get("/seed")
def manual_seed(db: Session = Depends(get_db)):
    seed_database()
    return {"message": "Database seeded successfully"}


# ── Emergency Contacts Manager ────────────────────────────────────────────────
@app.get("/emergency-contacts", tags=["Emergency"])
def get_emergency_contacts(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(models.MedicalProfile).filter(models.MedicalProfile.user_id == user_id).first()
    if not profile:
        return []
    return profile.emergency_contacts or []


@app.post("/emergency-contacts", tags=["Emergency"])
def add_emergency_contact(contact: schemas.EmergencyContact, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(models.MedicalProfile).filter(models.MedicalProfile.user_id == user_id).first()
    if not profile:
        profile = models.MedicalProfile(user_id=user_id, emergency_contacts=[])
        db.add(profile)
    contacts = list(profile.emergency_contacts or [])
    contact.id = str(uuid.uuid4())
    if contact.is_primary:
        for c in contacts:
            c["is_primary"] = False
    contacts.append(contact.model_dump())
    profile.emergency_contacts = contacts
    db.commit()
    return contact


@app.put("/emergency-contacts/{contact_id}", tags=["Emergency"])
def update_emergency_contact(contact_id: str, contact_data: schemas.EmergencyContact, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(models.MedicalProfile).filter(models.MedicalProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    contacts = list(profile.emergency_contacts or [])
    found = False
    for i, c in enumerate(contacts):
        if c["id"] == contact_id:
            updated = contact_data.model_dump()
            updated["id"] = contact_id
            contacts[i] = updated
            found = True
            break
    if not found:
        raise HTTPException(404, "Contact not found")
    if contact_data.is_primary:
        for i, c in enumerate(contacts):
            if c["id"] != contact_id:
                contacts[i]["is_primary"] = False
    profile.emergency_contacts = contacts
    db.commit()
    return {"message": "Updated"}


@app.delete("/emergency-contacts/{contact_id}", tags=["Emergency"])
def delete_emergency_contact(contact_id: str, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(models.MedicalProfile).filter(models.MedicalProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    contacts = list(profile.emergency_contacts or [])
    contacts = [c for c in contacts if c["id"] != contact_id]
    profile.emergency_contacts = contacts
    db.commit()
    return {"message": "Deleted"}


# ── Appointments Manager ──────────────────────────────────────────────────────
@app.get("/appointments", response_model=List[AppointmentOut], tags=["Appointments"])
def get_appointments(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    today_str = date.today().isoformat()
    past_upcoming = db.query(models.Appointment).filter(
        models.Appointment.user_id == user_id,
        models.Appointment.status == "upcoming",
        models.Appointment.appointment_date < today_str
    ).all()
    if past_upcoming:
        for appt in past_upcoming:
            appt.status = "missed"
        db.commit()
    return db.query(models.Appointment).filter(
        models.Appointment.user_id == user_id
    ).order_by(models.Appointment.appointment_date.asc()).all()


@app.post("/appointments", response_model=AppointmentOut, tags=["Appointments"])
def create_appointment(appt: AppointmentCreate, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    db_appt = models.Appointment(**appt.model_dump(), user_id=user_id)
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return db_appt


@app.put("/appointments/{appt_id}", response_model=AppointmentOut, tags=["Appointments"])
def update_appointment(appt_id: int, appt_data: AppointmentUpdate, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    db_appt = db.query(models.Appointment).filter(
        models.Appointment.id == appt_id,
        models.Appointment.user_id == user_id
    ).first()
    if not db_appt:
        raise HTTPException(404, "Appointment not found")
    update_data = appt_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_appt, key, value)
    db.commit()
    db.refresh(db_appt)
    return db_appt


@app.delete("/appointments/{appt_id}", tags=["Appointments"])
def delete_appointment(appt_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    db_appt = db.query(models.Appointment).filter(
        models.Appointment.id == appt_id,
        models.Appointment.user_id == user_id
    ).first()
    if not db_appt:
        raise HTTPException(404, "Appointment not found")
    db.delete(db_appt)
    db.commit()
    return {"message": "Deleted"}


# ── Prescriptions Manager ─────────────────────────────────────────────────────
@app.get("/prescriptions", response_model=List[PrescriptionOut], tags=["Prescriptions"])
def get_prescriptions(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    today_str = date.today().isoformat()
    expired = db.query(models.Prescription).filter(
        models.Prescription.user_id == user_id,
        models.Prescription.is_active == True,
        models.Prescription.end_date < today_str
    ).all()
    if expired:
        for p in expired:
            p.is_active = False
        db.commit()
    return db.query(models.Prescription).filter(models.Prescription.user_id == user_id).all()


@app.post("/prescriptions", response_model=PrescriptionOut, tags=["Prescriptions"])
async def create_prescription(
    drug_name: str = Form(...),
    dosage: str = Form(...),
    frequency: str = Form(...),
    prescribed_by: Optional[str] = Form(None),
    start_date: str = Form(...),
    end_date: Optional[str] = Form(None),
    total_quantity: Optional[int] = Form(None),
    remaining_quantity: Optional[int] = Form(None),
    instructions: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_data = None
    file_name = None
    file_type = None
    if file:
        file_data = await file.read()
        file_name = file.filename
        file_type = file.content_type

    db_prescription = models.Prescription(
        user_id=user_id,
        drug_name=drug_name,
        dosage=dosage,
        frequency=frequency,
        prescribed_by=prescribed_by,
        start_date=start_date,
        end_date=end_date,
        total_quantity=total_quantity,
        remaining_quantity=remaining_quantity,
        instructions=instructions,
        file_name=file_name,
        file_data=file_data,
        file_type=file_type
    )
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)
    return db_prescription


@app.put("/prescriptions/{p_id}", response_model=PrescriptionOut, tags=["Prescriptions"])
def update_prescription(p_id: int, p_data: PrescriptionUpdate, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    db_p = db.query(models.Prescription).filter(
        models.Prescription.id == p_id,
        models.Prescription.user_id == user_id
    ).first()
    if not db_p:
        raise HTTPException(404, "Prescription not found")
    update_data = p_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_p, key, value)
    db.commit()
    db.refresh(db_p)
    return db_p


@app.delete("/prescriptions/{p_id}", tags=["Prescriptions"])
def delete_prescription(p_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    db_p = db.query(models.Prescription).filter(
        models.Prescription.id == p_id,
        models.Prescription.user_id == user_id
    ).first()
    if not db_p:
        raise HTTPException(404, "Prescription not found")
    db.delete(db_p)
    db.commit()
    return {"message": "Deleted"}


@app.get("/prescriptions/{p_id}/file", tags=["Prescriptions"])
def get_prescription_file(p_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    db_p = db.query(models.Prescription).filter(
        models.Prescription.id == p_id,
        models.Prescription.user_id == user_id
    ).first()
    if not db_p or not db_p.file_data:
        raise HTTPException(404, "File not found")
    return Response(content=db_p.file_data, media_type=db_p.file_type)


@app.post("/prescriptions/check-interactions", tags=["Prescriptions"])
async def check_drug_interactions(drug_list: List[str], user_id: int = Depends(get_current_user)):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"reply": "Groq AI is not configured. Interaction check currently unavailable."}

    prompt = f"I am taking the following medications: {', '.join(drug_list)}. As a medical AI assistant, check for any known drug interactions between these medications. List any dangerous interactions clearly, then list any mild interactions, then confirm which combinations are safe. Be concise and use simple language."

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
            temperature=0.5,
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        logger.error(f"AI interaction check error: {e}")
        return {"reply": f"AI service error: {str(e)}"}


# ── Health Records Manager ────────────────────────────────────────────────────
@app.get("/health-records", response_model=List[HealthRecordOut], tags=["Health Records"])
def get_health_records(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.HealthRecord).filter(
        models.HealthRecord.user_id == user_id
    ).order_by(models.HealthRecord.record_date.desc()).all()


@app.post("/health-records", response_model=HealthRecordOut, tags=["Health Records"])
async def create_health_record(
    title: str = Form(...),
    category: str = Form(...),
    record_date: str = Form(...),
    doctor_name: str = Form(""),
    notes: str = Form(""),
    file: UploadFile = File(None),
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_data = None
    file_name = None
    file_type = None
    if file:
        file_data = await file.read()
        file_name = file.filename
        file_type = file.content_type

    record = models.HealthRecord(
        user_id=user_id,
        title=title,
        category=category,
        record_date=record_date,
        doctor_name=doctor_name,
        notes=notes,
        file_name=file_name,
        file_data=file_data,
        file_type=file_type
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/health-records/{record_id}", response_model=HealthRecordOut, tags=["Health Records"])
def get_health_record(record_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(models.HealthRecord).filter(
        models.HealthRecord.id == record_id,
        models.HealthRecord.user_id == user_id
    ).first()
    if not record:
        raise HTTPException(404, "Record not found")
    return record


@app.get("/health-records/{record_id}/file", tags=["Health Records"])
def get_health_record_file(record_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(models.HealthRecord).filter(
        models.HealthRecord.id == record_id,
        models.HealthRecord.user_id == user_id
    ).first()
    if not record or not record.file_data:
        raise HTTPException(404, "File not found")
    return Response(
        content=record.file_data,
        media_type=record.file_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{record.file_name or "record"}"'
        }
    )


@app.delete("/health-records/{record_id}", tags=["Health Records"])
def delete_health_record(record_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(models.HealthRecord).filter(
        models.HealthRecord.id == record_id,
        models.HealthRecord.user_id == user_id
    ).first()
    if not record:
        raise HTTPException(404, "Record not found")
    db.delete(record)
    db.commit()
    return {"message": "Deleted"}


# ── User Settings ─────────────────────────────────────────────────────────────
@app.put("/users/me/password", tags=["Settings"])
def update_password(data: PasswordUpdate, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@app.put("/users/me/preferences", tags=["Settings"])
def update_preferences(prefs: UserPreferences, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    user.preferences = prefs.model_dump()
    db.commit()
    return user.preferences


@app.delete("/users/me", tags=["Settings"])
def delete_account(data: UserDelete, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect password context")
    db.delete(user)
    db.commit()
    return {"message": "Account deleted"}


@app.get("/users/me/access-log", response_model=List[AccessLogOut], tags=["Settings"])
def get_access_log(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.AccessLog).filter(
        models.AccessLog.user_id == user_id
    ).order_by(models.AccessLog.scanned_at.desc()).limit(10).all()


# ── Biometric Auth ────────────────────────────────────────────────────────────
@app.post("/auth/biometric/enroll", tags=["Biometric"])
def enroll_biometric(
    data: BiometricEnrollment,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user),
):
    user = db.query(models.User).filter(models.User.id == current_user_id).first()
    user.biometric_template = data.biometric_template
    db.commit()
    return {"message": "Biometric enrolled successfully"}


@app.post("/auth/biometric/verify", response_model=Token, tags=["Biometric"])
def verify_biometric(
    data: BiometricLogin,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == data.user_id).first()
    if not user or user.biometric_template != data.biometric_template:
        raise HTTPException(status_code=401, detail="Biometric authentication failed")
    token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


# Serve uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
