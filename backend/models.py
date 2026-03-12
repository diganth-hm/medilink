from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="patient")  # patient | doctor | hospital | responder
    mobile_number = Column(String(20), unique=True, index=True, nullable=True)
    biometric_template = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False)  # True for verified doctors
    created_at = Column(DateTime, default=datetime.utcnow)

    medical_profile = relationship("MedicalProfile", back_populates="user", uselist=False)
    qr_codes = relationship("QRCode", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    medical_records = relationship("MedicalRecord", back_populates="user", foreign_keys="[MedicalRecord.user_id]")
    issued_records = relationship("MedicalRecord", back_populates="issuing_doctor", foreign_keys="[MedicalRecord.issuing_doctor_id]")
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)


class MedicalProfile(Base):
    __tablename__ = "medical_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    blood_group = Column(String(10), nullable=True)
    date_of_birth = Column(String(20), nullable=True)
    allergies = Column(Text, nullable=True)
    current_medications = Column(Text, nullable=True)
    chronic_conditions = Column(Text, nullable=True)
    surgical_history = Column(Text, nullable=True)
    immunization_records = Column(Text, nullable=True)
    psychiatric_medications = Column(Text, nullable=True)

    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)

    doctor_name = Column(String(100), nullable=True)
    doctor_phone = Column(String(20), nullable=True)

    has_pacemaker = Column(Boolean, default=False)
    has_implants = Column(Boolean, default=False)
    is_diabetic = Column(Boolean, default=False)
    is_cardiac_patient = Column(Boolean, default=False)
    is_epileptic = Column(Boolean, default=False)
    is_asthmatic = Column(Boolean, default=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="medical_profile")


class QRCode(Base):
    __tablename__ = "qr_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    qr_token = Column(String(100), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="qr_codes")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)  # user | assistant
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chat_sessions")


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # image | pdf | document
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    original_filename = Column(String(300), nullable=True)
    file_size = Column(Integer, nullable=True)  # bytes
    issuing_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="medical_records", foreign_keys=[user_id])
    issuing_doctor = relationship("User", foreign_keys=[issuing_doctor_id])


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    doctor_id_code = Column(String(50), unique=True, index=True)
    specialization = Column(String(100))
    license_number = Column(String(50), unique=True)
    hospital_name = Column(String(200))
    contact_details = Column(Text)

    user = relationship("User", back_populates="doctor_profile")


class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String(200), index=True)  # email or phone
    otp_code = Column(String(100))  # bcrypt hash of the OTP (60 chars + margin)
    expires_at = Column(DateTime)
    attempts = Column(Integer, default=0)


class FundraisingApplication(Base):
    __tablename__ = "fundraising_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(100))
    medical_condition = Column(String(200))
    hospital_name = Column(String(200))
    estimated_cost = Column(Float)
    supporting_docs_path = Column(String(500))
    phone_number = Column(String(20))
    email = Column(String(200))
    description = Column(Text)
    status = Column(String(20), default="pending")  # pending | verified | rejected
    created_at = Column(DateTime, default=datetime.utcnow)
