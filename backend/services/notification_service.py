"""
Notification Service — OTP delivery via Email (SMTP/SendGrid) and SMS (Twilio / Fast2SMS).

Priority order for each channel:
  Email : SMTP (Gmail/any) → SendGrid → DEV FALLBACK (log only)
  SMS   : Twilio           → Fast2SMS → DEV FALLBACK (log only)

Required environment variables (set in Render / .env):
  SMTP_USER       — sender Gmail address (e.g. yourapp@gmail.com)
  SMTP_PASS       — Gmail App Password (not account password)
  SMTP_HOST        — optional, default smtp.gmail.com
  SMTP_PORT        — optional, default 587

  SENDGRID_API_KEY — optional SendGrid fallback

  TWILIO_SID
  TWILIO_TOKEN
  TWILIO_FROM     — E.164 format, e.g. +15005550006

  OTP_EXPIRY_MINUTES  — default 10
"""

import os
import logging
import resend

logger = logging.getLogger("medilink.notification")

# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------
SMTP_EMAIL = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASS", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM", "")

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")

DEV_MODE = not (SMTP_EMAIL or SENDGRID_API_KEY or TWILIO_ACCOUNT_SID or FAST2SMS_API_KEY)


# ---------------------------------------------------------------------------
# Email delivery
# ---------------------------------------------------------------------------

def send_otp_email(to_email: str, otp: str, name: str):
    """
    Send OTP email using Resend API. 
    Works on Render free tier (blocks port 587).
    """
    try:
        resend.api_key = os.getenv("RESEND_API_KEY")
        
        if not resend.api_key:
            logger.error("[EMAIL] RESEND_API_KEY is not set")
            return False
        
        logger.info(f"[EMAIL] Sending OTP email to {to_email} via Resend")
        
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A1628; color: #ffffff; border-radius: 12px;">
            <div style="margin-bottom: 24px;">
                <span style="font-size: 28px; font-weight: 700; color: #ffffff;">medi</span>
                <span style="font-size: 28px; font-weight: 700; color: #E5341A;">link</span>
            </div>
            <p style="font-size: 16px; color: #8899BB; margin-bottom: 8px;">Hello {name},</p>
            <p style="font-size: 16px; color: #ffffff; margin-bottom: 24px;">
                Your MediLink verification code is:
            </p>
            <div style="background: #111D30; border: 1px solid rgba(229,52,26,0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px; font-weight: 700; color: #E5341A; letter-spacing: 16px;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #8899BB; margin-bottom: 8px;">
                This code expires in 30 minutes. Do not share it with anyone.
            </p>
            <p style="font-size: 13px; color: #8899BB;">
                If you did not request this, please ignore this email.
            </p>
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="font-size: 12px; color: #5566AA; margin: 0;">
                    MediLink — Emergency Medical Record Access
                </p>
            </div>
        </div>
        """
        
        params = {
            "from": "MediLink <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Your MediLink Verification Code",
            "html": html_content,
        }
        
        response = resend.Emails.send(params)
        logger.info(f"[EMAIL] Resend success. ID: {response.get('id')}")
        return True
        
    except Exception as e:
        logger.error(f"[EMAIL] Resend failed for {to_email}: {str(e)}")
        return False


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Public API — send an email using Resend.
    """
    try:
        resend.api_key = os.getenv("RESEND_API_KEY")
        if not resend.api_key:
            return False

        params = {
            "from": "MediLink <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": f"<div style='font-family:sans-serif; white-space:pre-wrap;'>{body}</div>",
        }
        resend.Emails.send(params)
        return True
    except Exception as e:
        logger.error(f"[EMAIL] send_email failed: {str(e)}")
        return False


# ---------------------------------------------------------------------------
# SMS delivery
# ---------------------------------------------------------------------------

def _send_via_twilio(phone: str, message: str) -> bool:
    """Send SMS via Twilio REST API."""
    sid = os.getenv("TWILIO_SID", "")
    token = os.getenv("TWILIO_TOKEN", "")
    from_num = os.getenv("TWILIO_FROM", "")

    print(f"[DEBUG] Twilio SID present: {bool(sid)}")
    print(f"[DEBUG] Twilio TOKEN present: {bool(token)}")
    print(f"[DEBUG] Twilio FROM: {from_num}")

    if not sid or not token or not from_num:
        logger.error("[SMS] Twilio credentials missing in environment.")
        return False

    try:
        import urllib.request
        import urllib.parse
        import base64

        credentials = base64.b64encode(
            f"{sid}:{token}".encode()
        ).decode()

        payload = urllib.parse.urlencode({
            "To": phone,
            "From": from_num,
            "Body": message,
        }).encode()

        req = urllib.request.Request(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
            data=payload,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )
        with urllib.request.urlopen(req) as res:
            if res.status == 201:
                logger.info("[SMS] Sent via Twilio to %s", phone)
                return True
    except Exception as e:
        logger.error("[SMS] Twilio failed for %s: %s", phone, str(e))
    return False


def _send_via_fast2sms(phone: str, message: str) -> bool:
    """Send SMS via Fast2SMS (Indian numbers, DLT route)."""
    api_key = os.getenv("FAST2SMS_API_KEY", "")
    if not api_key:
        return False

    try:
        import urllib.request
        import urllib.parse
        import json

        # Strip country code if present
        number = phone.lstrip("+").lstrip("91") if phone.startswith(("+91", "91")) else phone

        payload = json.dumps({
            "route": "q",            # Quick SMS (transactional)
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": number,
        }).encode()

        req = urllib.request.Request(
            "https://www.fast2sms.com/dev/bulkV2",
            data=payload,
            headers={
                "authorization": api_key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            if data.get("return"):
                logger.info("[SMS] Sent via Fast2SMS to %s", phone)
                return True
            else:
                logger.error("[SMS] Fast2SMS error for %s: %s", phone, data)
    except Exception as e:
        logger.error("[SMS] Fast2SMS failed for %s: %s", phone, str(e))
    return False


def send_sms(phone_number: str, message: str) -> bool:
    """
    Public API — send an SMS.
    Tries Twilio → Fast2SMS → dev fallback.
    """
    # Enforce E.164 formatting
    phone_number = "".join(filter(lambda x: x.isdigit() or x == "+", phone_number))
    if not phone_number.startswith("+"):
        if len(phone_number) == 10:
            phone_number = f"+91{phone_number}"
        else:
            phone_number = f"+{phone_number}"

    if _send_via_twilio(phone_number, message):
        return True

    if _send_via_fast2sms(phone_number, message):
        return True

    logger.error("[AUTH] Critical: Failed to send SMS to %s via all providers.", phone_number)
    return False


# ---------------------------------------------------------------------------
# Admin notifications (fundraising etc.)
# ---------------------------------------------------------------------------

def notify_admin_fundraising(application_details: dict):
    admin_email = os.getenv("ADMIN_EMAIL", "medilinkorg@yahoo.com")
    admin_phone = os.getenv("ADMIN_PHONE", "6362177190")

    subject = f"New Fundraising Application: {application_details.get('name')}"
    body = (
        f"A new fundraising application has been submitted.\n\n"
        f"Name: {application_details.get('name')}\n"
        f"Condition: {application_details.get('medical_condition')}\n"
        f"Hospital: {application_details.get('hospital_name')}\n"
        f"Description: {application_details.get('description')}\n"
        f"Estimated Cost: {application_details.get('estimated_cost')}\n"
        f"Contact: {application_details.get('phone_number')} / {application_details.get('email')}\n\n"
        f"Please verify the details within 12 hours."
    )

    send_email(admin_email, subject, body)
    send_sms(admin_phone, f"MediLink: New Fundraising App from {application_details.get('name')}. Check email for details.")
