"""Pinterest API v5 client for Teach4Texas."""
import time
import requests


BASE_URL = "https://api.pinterest.com/v5"


class PinterestClient:
    def __init__(self, access_token):
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        })
        self._boards_cache = None

    def verify_auth(self):
        """Verify authentication by fetching user account info."""
        resp = self.session.get(f"{BASE_URL}/user_account")
        resp.raise_for_status()
        return resp.json()

    def list_boards(self):
        """List all boards for the authenticated user. Handles pagination."""
        if self._boards_cache is not None:
            return self._boards_cache

        boards = []
        bookmark = None
        while True:
            params = {"page_size": 25}
            if bookmark:
                params["bookmark"] = bookmark
            resp = self.session.get(f"{BASE_URL}/boards", params=params)
            resp.raise_for_status()
            data = resp.json()
            boards.extend(data.get("items", []))
            bookmark = data.get("bookmark")
            if not bookmark:
                break

        self._boards_cache = boards
        return boards

    def find_board_id(self, board_name):
        """Find a board ID by name (case-insensitive partial match)."""
        boards = self.list_boards()
        name_lower = board_name.lower()
        # Try exact match first
        for board in boards:
            if board["name"].lower() == name_lower:
                return board["id"]
        # Try partial match
        for board in boards:
            if name_lower in board["name"].lower() or board["name"].lower() in name_lower:
                return board["id"]
        return None

    def create_pin(self, board_id, title, description, link, image_url, alt_text=""):
        """Create a pin on the specified board.

        Args:
            board_id: Pinterest board ID
            title: Pin title (max 100 chars)
            description: Pin description (max 800 chars)
            link: URL the pin links to
            image_url: Public URL of the pin image
            alt_text: Accessibility text (max 500 chars)

        Returns:
            Created pin data dict
        """
        payload = {
            "board_id": board_id,
            "title": title[:100],
            "description": description[:800],
            "link": link[:2048],
            "media_source": {
                "source_type": "image_url",
                "url": image_url,
            },
        }
        if alt_text:
            payload["alt_text"] = alt_text[:500]

        resp = self.session.post(f"{BASE_URL}/pins", json=payload)
        resp.raise_for_status()

        # Rate limiting courtesy
        time.sleep(2)

        return resp.json()
