import os

def send_sms(phone_number: str, message: str):
    """
    Mock SMS service. In a real application, integration with Twilio or similar would go here.
    """
    print(f"DEBUG: [SMS SENT to {phone_number}] {message}")
    return True

def send_email(email: str, subject: str, body: str):
    """
    Mock Email service. In a real application, integration with SendGrid or SMTP would go here.
    """
    print(f"DEBUG: [EMAIL SENT to {email}] SUBJECT: {subject} | BODY: {body}")
    return True

def notify_admin_fundraising(application_details: dict):
    admin_email = "medilinkorg@yahoo.com"
    admin_phone = "6362177190"
    
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
