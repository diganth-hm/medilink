import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from dotenv import load_dotenv

load_dotenv()

# Master key for deriving user-specific keys if needed, or static for demo
# In production, this would be a high-security environment secret
ENCRYPTION_SECRET = os.getenv("ENCRYPTION_SECRET", "medilink-super-secret-key-2024")

def get_fernet_key(salt_text: str) -> bytes:
    """Derive a consistent 32-byte key from the secret and a salt (e.g. user_id)."""
    password = ENCRYPTION_SECRET.encode()
    salt = salt_text.encode().ljust(16, b'\0')[:16] # Ensure 16 bytes
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password))
    return key

def encrypt_data(data: bytes, user_id: int) -> bytes:
    """Encrypt binary data using a user-specific derived key."""
    key = get_fernet_key(str(user_id))
    f = Fernet(key)
    return f.encrypt(data)

def decrypt_data(token: bytes, user_id: int) -> bytes:
    """Decrypt binary data using a user-specific derived key."""
    key = get_fernet_key(str(user_id))
    f = Fernet(key)
    return f.decrypt(token)
