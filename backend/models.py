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
    is_verified = Column(Boolean, default=False)  # True for verified doctors
    created_at = Column(DateTime, default=datetime.utcnow)

    medical_profile = relationship("MedicalProfile", back_populates="user", uselist=False)
    qr_codes = relationship("QRCode", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    medical_records = relationship("MedicalRecord", back_populates="user")


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
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="medical_records")
