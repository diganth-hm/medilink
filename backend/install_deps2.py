"""
Install remaining Python packages by downloading wheels from PyPI directly.
"""
import os, sys, urllib.request, zipfile, shutil

SITE_PACKAGES = r"C:\medilink\backend\medilink_venv\Lib\site-packages"
TMP = r"C:\medilink\backend\_whl_tmp2"
os.makedirs(TMP, exist_ok=True)

PACKAGES = [
    # SQLAlchemy — use pre-compiled wheel for Windows
    ("SQLAlchemy-2.0.29-cp313-cp313-win_amd64.whl",
     "https://files.pythonhosted.org/packages/cp313/s/sqlalchemy/SQLAlchemy-2.0.29-cp313-cp313-win_amd64.whl"),

    # typing-extensions (needed by pydantic + sqlalchemy)
    ("typing_extensions-4.11.0-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/t/typing_extensions/typing_extensions-4.11.0-py3-none-any.whl"),

    # annotated-types
    ("annotated_types-0.6.0-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/a/annotated_types/annotated_types-0.6.0-py3-none-any.whl"),

    # pydantic-core — need pre-compiled binary
    ("pydantic_core-2.16.3-cp313-cp313-win_amd64.whl",
     "https://files.pythonhosted.org/packages/cp313/p/pydantic_core/pydantic_core-2.16.3-cp313-cp313-win_amd64.whl"),

    # pydantic
    ("pydantic-2.6.4-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/p/pydantic/pydantic-2.6.4-py3-none-any.whl"),

    # email-validator (for pydantic[email])
    ("email_validator-2.1.1-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/e/email_validator/email_validator-2.1.1-py3-none-any.whl"),
    ("dnspython-2.6.1-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/d/dnspython/dnspython-2.6.1-py3-none-any.whl"),

    # passlib
    ("passlib-1.7.4-py2.py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py2.py3/p/passlib/passlib-1.7.4-py2.py3-none-any.whl"),

    # bcrypt — pre-compiled
    ("bcrypt-3.2.2-cp36-abi3-win_amd64.whl",
     "https://files.pythonhosted.org/packages/cp36/b/bcrypt/bcrypt-3.2.2-cp36-abi3-win_amd64.whl"),

    # python-jose + cryptography
    ("python_jose-3.3.0-py2.py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py2.py3/p/python_jose/python_jose-3.3.0-py2.py3-none-any.whl"),
    ("ecdsa-0.18.0-py2.py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py2.py3/e/ecdsa/ecdsa-0.18.0-py2.py3-none-any.whl"),
    ("pyasn1-0.6.0-py2.py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py2.py3/p/pyasn1/pyasn1-0.6.0-py2.py3-none-any.whl"),
    ("rsa-4.9-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/r/rsa/rsa-4.9-py3-none-any.whl"),

    # groq SDK
    ("groq-1.1.0-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/g/groq/groq-1.1.0-py3-none-any.whl"),

    # groq dependencies
    ("httpx-0.27.0-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/h/httpx/httpx-0.27.0-py3-none-any.whl"),
    ("httpcore-1.0.5-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/h/httpcore/httpcore-1.0.5-py3-none-any.whl"),
    ("certifi-2024.2.2-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/c/certifi/certifi-2024.2.2-py3-none-any.whl"),
    ("idna-3.6-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/i/idna/idna-3.6-py3-none-any.whl"),
    ("distro-1.9.0-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/d/distro/distro-1.9.0-py3-none-any.whl"),

    # qrcode
    ("qrcode-7.4.2-py3-none-any.whl",
     "https://files.pythonhosted.org/packages/py3/q/qrcode/qrcode-7.4.2-py3-none-any.whl"),

    # pillow — pre-compiled
    ("pillow-10.3.0-cp313-cp313-win_amd64.whl",
     "https://files.pythonhosted.org/packages/cp313/p/pillow/pillow-10.3.0-cp313-cp313-win_amd64.whl"),
]

def install_whl(filename, url):
    dest_file = os.path.join(TMP, filename)
    print(f"[GET] {filename[:60]}...", end=" ", flush=True)
    try:
        urllib.request.urlretrieve(url, dest_file)
        print("OK", end=" ")
    except Exception as e:
        print(f"FAIL({e})")
        return False
    try:
        with zipfile.ZipFile(dest_file) as zf:
            zf.extractall(SITE_PACKAGES)
        print("[INST OK]")
        return True
    except Exception as e:
        print(f"[INST FAIL: {e}]")
        return False

failed = []
for fname, url in PACKAGES:
    if not install_whl(fname, url):
        failed.append(fname)

shutil.rmtree(TMP, ignore_errors=True)

print(f"\n{'='*60}")
if failed:
    print(f"FAILED packages: {failed}")
else:
    print("All packages installed successfully!")

print("\nTesting critical imports:")
for mod in ["fastapi", "sqlalchemy", "pydantic", "passlib", "jose", "dotenv", "qrcode", "groq"]:
    try:
        m = __import__(mod)
        print(f"  [OK] {mod}")
    except ImportError as e:
        print(f"  [FAIL] {mod}: {e}")
