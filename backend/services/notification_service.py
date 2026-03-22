import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("medilink.notification")

def send_email(to_email: str, subject: str, html_body: str):
    """Send email using smtplib and App Password."""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = os.getenv('MAIL_FROM', 'medilinkorg68@gmail.com')
    msg['To'] = to_email
    msg.attach(MIMEText(html_body, 'html'))
    
    username = os.getenv('MAIL_USERNAME', 'medilinkorg68@gmail.com')
    password = os.getenv('MAIL_PASSWORD')
    
    if not password:
        logger.error("MAIL_PASSWORD not set in environment")
        return False
        
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(username, password)
            server.sendmail(msg['From'], to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error(f"Email error: {e}")
        return False

def send_otp_email(to_email: str, otp: str, name: str) -> bool:
    subject = "Your MediLink Verification Code"
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
    return send_email(to_email, subject, html)

# Mocked SMS for now as requested
def send_otp_sms(to_phone: str, otp: str) -> bool:
    logger.info(f"[SMS MOCK] Send to {to_phone}: {otp}")
    return True

def notify_admin_fundraising(application_details: dict):
    # This will be handled directly in the router now as per new requirement
    pass
