import logging
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("medilink.notification")

def send_otp_email(to_email: str, otp: str, name: str):
    try:
        SMTP_USER = os.getenv("SMTP_USER")
        SMTP_PASS = os.getenv("SMTP_PASS")
        SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
        SMTP_SSL_PORT = 465

        if not SMTP_USER or not SMTP_PASS:
            raise ValueError("SMTP credentials not configured")

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
            <p style="font-size: 16px; color: #8899BB;">Hello {name},</p>
            <p style="font-size: 16px; color: #ffffff; margin-bottom: 24px;">Your MediLink verification code is:</p>
            <div style="background: #111D30; border: 1px solid rgba(229,52,26,0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px; font-weight: 700; color: #E5341A; letter-spacing: 16px;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #8899BB;">This code expires in 30 minutes. Do not share it with anyone.</p>
            <p style="font-size: 13px; color: #8899BB;">If you did not request this please ignore this email.</p>
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="font-size: 12px; color: #5566AA; margin: 0;">MediLink — Emergency Medical Record Access</p>
            </div>
        </div>
        """

        msg.attach(MIMEText(html_content, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_SSL_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

        print(f"[DEBUG] Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email}: {str(e)}")
        raise e


def send_otp_sms(to_phone: str, otp: str):
    try:
        import requests
        FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY")

        if FAST2SMS_API_KEY:
            phone_number = to_phone.replace("+91", "").replace("+", "").strip()
            if len(phone_number) > 10:
                phone_number = phone_number[-10:]

            print(f"[DEBUG] Sending SMS to {phone_number} via Fast2SMS")

            url = "https://www.fast2sms.com/dev/bulkV2"
            payload = {
                "variables_values": otp,
                "route": "otp",
                "numbers": phone_number,
            }
            headers = {
                "authorization": FAST2SMS_API_KEY,
                "Content-Type": "application/json"
            }

            response = requests.post(url, json=payload, headers=headers)
            data = response.json()

            if data.get("return") == True:
                print(f"[DEBUG] SMS sent successfully via Fast2SMS to {phone_number}")
                return True
            else:
                raise Exception(f"Fast2SMS error: {data.get('message', 'Unknown error')}")

        else:
            from twilio.rest import Client
            TWILIO_SID = os.getenv("TWILIO_SID")
            TWILIO_TOKEN = os.getenv("TWILIO_TOKEN")
            TWILIO_FROM = os.getenv("TWILIO_FROM")

            if not TWILIO_SID or not TWILIO_TOKEN:
                print(f"[WARNING] No SMS provider configured")
                return False

            client = Client(TWILIO_SID, TWILIO_TOKEN)
            message = client.messages.create(
                body=f"MediLink Emergency Medical Records\n\nYour verification code is: {otp}\n\nValid for 30 minutes. Do not share this code.\n\n- MediLink Team",
                from_=TWILIO_FROM,
                to=to_phone
            )
            print(f"[DEBUG] SMS sent via Twilio: {message.sid}")
            return True

    except Exception as e:
        print(f"[ERROR] SMS sending failed for {to_phone}: {str(e)}")
        return False


def send_email(to_email: str, subject: str, html_content: str):
    try:
        SMTP_USER = os.getenv("SMTP_USER")
        SMTP_PASS = os.getenv("SMTP_PASS")
        SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
        SMTP_SSL_PORT = 465

        if not SMTP_USER or not SMTP_PASS:
            raise ValueError("SMTP credentials not configured")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"MediLink <{SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_SSL_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

        print(f"[DEBUG] General email sent to {to_email}")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to send general email to {to_email}: {str(e)}")
        raise e

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
