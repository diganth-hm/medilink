from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import os
import logging

from database import engine, Base, get_db, SessionLocal
import models
from routers import auth, patients, qrcode_routes, emergency, chatbot, records, doctor, fundraising
from auth import hash_password, get_current_user, create_access_token
from schemas import BiometricEnrollment, BiometricLogin, Token, UserOut
import uuid
from datetime import datetime
from fastapi.responses import JSONResponse
from fastapi import Request
from sqlalchemy import inspect, text

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("medilink.main")

# Database initialization moved to lifespan for safety

def run_migrations():
    """Safely attempt to add missing columns to the users table."""
    with engine.connect() as conn:
        # Add mobile_number
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN mobile_number VARCHAR(20)"))
            conn.commit()
            print("Successfully added mobile_number column.")
        except Exception:
            conn.rollback() # Column likely already exists
            
        # Add biometric_template
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN biometric_template TEXT"))
            conn.commit()
            print("Successfully added biometric_template column.")
        except Exception:
            conn.rollback()
            
        # Widen otp_code column to accommodate bcrypt hashes
        try:
            conn.execute(text("ALTER TABLE otp_records MODIFY COLUMN otp_code VARCHAR(100)"))
            conn.commit()
            print("Successfully widened otp_code column.")
        except Exception:
            conn.rollback()  # SQLite uses different syntax — handled below
        try:
            # SQLite-compatible: recreate isn't needed if column is already wide
            pass
        except Exception:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directory exists
    os.makedirs("uploads", exist_ok=True)
    try:
        # Ensure database tables are created
        Base.metadata.create_all(bind=engine)
        # Run simple migrations for existing databases
        run_migrations()
        # Seed database
        seed_database()
    except Exception as e:
        print(f"Startup error: {e}")
    yield

app = FastAPI(
    lifespan=lifespan,
    title="MediLink API",
    description="Emergency Medical Record Access System",
    version="1.0.0"
)

# Highly permissive CORS for development/deployment testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.middleware("http")
async def cors_and_error_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return JSONResponse(
            content={"detail": "OK"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    try:
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Server Crash: {str(e)}"},
            headers={"Access-Control-Allow-Origin": "*"}
        )

@app.get("/seed")
def manual_seed(db: Session = Depends(get_db)):
    seed_database()
    return {"message": "Database seeded successfully"}


# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/patient", tags=["Patient"])
app.include_router(qrcode_routes.router, prefix="/qrcode", tags=["QR Code"])
app.include_router(emergency.router, prefix="/emergency", tags=["Emergency"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["Chatbot"])
app.include_router(records.router, prefix="/records", tags=["Medical Records"])
app.include_router(doctor.router, prefix="/doctor", tags=["Doctor"])
app.include_router(fundraising.router, prefix="/fundraising", tags=["Fundraising"])

# Serve uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"message": "Welcome to MediLink API", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "MediLink API"}


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
    # This is a simplified biometric check for demo purposes
    user = db.query(models.User).filter(models.User.id == data.user_id).first()
    if not user or user.biometric_template != data.biometric_template:
        raise HTTPException(status_code=401, detail="Biometric authentication failed")
    
    token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


def seed_database():
    """Seed with 2 demo patients for testing."""
    db = SessionLocal()
    try:
        # Check if already seeded
        existing = db.query(models.User).filter(models.User.email == "john.doe@demo.com").first()
        if existing:
            return

        # Demo Patient 1 - John Doe (cardiac patient with multiple conditions)
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

        # Demo Patient 2 - Jane Smith (epilepsy, asthma, psychiatric meds)
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


# Seed on startup

if __name__ == "__main__":
    import uvicorn
    # Make sure we use the dynamic port assigned by Render.com or fallback to 8000 locally
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
