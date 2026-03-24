from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import re
import html

def sanitize_string(value: str) -> str:
    if not value or not isinstance(value, str):
        return value
    # Remove HTML tags
    value = re.sub(r'<[^>]+>', '', value)
    # Escape HTML entities
    value = html.escape(value)
    # Remove null bytes
    value = value.replace('\x00', '')
    # Limit length
    return value[:500]

class BaseSchema(BaseModel):
    @validator('*', pre=True)
    def sanitize_fields(cls, v):
        if isinstance(v, str):
            return sanitize_string(v)
        return v


# Auth schemas
class UserRegister(BaseSchema):
    name: str
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    password: str
    role: str = "patient"


class UserLogin(BaseSchema):
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    password: Optional[str] = None


class OTPRequest(BaseModel):
    identifier: str  # email or mobile
    channel: str     # email or sms


class SendOTPRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class OTPVerify(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    identifier: Optional[str] = None # Fallback for old callers
    otp_code: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    mobile_number: Optional[str] = None
    medilink_id: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    user: UserOut


# Medical Profile schemas
class EmergencyContact(BaseSchema):
    id: Optional[str] = None # UUID for management
    name: str
    relationship: str
    phone: str
    is_primary: bool = False

class MedicalProfileCreate(BaseSchema):
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
    emergency_contacts: Optional[List[EmergencyContact]] = [] # New multi-contact field
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
    medilink_id: Optional[str] = None
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



class PrescriptionBase(BaseModel):
    drug_name: str
    dosage: str
    frequency: str
    prescribed_by: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    total_quantity: Optional[int] = None
    remaining_quantity: Optional[int] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = True

class PrescriptionCreate(PrescriptionBase):
    pass

class PrescriptionUpdate(BaseSchema):
    drug_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    prescribed_by: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_quantity: Optional[int] = None
    remaining_quantity: Optional[int] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None

class PrescriptionOut(PrescriptionBase):
    id: int
    user_id: int
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Emergency data schema (public - minimal fields)
class EmergencyPrescriptionOut(BaseModel):
    drug_name: str
    dosage: str

    class Config:
        from_attributes = True

class EmergencyContactOut(BaseModel):
    name: str
    phone: str
    relationship: str

class EmergencyDataOut(BaseModel):
    patient_name: str
    medilink_id: Optional[str] = None
    blood_group: Optional[str]
    allergies: Optional[str]
    current_medications: Optional[str]
    chronic_conditions: Optional[str]
    emergency_contacts: Optional[List[EmergencyContactOut]] = []
    doctor_name: Optional[str]
    doctor_phone: Optional[str]
    has_pacemaker: Optional[bool]
    has_implants: Optional[bool]
    is_diabetic: Optional[bool]
    is_cardiac_patient: Optional[bool]
    is_epileptic: Optional[bool]
    is_asthmatic: Optional[bool]
    prescriptions: Optional[List[EmergencyPrescriptionOut]] = []


class PatientContext(BaseModel):
    name: str = ""
    blood_type: str = ""
    conditions: List[str] = []
    medications: List[str] = []
    allergies: List[str] = []
    age: Optional[int] = None

class ChatMessage(BaseModel):
    messages: Optional[List[Dict[str, str]]] = None # [{role, content}]
    message: Optional[str] = None # Fallback
    session_id: str
    patient_context: Optional[PatientContext] = None
    location: Optional[str] = None  # "lat,lng" string
    lat: Optional[float] = None     # live GPS latitude
    lng: Optional[float] = None     # live GPS longitude


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


class DoctorProfileBase(BaseModel):
    doctor_id_code: str
    specialization: str
    license_number: str
    hospital_name: str
    contact_details: str


class DoctorProfileCreate(DoctorProfileBase):
    pass


class DoctorProfileOut(DoctorProfileBase):
    id: int
    user_id: int
    verification_status: str
    verification_doc_path: Optional[str] = None
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FundraisingApplicationCreate(BaseModel):
    name: str
    medical_condition: str
    hospital_name: str
    estimated_cost: float
    phone_number: str
    email: EmailStr
    description: str


class FundraisingApplicationOut(FundraisingApplicationCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class BiometricEnrollment(BaseModel):
    biometric_template: str


class BiometricLogin(BaseModel):
    user_id: int
    biometric_template: str


class HealthRecordOut(BaseModel):
    id: int
    user_id: int
    title: str
    category: str
    record_date: str
    doctor_name: Optional[str] = ""
    notes: Optional[str] = ""
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AppointmentBase(BaseModel):
    doctor_name: str
    specialty: Optional[str] = None
    clinic_or_hospital: Optional[str] = None
    appointment_date: str
    appointment_time: str
    type: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "upcoming"

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseSchema):
    doctor_name: Optional[str] = None
    specialty: Optional[str] = None
    clinic_or_hospital: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    type: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class AppointmentOut(AppointmentBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordUpdate(BaseSchema):
    current_password: str
    new_password: str

class UserPreferences(BaseModel):
    notifications_appointments: bool
    notifications_refills: bool
    notifications_health_tips: bool
    qr_access_log: bool

class UserDelete(BaseModel):
    password: str

class AccessLogOut(BaseModel):
    id: int
    user_id: int
    scanned_at: datetime
    location: Optional[str] = None

    class Config:
        from_attributes = True


class QRAccessLogOut(BaseModel):
    id: int
    user_id: int
    accessed_at: datetime
    ip_address: str

    class Config:
        from_attributes = True


class RefreshRequest(BaseModel):
    refresh_token: str
