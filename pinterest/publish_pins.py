"""Publish Teach4Texas blog post pins to Pinterest.

Usage:
    python3 publish_pins.py                  # Publish all unpublished posts
    python3 publish_pins.py --dry-run        # Show what would be published
    python3 publish_pins.py --post <slug>    # Publish a specific post
    python3 publish_pins.py --list-boards    # List Pinterest boards and IDs
    python3 publish_pins.py --status         # Show publish status of all posts
    python3 publish_pins.py --auth           # Run one-time OAuth flow
"""
import json
import os
import sys
import argparse
from datetime import datetime

# Add parent dir so we can import generate_pins
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from generate_pins import get_all_posts, tags_to_badge

from pinterest_auth import get_valid_access_token
from pinterest_client import PinterestClient

SITE_URL = "https://teach4texas.com"
STATE_FILE = os.path.join(os.path.dirname(__file__), "pinterest_state.json")

# Tag-to-board mapping (most specific first, posts can go to multiple boards)
TAG_BOARD_MAP = [
    ({"staar", "math"},      ["STAAR Math Resources", "STAAR Test Prep Activities"]),
    ({"staar", "rla"},       ["STAAR RLA & Writing", "STAAR Test Prep Activities"]),
    ({"staar", "writing"},   ["STAAR RLA & Writing", "STAAR Test Prep Activities"]),
    ({"staar", "science"},   ["STAAR Science Activities", "STAAR Test Prep Activities"]),
    ({"staar", "test prep"}, ["STAAR Test Prep Activities"]),
    ({"staar", "tia"},       ["TIA Designation & Teacher Pay", "STAAR Test Prep Activities"]),
    ({"tia", "portfolio"},   ["TIA Designation & Teacher Pay"]),
    ({"t-tess"},             ["T-TESS Tips & Observation Prep", "TIA Designation & Teacher Pay"]),
    ({"tia"},                ["TIA Designation & Teacher Pay"]),
    ({"staar"},              ["STAAR Test Prep Activities"]),
]
DEFAULT_BOARDS = ["Free Teacher Resources & Printables"]

# Hashtag sets by tag
TAG_HASHTAGS = {
    "staar":     ["#STAARprep", "#STAARtest"],
    "tia":       ["#TIA", "#TeacherIncentiveAllotment", "#teacherpay"],
    "t-tess":    ["#TTESS", "#teacherobservation"],
    "math":      ["#STAARmath", "#mathactivities"],
    "rla":       ["#STAARRLA", "#readingactivities"],
    "science":   ["#STAARscience", "#sciencelabs"],
    "writing":   ["#constructedresponse", "#writing"],
    "portfolio": ["#TIAportfolio", "#evidence"],
    "test prep": ["#testprep", "#reviewgames"],
}
COMMON_HASHTAGS = ["#TexasTeacher", "#teach4texas", "#Texaseducation"]


def tags_to_boards(tags):
    """Map blog tags to Pinterest board names."""
    tags_lower = {t.lower() for t in tags}
    sorted_map = sorted(TAG_BOARD_MAP, key=lambda x: len(x[0]), reverse=True)
    for required_tags, boards in sorted_map:
        if required_tags.issubset(tags_lower):
            return boards
    return DEFAULT_BOARDS


def build_hashtags(tags, max_count=15):
    """Build hashtag string from post tags."""
    hashtags = set()
    for tag in tags:
        tag_lower = tag.lower()
        if tag_lower in TAG_HASHTAGS:
            hashtags.update(TAG_HASHTAGS[tag_lower])
    hashtags.update(COMMON_HASHTAGS)
    return " ".join(list(hashtags)[:max_count])


def build_pin_description(description, tags):
    """Combine description + hashtags, respecting 800 char limit."""
    hashtags = build_hashtags(tags)
    full = f"{description}\n\n{hashtags}"
    if len(full) <= 800:
        return full
    # Truncate description to fit
    max_desc = 800 - len(hashtags) - 4  # 4 for \n\n padding
    truncated = description[:max_desc].rsplit(' ', 1)[0] + "..."
    return f"{truncated}\n\n{hashtags}"


def build_pin_title(title):
    """Truncate title to Pinterest's 100 char limit."""
    if len(title) <= 100:
        return title
    return title[:97].rsplit(' ', 1)[0] + "..."


def load_state():
    """Load publish state from JSON file."""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"published_pins": {}, "last_run": None}


def save_state(state):
    """Save publish state to JSON file."""
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


def publish_all(client, dry_run=False, specific_slug=None):
    """Publish pins for unpublished blog posts."""
    posts = get_all_posts()
    state = load_state()

    if specific_slug:
        posts = [p for p in posts if p["slug"] == specific_slug]
        if not posts:
            print(f"No blog post found with slug: {specific_slug}")
            return

    unpublished = [p for p in posts if p["slug"] not in state["published_pins"]]

    if not unpublished:
        print("All posts have been pinned already.")
        return

    print(f"{'[DRY RUN] ' if dry_run else ''}{len(unpublished)} post(s) to pin:\n")

    for post in unpublished:
        boards = tags_to_boards(post["tags"])
        title = build_pin_title(post["title"])
        description = build_pin_description(post["description"], post["tags"])
        image_url = f"{SITE_URL}/images/pins/{post['pin_filename']}"
        link_url = f"{SITE_URL}/blog/{post['slug']}"

        # Verify pin image exists locally
        if not os.path.exists(post["pin_path"]):
            print(f"  WARNING: Pin image missing for {post['slug']}, skipping")
            print(f"    Run: python3 generate_pins.py")
            continue

        print(f"  {post['slug']}")
        print(f"    Title: {title}")
        print(f"    Boards: {', '.join(boards)}")
        print(f"    Image: {image_url}")
        print(f"    Link: {link_url}")

        if dry_run:
            print()
            continue

        pin_ids = {}
        for board_name in boards:
            board_id = client.find_board_id(board_name)
            if not board_id:
                print(f"    Board not found: {board_name}, skipping")
                continue

            try:
                result = client.create_pin(
                    board_id=board_id,
                    title=title,
                    description=description,
                    link=link_url,
                    image_url=image_url,
                    alt_text=post["title"],
                )
                pin_id = result.get("id", "unknown")
                pin_ids[board_name] = pin_id
                print(f"    Pinned to {board_name} (pin_id: {pin_id})")
            except Exception as e:
                print(f"    ERROR pinning to {board_name}: {e}")

        if pin_ids:
            state["published_pins"][post["slug"]] = {
                "pin_ids": pin_ids,
                "published_at": datetime.now().isoformat(),
                "image_url": image_url,
                "link_url": link_url,
            }
            save_state(state)
        print()

    state["last_run"] = datetime.now().isoformat()
    save_state(state)
    print("Done!")


def show_status():
    """Show which posts have been pinned."""
    posts = get_all_posts()
    state = load_state()

    print(f"{'Slug':<45} {'Status':<12} {'Boards'}")
    print("-" * 80)
    for post in posts:
        if post["slug"] in state["published_pins"]:
            info = state["published_pins"][post["slug"]]
            boards = ", ".join(info.get("pin_ids", {}).keys())
            print(f"{post['slug']:<45} {'PINNED':<12} {boards}")
        else:
            boards = ", ".join(tags_to_boards(post["tags"]))
            print(f"{post['slug']:<45} {'PENDING':<12} → {boards}")

    last_run = state.get("last_run")
    if last_run:
        print(f"\nLast run: {last_run}")


def main():
    parser = argparse.ArgumentParser(description="Publish Teach4Texas pins to Pinterest")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be published")
    parser.add_argument("--post", type=str, help="Publish a specific post by slug")
    parser.add_argument("--list-boards", action="store_true", help="List Pinterest boards")
    parser.add_argument("--status", action="store_true", help="Show publish status")
    parser.add_argument("--auth", action="store_true", help="Run one-time OAuth flow")
    args = parser.parse_args()

    if args.auth:
        from pinterest_auth import run_auth_flow
        run_auth_flow()
        return

    if args.status:
        show_status()
        return

    access_token = get_valid_access_token()
    client = PinterestClient(access_token)

    if args.list_boards:
        user = client.verify_auth()
        print(f"Authenticated as: {user.get('username', 'unknown')}\n")
        boards = client.list_boards()
        print(f"{'Board ID':<25} {'Name'}")
        print("-" * 60)
        for b in boards:
            print(f"{b['id']:<25} {b['name']}")
        return

    publish_all(client, dry_run=args.dry_run, specific_slug=args.post)


if __name__ == "__main__":
    main()
