from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# Auth schemas
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "patient"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# Medical Profile schemas
class MedicalProfileCreate(BaseModel):
    blood_group: Optional[str] = None
    date_of_birth: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    chronic_conditions: Optional[str] = None
    surgical_history: Optional[str] = None
    immunization_records: Optional[str] = None
    psychiatric_medications: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_phone: Optional[str] = None
    has_pacemaker: Optional[bool] = False
    has_implants: Optional[bool] = False
    is_diabetic: Optional[bool] = False
    is_cardiac_patient: Optional[bool] = False
    is_epileptic: Optional[bool] = False
    is_asthmatic: Optional[bool] = False


class MedicalProfileUpdate(MedicalProfileCreate):
    pass


class MedicalProfileOut(MedicalProfileCreate):
    id: int
    user_id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# QR Code schemas
class QRCodeOut(BaseModel):
    id: int
    user_id: int
    qr_token: str
    created_at: datetime

    class Config:
        from_attributes = True


# Emergency data schema (public - minimal fields)
class EmergencyDataOut(BaseModel):
    patient_name: str
    blood_group: Optional[str]
    date_of_birth: Optional[str]
    allergies: Optional[str]
    current_medications: Optional[str]
    chronic_conditions: Optional[str]
    surgical_history: Optional[str]
    immunization_records: Optional[str]
    psychiatric_medications: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    emergency_contact_relation: Optional[str]
    doctor_name: Optional[str]
    doctor_phone: Optional[str]
    has_pacemaker: Optional[bool]
    has_implants: Optional[bool]
    is_diabetic: Optional[bool]
    is_cardiac_patient: Optional[bool]
    is_epileptic: Optional[bool]
    is_asthmatic: Optional[bool]


class ChatMessage(BaseModel):
    message: str
    session_id: str
    patient_context: Optional[str] = None
    location: Optional[str] = None  # city or pincode for pharmacy ordering


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    pharmacy_links: Optional[List[dict]] = None
    order_state: Optional[str] = None  # idle | awaiting_location | awaiting_confirm | confirmed


# Medical Record schemas
class MedicalRecordOut(BaseModel):
    id: int
    user_id: int
    file_type: str
    title: str
    description: Optional[str] = None
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: datetime
    download_url: Optional[str] = None

    class Config:
        from_attributes = True
