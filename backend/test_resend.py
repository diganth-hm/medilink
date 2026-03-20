import resend
import os
from dotenv import load_dotenv
load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

print(f"API key present: {bool(resend.api_key)}")
print(f"API key starts with: {resend.api_key[:5] if resend.api_key else 'MISSING'}")

try:
    params = {
        "from": "MediLink <onboarding@resend.dev>",
        "to": ["medilinkorg68@gmail.com"],
        "subject": "MediLink Test Email",
        "html": "<h1 style='color:#E5341A'>medilink</h1><p>Test OTP: <strong>123456</strong></p>",
    }
    response = resend.Emails.send(params)
    print(f"SUCCESS: Email sent. ID: {response['id']}")
except Exception as e:
    print(f"FAILED: {str(e)}")
