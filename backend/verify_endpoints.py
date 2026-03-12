from database import SessionLocal
from routers.auth import send_otp
from schemas import OTPRequest

db = SessionLocal()
try:
    print("Testing OTP generation for jane.smith@demo.com")
    req = OTPRequest(identifier="jane.smith@demo.com")
    res = send_otp(req, db)
    print("Response:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
