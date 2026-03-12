"""
Notification Service — OTP delivery via Email (SMTP/SendGrid) and SMS (Twilio / Fast2SMS).

Priority order for each channel:
  Email : SMTP (Gmail/any) → SendGrid → DEV FALLBACK (log only)
  SMS   : Twilio           → Fast2SMS → DEV FALLBACK (log only)

Required environment variables (set in Render / .env):
  SMTP_EMAIL       — sender Gmail address (e.g. yourapp@gmail.com)
  SMTP_PASSWORD    — Gmail App Password (not account password)
  SMTP_HOST        — optional, default smtp.gmail.com
  SMTP_PORT        — optional, default 587

  SENDGRID_API_KEY — optional SendGrid fallback

  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_FROM_NUMBER  — E.164 format, e.g. +15005550006

  FAST2SMS_API_KEY    — Fast2SMS API key (for Indian numbers)

  OTP_EXPIRY_MINUTES  — default 5
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
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")

DEV_MODE = not (SMTP_EMAIL or SENDGRID_API_KEY or TWILIO_ACCOUNT_SID or FAST2SMS_API_KEY)


# ---------------------------------------------------------------------------
# Email delivery
# ---------------------------------------------------------------------------

def _send_via_smtp(to_email: str, subject: str, body_html: str, body_text: str) -> bool:
    """Send email via SMTP (Gmail or any SMTP server)."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_EMAIL
        msg["To"] = to_email
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        logger.info("[EMAIL] Sent via SMTP to %s", to_email)
        return True
    except Exception as e:
        logger.error("[EMAIL] SMTP failed: %s", e)
        return False


def _send_via_sendgrid(to_email: str, subject: str, body_html: str, body_text: str) -> bool:
    """Send email via SendGrid API."""
    try:
        import urllib.request
        import json

        payload = json.dumps({
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": SMTP_EMAIL or "noreply@medilink.app"},
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
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req) as res:
            if res.status in (200, 202):
                logger.info("[EMAIL] Sent via SendGrid to %s", to_email)
                return True
    except Exception as e:
        logger.error("[EMAIL] SendGrid failed: %s", e)
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
    expiry_min = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))

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

    if SMTP_EMAIL and SMTP_PASSWORD:
        if _send_via_smtp(to_email, subject, html, plain):
            return True

    if SENDGRID_API_KEY:
        if _send_via_sendgrid(to_email, subject, html, plain):
            return True

    # DEV FALLBACK — log clearly so developers can test
    logger.warning(
        "\n" + "="*60 +
        "\n[DEV MODE] Email NOT sent — no SMTP/SendGrid configured." +
        f"\n  TO      : {to_email}" +
        f"\n  SUBJECT : {subject}" +
        f"\n  OTP CODE: {otp_val or '(see body)'}" +
        f"\n  BODY    : {plain}" +
        "\n" + "="*60
    )
    return False   # returns False so caller knows delivery failed


# ---------------------------------------------------------------------------
# SMS delivery
# ---------------------------------------------------------------------------

def _send_via_twilio(phone: str, message: str) -> bool:
    """Send SMS via Twilio REST API."""
    try:
        import urllib.request
        import urllib.parse
        import base64

        credentials = base64.b64encode(
            f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()
        ).decode()

        payload = urllib.parse.urlencode({
            "To": phone,
            "From": TWILIO_FROM_NUMBER,
            "Body": message,
        }).encode()

        req = urllib.request.Request(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
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
        logger.error("[SMS] Twilio failed: %s", e)
    return False


def _send_via_fast2sms(phone: str, message: str) -> bool:
    """Send SMS via Fast2SMS (Indian numbers, DLT route)."""
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
                "authorization": FAST2SMS_API_KEY,
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
                logger.error("[SMS] Fast2SMS error: %s", data)
    except Exception as e:
        logger.error("[SMS] Fast2SMS failed: %s", e)
    return False


def send_sms(phone_number: str, message: str) -> bool:
    """
    Public API — send an SMS.
    Tries Twilio → Fast2SMS → dev fallback.
    """
    import re
    otp_val = None
    match = re.search(r"\b(\d{6})\b", message)
    if match:
        otp_val = match.group(1)

    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER:
        if _send_via_twilio(phone_number, message):
            return True

    if FAST2SMS_API_KEY:
        if _send_via_fast2sms(phone_number, message):
            return True

    # DEV FALLBACK
    logger.warning(
        "\n" + "="*60 +
        "\n[DEV MODE] SMS NOT sent — no Twilio/Fast2SMS configured." +
        f"\n  TO      : {phone_number}" +
        f"\n  OTP CODE: {otp_val or '(see message)'}" +
        f"\n  MESSAGE : {message}" +
        "\n" + "="*60
    )
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
