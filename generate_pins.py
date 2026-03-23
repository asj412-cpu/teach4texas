"""Generate branded Pinterest pin images for Teach4Texas.

Reads blog post frontmatter to auto-generate pin images.
Only creates pins for posts that don't already have one.

Usage:
    python3 generate_pins.py              # Generate missing pins only
    python3 generate_pins.py --all        # Regenerate all pins
"""
from PIL import Image, ImageDraw, ImageFont
import os
import sys
import glob
import textwrap
import yaml

BLOG_DIR = "/Users/andrewjohnson/Claude/teach4texas/site/src/content/blog"
OUTPUT_DIR = "/Users/andrewjohnson/Claude/teach4texas/site/public/images/pins"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Brand colors
NAVY = (27, 54, 93)       # #1B365D
BURNT = (191, 87, 0)      # #BF5700
WHITE = (255, 255, 255)
LIGHT_BLUE = (230, 240, 250)

# System fonts
FONT_PATHS = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNSDisplay.ttf",
    "/System/Library/Fonts/SFNS.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/HelveticaNeue.ttc",
]

# Tag-to-badge mapping (most specific first)
TAG_BADGE_MAP = [
    ({"staar", "math"},      "STAAR MATH"),
    ({"staar", "rla"},       "STAAR RLA"),
    ({"staar", "writing"},   "STAAR RLA"),
    ({"staar", "science"},   "STAAR SCIENCE"),
    ({"staar", "test prep"}, "STAAR PREP"),
    ({"tia", "portfolio"},   "TIA PORTFOLIO"),
    ({"staar", "tia"},       "STAAR + TIA"),
    ({"t-tess"},             "T-TESS"),
    ({"tia"},                "TIA GUIDE"),
    ({"staar"},              "STAAR PREP"),
]

# Standalone pins not tied to blog posts
STANDALONE_PINS = [
    {
        "filename": "pin-free-resources.jpg",
        "title": "Free STAAR Prep & TIA Resources for Texas Teachers",
        "subtitle": "Templates, trackers, and tools — no cost, no catch. Built by Texas educators.",
        "badge": "FREE RESOURCES",
    },
]


def get_font(size, bold=False):
    for path in FONT_PATHS:
        if os.path.exists(path):
            try:
                if path.endswith('.ttc'):
                    idx = 1 if bold else 0
                    return ImageFont.truetype(path, size, index=idx)
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_wrapped_text(draw, text, x, y, max_width, font, fill, line_spacing=1.3):
    """Draw text wrapped to fit within max_width, return total height used."""
    avg_char_width = font.getlength("A")
    chars_per_line = max(1, int(max_width / avg_char_width))
    lines = textwrap.wrap(text, width=chars_per_line)

    total_height = 0
    for line in lines:
        bbox = font.getbbox(line)
        line_height = bbox[3] - bbox[1]
        line_width = font.getlength(line)
        line_x = x + (max_width - line_width) / 2
        draw.text((line_x, y + total_height), line, font=font, fill=fill)
        total_height += int(line_height * line_spacing)

    return total_height


def create_pin(filename, title, subtitle, tag, accent_color=BURNT):
    """Create a Pinterest pin image (1000x1500px)."""
    img = Image.new('RGB', (1000, 1500), WHITE)
    draw = ImageDraw.Draw(img)

    # Top accent bar
    draw.rectangle([0, 0, 1000, 12], fill=accent_color)

    # Navy header block
    draw.rectangle([0, 12, 1000, 420], fill=NAVY)

    # Tag/category badge
    tag_font = get_font(28, bold=True)
    tag_width = tag_font.getlength(tag) + 40
    tag_x = (1000 - tag_width) / 2
    draw.rounded_rectangle([tag_x, 80, tag_x + tag_width, 125], radius=20, fill=accent_color)
    tag_text_x = tag_x + 20
    draw.text((tag_text_x, 85), tag, font=tag_font, fill=WHITE)

    # Brand name in header
    brand_font = get_font(32, bold=True)
    brand_text = "TEACH4TEXAS"
    brand_width = brand_font.getlength(brand_text)
    draw.text(((1000 - brand_width) / 2, 350), brand_text, font=brand_font, fill=LIGHT_BLUE)

    # Title (main text area)
    title_font = get_font(64, bold=True)
    title_y = 480
    title_height = draw_wrapped_text(draw, title, 60, title_y, 880, title_font, NAVY)

    # Subtitle
    subtitle_font = get_font(36)
    subtitle_y = title_y + title_height + 40
    draw_wrapped_text(draw, subtitle, 60, subtitle_y, 880, subtitle_font, (100, 100, 100))

    # Bottom accent bar
    draw.rectangle([0, 1400, 1000, 1412], fill=accent_color)

    # Bottom CTA
    cta_font = get_font(30, bold=True)
    cta_text = "teach4texas.com"
    cta_width = cta_font.getlength(cta_text)
    draw.text(((1000 - cta_width) / 2, 1430), cta_text, font=cta_font, fill=NAVY)

    # Decorative dots
    for i in range(5):
        dot_x = 400 + i * 50
        draw.ellipse([dot_x, 1380, dot_x + 8, 1388], fill=accent_color)

    img.save(os.path.join(OUTPUT_DIR, filename), quality=95)
    print(f"  Created: {filename}")


def parse_frontmatter(md_path):
    """Extract YAML frontmatter from a markdown file."""
    with open(md_path, 'r') as f:
        content = f.read()

    if not content.startswith('---'):
        return None

    end = content.index('---', 3)
    fm_text = content[3:end]
    return yaml.safe_load(fm_text)


def tags_to_badge(tags):
    """Map blog tags to a pin badge label."""
    tags_lower = {t.lower() for t in tags}
    # Sort by specificity (most tags first)
    sorted_map = sorted(TAG_BADGE_MAP, key=lambda x: len(x[0]), reverse=True)
    for required_tags, badge in sorted_map:
        if required_tags.issubset(tags_lower):
            return badge
    return "TEXAS TEACHER"


def make_subtitle(description, max_chars=120):
    """Truncate description to fit pin subtitle area."""
    if len(description) <= max_chars:
        return description
    truncated = description[:max_chars].rsplit(' ', 1)[0]
    return truncated + "..."


def get_all_posts():
    """Read all blog posts and return metadata with slug info."""
    posts = []
    for md_path in sorted(glob.glob(os.path.join(BLOG_DIR, "*.md"))):
        fm = parse_frontmatter(md_path)
        if not fm:
            continue
        slug = os.path.basename(md_path).replace('.md', '')
        posts.append({
            "slug": slug,
            "title": fm.get("title", ""),
            "description": fm.get("description", ""),
            "tags": fm.get("tags", []),
            "keywords": fm.get("keywords", []),
            "pin_filename": f"pin-{slug}.jpg",
            "pin_path": os.path.join(OUTPUT_DIR, f"pin-{slug}.jpg"),
        })
    return posts


def get_missing_pins(posts):
    """Filter to posts that don't have a pin image yet."""
    return [p for p in posts if not os.path.exists(p["pin_path"])]


def main():
    regenerate_all = "--all" in sys.argv

    posts = get_all_posts()
    print(f"Found {len(posts)} blog posts")

    if regenerate_all:
        to_generate = posts
        print("Regenerating ALL pin images...")
    else:
        to_generate = get_missing_pins(posts)
        if not to_generate:
            print("All blog post pins are up to date.")
        else:
            print(f"Generating {len(to_generate)} missing pin(s)...")

    for post in to_generate:
        badge = tags_to_badge(post["tags"])
        subtitle = make_subtitle(post["description"])
        create_pin(post["pin_filename"], post["title"], subtitle, badge)

    # Generate standalone pins if missing (or if --all)
    for pin in STANDALONE_PINS:
        pin_path = os.path.join(OUTPUT_DIR, pin["filename"])
        if regenerate_all or not os.path.exists(pin_path):
            create_pin(pin["filename"], pin["title"], pin["subtitle"], pin["badge"])

    total = len(to_generate) + sum(
        1 for p in STANDALONE_PINS
        if regenerate_all or not os.path.exists(os.path.join(OUTPUT_DIR, p["filename"]))
    )
    if total > 0:
        print(f"\nDone! {total} pin image(s) saved to {OUTPUT_DIR}")
    else:
        print("Nothing to generate.")


if __name__ == "__main__":
    main()
