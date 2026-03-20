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

import smtplib
import ssl
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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
    try:
        SMTP_USER = os.getenv("SMTP_USER")
        SMTP_PASS = os.getenv("SMTP_PASS")
        
        if not SMTP_USER or not SMTP_PASS:
            logger.error("[EMAIL] SMTP credentials missing")
            return False
        
        logger.info(f"[EMAIL] Sending OTP to {to_email} via Gmail SSL port 465")
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your MediLink Verification Code"
        msg["From"] = f"MediLink <{SMTP_USER}>"
        msg["To"] = to_email
        
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0A1628; color: #ffffff; border-radius: 12px;">
            <div style="margin-bottom: 24px;">
                <span style="font-size: 28px; font-weight: 700; color: #ffffff;">medi</span>
                <span style="font-size: 28px; font-weight: 700; color: #E5341A;">link</span>
            </div>
            <p style="font-size: 16px; color: #8899BB; margin-bottom: 8px;">Hello {name},</p>
            <p style="font-size: 16px; color: #ffffff; margin-bottom: 24px;">Your MediLink verification code is:</p>
            <div style="background: #111D30; border: 1px solid rgba(229,52,26,0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px; font-weight: 700; color: #E5341A; letter-spacing: 16px;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #8899BB; margin-bottom: 8px;">This code expires in 30 minutes. Do not share it with anyone.</p>
            <p style="font-size: 13px; color: #8899BB;">If you did not request this, please ignore this email.</p>
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="font-size: 12px; color: #5566AA; margin: 0;">MediLink — Emergency Medical Record Access</p>
            </div>
        </div>
        """
        
        msg.attach(MIMEText(html_content, "html"))
        
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        
        logger.info(f"[EMAIL] Successfully sent to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"[EMAIL] Failed for {to_email}: {str(e)}")
        return False


def send_email(to_email: str, subject: str, body: str) -> bool:
    try:
        SMTP_USER = os.getenv("SMTP_USER")
        SMTP_PASS = os.getenv("SMTP_PASS")
        if not SMTP_USER or not SMTP_PASS:
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"MediLink <{SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error(f"[EMAIL] send_email failed: {str(e)}")
        return False


# ---------------------------------------------------------------------------
# SMS delivery
# ---------------------------------------------------------------------------

def send_sms(to_phone: str, otp_code: str):
    """
    Send OTP via Twilio. Silently fail if Trial account limits hit.
    """
    try:
        TWILIO_SID = os.getenv("TWILIO_SID")
        TWILIO_TOKEN = os.getenv("TWILIO_TOKEN")
        TWILIO_FROM = os.getenv("TWILIO_FROM")
        
        if not TWILIO_SID or not TWILIO_TOKEN:
            logger.warning("[SMS] Twilio not configured, skipping SMS")
            return False
        
        from twilio.rest import Client
        client = Client(TWILIO_SID, TWILIO_TOKEN)

        phone_number = "".join(filter(lambda x: x.isdigit() or x == "+", to_phone))
        if not phone_number.startswith("+"):
            if len(phone_number) == 10:
                phone_number = f"+91{phone_number}"
            else:
                phone_number = f"+{phone_number}"

        client.messages.create(
            body=f"MediLink Emergency Medical Records\n\nYour verification code is: {otp_code}\n\nValid for 30 minutes. Do not share this code.\n\n- MediLink Team",
            from_=TWILIO_FROM,
            to=phone_number
        )
        
        logger.info(f"[SMS] Sent to {phone_number}")
        return True
        
    except Exception as e:
        logger.warning(f"[SMS] Failed for {to_phone}: {str(e)} — continuing without SMS")
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
