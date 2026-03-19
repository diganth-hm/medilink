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
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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

def _send_via_smtp(to_email: str, subject: str, body_html: str, body_text: str) -> bool:
    """Send email via SMTP (Gmail or any SMTP server)."""
    smtp_email = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASS", "")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    print(f"[DEBUG] Attempting to send email to: {to_email}")
    print(f"[DEBUG] SMTP_USER: {smtp_email}")
    print(f"[DEBUG] SMTP_HOST: {smtp_host}")
    print(f"[DEBUG] SMTP_PORT: {smtp_port}")

    if not smtp_email or not smtp_password:
        logger.error("[EMAIL] SMTP credentials missing in environment.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_email
        msg["To"] = to_email
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())

        print(f"[DEBUG] Email sent successfully to: {to_email}")
        logger.info("[EMAIL] Sent via SMTP to %s", to_email)
        return True
    except Exception as e:
        print(f"[ERROR] Email sending failed: {str(e)}")
        logger.error("[EMAIL] SMTP failed for %s: %s", to_email, str(e))
        raise e


def _send_via_sendgrid(to_email: str, subject: str, body_html: str, body_text: str) -> bool:
    """Send email via SendGrid API."""
    api_key = os.getenv("SENDGRID_API_KEY", "")
    sender_email = os.getenv("SMTP_USER", "noreply@medilink.app")

    if not api_key:
        return False

    try:
        import urllib.request
        import json

        payload = json.dumps({
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": sender_email},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": body_text},
                {"type": "text/html", "value": body_html},
            ],
        }).encode()

        req = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req) as res:
            if res.status in (200, 202):
                logger.info("[EMAIL] Sent via SendGrid to %s", to_email)
                return True
    except Exception as e:
        logger.error("[EMAIL] SendGrid failed for %s: %s", to_email, str(e))
    return False


def _build_otp_email(otp: str, expiry_minutes: int = 5):
    """Return (subject, html, plain) tuple for OTP email."""
    subject = "Your Login OTP"
    plain = (
        f"Your verification OTP is: {otp}\n"
        f"This OTP expires in {expiry_minutes} minutes."
    )
    # Simple HTML fallback that matches the plain text requirement
    html = f"<p>Your verification OTP is: <strong>{otp}</strong><br>This OTP expires in {expiry_minutes} minutes.</p>"
    return subject, html, plain


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Public API — send an email.
    Tries SMTP → SendGrid → dev fallback.
    """
    expiry_min = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))

    # Extract OTP from body if it's an OTP email for rich HTML
    otp_val = None
    import re
    match = re.search(r"\b(\d{6})\b", body)
    if match:
        otp_val = match.group(1)
        s, html, plain = _build_otp_email(otp_val, expiry_min)
        subject = s
    else:
        html = f"<p>{body}</p>"
        plain = body

    if _send_via_smtp(to_email, subject, html, plain):
        return True

    if _send_via_sendgrid(to_email, subject, html, plain):
        return True

    # FINAL FAILURE LOGGING
    logger.error("[AUTH] Critical: Failed to send email to %s via all providers.", to_email)
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
