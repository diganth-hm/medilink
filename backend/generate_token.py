"""
Run this script ONCE locally to generate OAuth2 tokens for Gmail API.
Prerequisites:
  1. Download credentials.json from Google Cloud Console and place it here.
  2. pip install google-auth-oauthlib

Usage:
  cd C:\medilink\backend
  python generate_token.py
"""
from google_auth_oauthlib.flow import InstalledAppFlow
import json

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
creds = flow.run_local_server(port=0)

print("\n=== COPY THESE VALUES TO RENDER ENV VARS ===")
print(f"GMAIL_CLIENT_ID     = {creds.client_id}")
print(f"GMAIL_CLIENT_SECRET = {creds.client_secret}")
print(f"GMAIL_REFRESH_TOKEN = {creds.refresh_token}")
print("GMAIL_SENDER        = medilinkorg68@gmail.com")

token_data = {
    "token": creds.token,
    "refresh_token": creds.refresh_token,
    "client_id": creds.client_id,
    "client_secret": creds.client_secret,
    "token_uri": "https://oauth2.googleapis.com/token"
}

with open("gmail_token.json", "w") as f:
    json.dump(token_data, f, indent=2)

print("\nSaved tokens to gmail_token.json")
