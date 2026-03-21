import urllib.request
import zipfile
import io
import sys
import os

PACKAGES = {
    "google-auth-oauthlib": "https://files.pythonhosted.org/packages/auth/google-auth-oauthlib/1.2.0/google-auth-oauthlib-1.2.0.tar.gz",
    "requests-oauthlib": "https://files.pythonhosted.org/packages/req/requests-oauthlib/2.0.0/requests-oauthlib-2.0.0.tar.gz",
    "oauthlib": "https://files.pythonhosted.org/packages/oauth/oauthlib/3.2.2/oauthlib-3.2.2.tar.gz"
}

target_dir = r"C:\medilink\backend\medilink_venv\Lib\site-packages"

def install():
    import json
    import tempfile
    packages = [
        "google-auth-oauthlib", "requests-oauthlib", "oauthlib", "google-auth-httplib2",
        "google-auth", "cachetools", "pyasn1", "pyasn1-modules", "rsa",
        "google-api-python-client", "google-api-core", "uritemplate", "httplib2", "googleapis-common-protos",
        "requests", "urllib3", "certifi", "idna", "charset-normalizer"
    ]
    for name in packages:
        print(f"Fetching {name}...")
        url = urllib.request.urlopen(f"https://pypi.org/pypi/{name}/json").read()
        latest = json.loads(url)["info"]["version"]
        wheels_url = f"https://pypi.org/pypi/{name}/{latest}/json"
        urls = json.loads(urllib.request.urlopen(wheels_url).read())["urls"]
        whl_url = None
        for x in urls:
            fname = x["filename"]
            if fname.endswith("none-any.whl"):
                whl_url = x["url"]
                break
            elif fname.endswith("win_amd64.whl") or fname.endswith("win32.whl"):
                whl_url = x["url"]
        
        if not whl_url: # fallback
            for x in urls:
                if x["filename"].endswith(".whl"):
                    whl_url = x["url"]
                    break
        if whl_url:
            print(f"Downloading {name} from {whl_url}")
        else:
            print(f"Could not find wheel for {name}")
            continue
        
        response = urllib.request.urlopen(whl_url)
        with tempfile.NamedTemporaryFile(suffix=".whl", delete=False) as f:
            f.write(response.read())
            temp_name = f.name
            
        with zipfile.ZipFile(temp_name) as z:
            z.extractall(target_dir)
        
        os.remove(temp_name)
        print(f"Installed {name}")

if __name__ == "__main__":
    install()
