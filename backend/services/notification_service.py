import logging
import os
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    GMAIL_API_AVAILABLE = True
except ImportError:
    GMAIL_API_AVAILABLE = False

try:
    import requests
except ImportError:
    requests = None

try:
    from twilio.rest import Client
except ImportError:
    Client = None

logger = logging.getLogger("medilink.notification")


def get_gmail_service():
    """Build an authenticated Gmail API service using env-var credentials."""
    if not GMAIL_API_AVAILABLE:
        raise RuntimeError("Google API client libraries are not installed")

    client_id     = os.getenv("GMAIL_CLIENT_ID")
    client_secret = os.getenv("GMAIL_CLIENT_SECRET")
    refresh_token = os.getenv("GMAIL_REFRESH_TOKEN")

    if not all([client_id, client_secret, refresh_token]):
        raise ValueError("Gmail API credentials not configured in environment variables")

    creds = Credentials(
        token=None,
        refresh_token=str(refresh_token),
        client_id=str(client_id),
        client_secret=str(client_secret),
        token_uri="https://oauth2.googleapis.com/token",
    )
    creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


def _build_raw_message(sender: str, to: str, subject: str, html: str) -> str:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = sender
    msg["To"]      = to
    msg.attach(MIMEText(html, "html"))
    return base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")


def send_otp_email(to_email: str, otp: str, name: str) -> bool:
    try:
        logger.info(f"[EMAIL] Sending OTP to {to_email} via Gmail API")
        service = get_gmail_service()
        sender  = f"MediLink <{os.getenv('GMAIL_SENDER', 'medilinkorg68@gmail.com')}>"

        html = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;
                    background: #0A1628; color: #ffffff; border-radius: 12px;">
            <div style="margin-bottom: 24px;">
                <span style="font-size: 28px; font-weight: 700; color: #ffffff;">medi</span>
                <span style="font-size: 28px; font-weight: 700; color: #E5341A;">link</span>
            </div>
            <p style="font-size: 16px; color: #8899BB;">Hello {name},</p>
            <p style="font-size: 16px; color: #ffffff; margin-bottom: 24px;">
                Your MediLink verification code is:
            </p>
            <div style="background: #111D30; border: 1px solid rgba(229,52,26,0.3);
                        border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px; font-weight: 700; color: #E5341A;
                             letter-spacing: 16px;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #8899BB;">
                This code expires in 30 minutes. Do not share it with anyone.
            </p>
            <p style="font-size: 13px; color: #8899BB;">
                If you did not request this, please ignore this email.
            </p>
            <div style="margin-top: 32px; padding-top: 16px;
                        border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="font-size: 12px; color: #5566AA; margin: 0;">
                    MediLink — Emergency Medical Record Access
                </p>
            </div>
        </div>
        """

        raw = _build_raw_message(sender, to_email, "Your MediLink Verification Code", html)
        result = service.users().messages().send(userId="me", body={"raw": raw}).execute()
        logger.info(f"[EMAIL] Sent via Gmail API. Message ID: {result['id']}")
        return True

    except Exception as e:
        logger.error(f"[EMAIL] Failed to send to {to_email}: {e}")
        raise e


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    try:
        service = get_gmail_service()
        sender  = f"MediLink <{os.getenv('GMAIL_SENDER', 'medilinkorg68@gmail.com')}>"
        raw = _build_raw_message(sender, to_email, subject, html_content)
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
        logger.info(f"[EMAIL] General email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"[EMAIL] Failed to send general email to {to_email}: {e}")
        raise e


def send_otp_sms(to_phone: str, otp: str) -> bool:
    try:
        fast2sms_key = os.getenv("FAST2SMS_API_KEY")

        if fast2sms_key and requests:
            phone_number = to_phone.replace("+91", "").replace("+", "").strip()
            if len(phone_number) > 10:
                phone_number = phone_number[-10:]

            logger.info(f"[SMS] Sending to {phone_number} via Fast2SMS")
            response = requests.post(
                "https://www.fast2sms.com/dev/bulkV2",
                json={"variables_values": otp, "route": "otp", "numbers": phone_number},
                headers={"authorization": str(fast2sms_key), "Content-Type": "application/json"},
            )
            data = response.json()
            if data.get("return") is True:
                logger.info(f"[SMS] Fast2SMS success for {phone_number}")
                return True
            logger.error(f"[SMS] Fast2SMS error: {data.get('message', 'Unknown')}")
            return False

        elif Client:
            sid      = os.getenv("TWILIO_SID")
            token    = os.getenv("TWILIO_TOKEN")
            from_num = os.getenv("TWILIO_FROM")

            if not all([sid, token, from_num]):
                logger.warning("[SMS] No SMS provider configured")
                return False

            client = Client(str(sid), str(token))
            msg = client.messages.create(
                body=(
                    f"MediLink Emergency Medical Records\n\n"
                    f"Your verification code is: {otp}\n\n"
                    f"Valid for 30 minutes. Do not share.\n\n- MediLink Team"
                ),
                from_=str(from_num),
                to=to_phone,
            )
            logger.info(f"[SMS] Twilio success: {msg.sid}")
            return True
        else:
            logger.warning("[SMS] Neither Fast2SMS nor Twilio available")
            return False

    except Exception as e:
        logger.error(f"[SMS] Failed for {to_phone}: {e}")
        return False


def notify_admin_fundraising(application_details: dict):
    admin_email = os.getenv("ADMIN_EMAIL", "medilinkorg@yahoo.com")
    admin_phone = os.getenv("ADMIN_PHONE", "6362177190")

    subject = f"New Fundraising Application: {application_details.get('name')}"
    body = (
        f"A new fundraising application has been submitted.<br><br>"
        f"Name: {application_details.get('name')}<br>"
        f"Condition: {application_details.get('medical_condition')}<br>"
        f"Hospital: {application_details.get('hospital_name')}<br>"
        f"Description: {application_details.get('description')}<br>"
        f"Estimated Cost: {application_details.get('estimated_cost')}<br>"
        f"Contact: {application_details.get('phone_number')} / {application_details.get('email')}<br><br>"
        f"Please verify the details within 12 hours."
    )

    send_email(admin_email, subject, body)
    send_otp_sms(admin_phone, "MediLink: New Fundraising App. Check email.")
