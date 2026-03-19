import smtplib
import os
from email.mime.text import MIMEText
from dotenv import load_dotenv
load_dotenv()

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

print(f"Testing with SMTP_USER: {SMTP_USER}")
print(f"SMTP_PASS length: {len(SMTP_PASS) if SMTP_PASS else 0}")

try:
    msg = MIMEText("Your MediLink test OTP is 123456. Valid for 10 minutes.")
    msg["Subject"] = "MediLink Test OTP Email"
    msg["From"] = SMTP_USER
    msg["To"] = SMTP_USER
    
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASS)
    server.sendmail(SMTP_USER, SMTP_USER, msg.as_string())
    server.quit()
    print("SUCCESS: Test email sent to", SMTP_USER)
except Exception as e:
    print(f"FAILED: {str(e)}")
