"""Pinterest OAuth2 authentication helper for Teach4Texas.

One-time setup:
    python3 pinterest_auth.py

This starts a local server, opens the Pinterest auth URL,
captures the callback, and saves the refresh token to .env.

Subsequent runs use the refresh token to get fresh access tokens.
"""
import os
import sys
import http.server
import urllib.parse
import webbrowser
import secrets
import base64

try:
    import requests
    from dotenv import load_dotenv, set_key
except ImportError:
    print("Missing dependencies. Run: pip3 install requests python-dotenv")
    sys.exit(1)

ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(ENV_FILE)

PINTEREST_APP_ID = os.getenv("PINTEREST_APP_ID", "")
PINTEREST_APP_SECRET = os.getenv("PINTEREST_APP_SECRET", "")
REDIRECT_URI = "http://localhost:8432/callback"
SCOPES = "boards:read,pins:read,pins:write"

TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"


def _basic_auth_header():
    """Create HTTP Basic Auth header from app credentials."""
    credentials = f"{PINTEREST_APP_ID}:{PINTEREST_APP_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded}"}


def get_auth_url():
    """Generate Pinterest OAuth2 authorization URL."""
    state = secrets.token_urlsafe(16)
    params = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": PINTEREST_APP_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
    })
    return f"https://www.pinterest.com/oauth/?{params}"


def exchange_code(code):
    """Exchange authorization code for access + refresh tokens."""
    resp = requests.post(
        TOKEN_URL,
        headers=_basic_auth_header(),
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
        },
    )
    resp.raise_for_status()
    return resp.json()


def refresh_access_token(refresh_token):
    """Use refresh token to get a new access token."""
    resp = requests.post(
        TOKEN_URL,
        headers=_basic_auth_header(),
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
    )
    resp.raise_for_status()
    return resp.json()


def get_valid_access_token():
    """Load refresh token from .env, return a fresh access token."""
    load_dotenv(ENV_FILE, override=True)
    refresh_token = os.getenv("PINTEREST_REFRESH_TOKEN", "")
    if not refresh_token:
        print("No PINTEREST_REFRESH_TOKEN found in .env")
        print("Run: python3 pinterest_auth.py  to set up authentication")
        sys.exit(1)

    try:
        data = refresh_access_token(refresh_token)
        # Save new refresh token if provided
        new_refresh = data.get("refresh_token")
        if new_refresh and new_refresh != refresh_token:
            set_key(ENV_FILE, "PINTEREST_REFRESH_TOKEN", new_refresh)
        return data["access_token"]
    except requests.HTTPError as e:
        if e.response.status_code == 401:
            print("Refresh token expired. Re-run: python3 pinterest_auth.py")
            sys.exit(1)
        raise


def run_auth_flow():
    """Complete one-time OAuth flow via local HTTP server."""
    if not PINTEREST_APP_ID or not PINTEREST_APP_SECRET:
        print("Set PINTEREST_APP_ID and PINTEREST_APP_SECRET in .env first")
        print(f"  .env location: {ENV_FILE}")
        sys.exit(1)

    auth_url = get_auth_url()
    print(f"\nOpening Pinterest authorization in your browser...\n")
    print(f"If it doesn't open, visit:\n{auth_url}\n")
    webbrowser.open(auth_url)

    # Capture the callback
    captured_code = [None]

    class CallbackHandler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            code = params.get("code", [None])[0]

            if code:
                captured_code[0] = code
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(b"<h1>Authorization successful!</h1>"
                                 b"<p>You can close this tab and return to the terminal.</p>")
            else:
                error = params.get("error", ["unknown"])[0]
                self.send_response(400)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(f"<h1>Error: {error}</h1>".encode())

        def log_message(self, format, *args):
            pass  # Suppress request logging

    server = http.server.HTTPServer(("localhost", 8432), CallbackHandler)
    print("Waiting for Pinterest callback on localhost:8432...")
    server.handle_request()  # Handle one request then stop

    if not captured_code[0]:
        print("Failed to capture authorization code.")
        sys.exit(1)

    print("Exchanging code for tokens...")
    tokens = exchange_code(captured_code[0])

    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token", "")

    # Save to .env
    set_key(ENV_FILE, "PINTEREST_REFRESH_TOKEN", refresh_token)
    print(f"\nRefresh token saved to {ENV_FILE}")

    # Verify it works
    resp = requests.get(
        "https://api.pinterest.com/v5/user_account",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if resp.ok:
        user = resp.json()
        print(f"Authenticated as: {user.get('username', 'unknown')}")
    else:
        print("Warning: Could not verify token, but it was saved.")

    print("\nSetup complete! You can now run publish_pins.py")


if __name__ == "__main__":
    run_auth_flow()
