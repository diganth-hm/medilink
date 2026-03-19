"""
Install Python packages directly into the venv site-packages by downloading
wheels from PyPI and extracting them — completely bypassing pip's distlib which
has broken .exe launchers on this machine.
"""
import os
import sys
import urllib.request
import zipfile
import shutil

SITE_PACKAGES = r"C:\medilink\backend\medilink_venv\Lib\site-packages"
TMP = r"C:\medilink\backend\_whl_tmp"
os.makedirs(TMP, exist_ok=True)

PACKAGES = [
    # (filename, url)
    ("anyio-4.3.0-py3-none-any.whl",       "https://files.pythonhosted.org/packages/py3/a/anyio/anyio-4.3.0-py3-none-any.whl"),
    ("starlette-0.36.3-py3-none-any.whl",  "https://files.pythonhosted.org/packages/py3/s/starlette/starlette-0.36.3-py3-none-any.whl"),
    ("fastapi-0.110.0-py3-none-any.whl",   "https://files.pythonhosted.org/packages/py3/f/fastapi/fastapi-0.110.0-py3-none-any.whl"),
    ("python_dotenv-1.0.1-py3-none-any.whl","https://files.pythonhosted.org/packages/py3/p/python_dotenv/python_dotenv-1.0.1-py3-none-any.whl"),
    ("python_multipart-0.0.9-py3-none-any.whl","https://files.pythonhosted.org/packages/py3/p/python_multipart/python_multipart-0.0.9-py3-none-any.whl"),
    ("aiofiles-23.2.1-py3-none-any.whl",   "https://files.pythonhosted.org/packages/py3/a/aiofiles/aiofiles-23.2.1-py3-none-any.whl"),
    ("sniffio-1.3.1-py3-none-any.whl",     "https://files.pythonhosted.org/packages/py3/s/sniffio/sniffio-1.3.1-py3-none-any.whl"),
]

def install_whl(filename, url):
    dest_file = os.path.join(TMP, filename)
    print(f"Downloading {filename}...", end=" ", flush=True)
    try:
        urllib.request.urlretrieve(url, dest_file)
        print("OK")
    except Exception as e:
        print(f"FAILED: {e}")
        return False

    print(f"  Installing into site-packages...", end=" ", flush=True)
    try:
        with zipfile.ZipFile(dest_file) as zf:
            zf.extractall(SITE_PACKAGES)
        print("OK")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False

for fname, url in PACKAGES:
    install_whl(fname, url)

# Clean up
shutil.rmtree(TMP, ignore_errors=True)
print("\nDone! Testing import...")
try:
    import importlib
    sys.path.insert(0, SITE_PACKAGES)
    fastapi = importlib.import_module("fastapi")
    print(f"fastapi imported successfully: {fastapi.__version__}")
except Exception as e:
    print(f"Import test failed: {e}")
