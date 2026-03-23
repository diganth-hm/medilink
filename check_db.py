import sqlite3
import os

db_path = "backend/medilink.db"
if not os.path.exists(db_path):
    print(f"File {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(otp_tokens)")
columns = cursor.fetchall()
print("Columns in otp_tokens:")
for col in columns:
    print(col)

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("\nTables in DB:")
for t in tables:
    print(t)

conn.close()
