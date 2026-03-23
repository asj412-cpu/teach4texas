#!/usr/bin/env python3
"""Generate colorful TPT thumbnail images using Grok Imagine API.

Usage:
    python3 generate-thumbnails.py                  # Generate all
    python3 generate-thumbnails.py figurative       # Generate one by keyword
    python3 generate-thumbnails.py --list           # Show all available products

Requires GROK_API_KEY environment variable (or reads from x-policy-project config).
Images saved to each product's directory as thumbnail.png
"""

import base64
import json
import os
import ssl
import sys
import urllib.error
import urllib.request

# Try to get API key from environment or x-policy-project config
GROK_API_KEY = os.environ.get("GROK_API_KEY", "")
if not GROK_API_KEY:
    config_path = os.path.expanduser("~/Claude/x-policy-project/scheduler/config.py")
    if os.path.exists(config_path):
        with open(config_path) as f:
            for line in f:
                if "GROK_API_KEY" in line and "xai-" in line:
                    # Extract the key from the default value
                    start = line.find('"xai-')
                    if start != -1:
                        end = line.find('"', start + 1)
                        GROK_API_KEY = line[start + 1:end]
                        break

GROK_IMAGE_URL = "https://api.x.ai/v1/images/generations"
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Product definitions with colorful, education-niche image prompts
PRODUCTS = [
    {
        "slug": "01-figurative-language-fun-pack",
        "name": "Figurative Language Fun Pack",
        "prompt": (
            "A bright, colorful, flat-design educational poster for elementary teachers. "
            "Center: a large open book with colorful word bubbles floating out — each bubble contains "
            "icons (a heart for metaphor, clouds for simile, a winking sun for personification, a lightning bolt for hyperbole). "
            "Background: cheerful pastel rainbow gradient (coral, peach, mint, lavender). "
            "Scattered around: pencils, stars, light bulbs, confetti. "
            "Bottom text area (blank white banner for title). "
            "Style: modern TPT/Teachers Pay Teachers product cover, clipart aesthetic, kawaii-inspired, "
            "vibrant saturated colors, clean vector look. NO realistic photos. NO text in the image."
        ),
    },
    {
        "slug": "02-staar-reading-passages",
        "name": "STAAR Reading Passages",
        "prompt": (
            "A vibrant, eye-catching educational product cover image for a reading comprehension resource. "
            "Center: a stack of colorful paper passages/worksheets fanned out, with a large magnifying glass hovering over them "
            "revealing highlighted text. Surrounding: floating question marks, checkmarks, pencils, and small book icons. "
            "Background: rich purple-to-blue gradient with subtle geometric shapes. "
            "A glowing star (Texas lone star) accent in the corner. "
            "Style: modern flat-design education clipart, Teachers Pay Teachers aesthetic, "
            "bright saturated colors (purple, blue, pink, gold), clean and professional. "
            "NO realistic photos. NO text in the image."
        ),
    },
    {
        "slug": "03-morning-work-elar-3rd",
        "name": "Morning Work ELAR Bell Ringers",
        "prompt": (
            "A warm, cheerful educational product cover image for a morning work bell ringer resource. "
            "Center: a cute cartoon sunrise over a desk with a pencil, notebook, and coffee mug. "
            "A large alarm clock showing 8:00 with rays of sunshine. "
            "Floating around: ABCs, grammar symbols (comma, period, question mark), vocabulary cards, "
            "a small open book, stars and sparkles. "
            "Background: warm sunrise gradient (peach, golden yellow, soft orange, sky blue). "
            "Style: adorable kawaii-inspired education clipart, TPT product cover aesthetic, "
            "bright warm colors, clean vector illustration. "
            "NO realistic photos. NO text in the image."
        ),
    },
    {
        "slug": "04-math-task-cards-bundle",
        "name": "Math Task Cards Bundle",
        "prompt": (
            "A bold, colorful educational product cover image for a math task cards bundle. "
            "Center: a fan of colorful task cards (blue, green, orange, purple) spread out like a hand of playing cards, "
            "each with a math symbol (+, ÷, fraction, angle). "
            "Surrounding: geometric shapes (triangles, circles, rectangles), pie charts, bar graphs, "
            "fraction circles, a protractor, and rulers. "
            "Background: ocean blue to teal gradient with polka dot pattern overlay. "
            "Gold star accents and sparkle effects. "
            "Style: modern flat-design education clipart, Teachers Pay Teachers cover aesthetic, "
            "vibrant blues, greens, yellows, and oranges. Clean vector look. "
            "NO realistic photos. NO text in the image."
        ),
    },
    {
        "slug": "05-writing-workshop-mini-lessons",
        "name": "Writing Workshop Mini-Lessons",
        "prompt": (
            "An elegant but playful educational product cover image for a writing workshop resource. "
            "Center: a large pencil writing on lined notebook paper, with colorful thought bubbles "
            "floating up containing tiny icons (a story book, a speech bubble, a lightbulb, a heart). "
            "Surrounding: crumpled paper balls, sticky notes, a red editing pen, gold stars, "
            "and a small stack of books. A notebook spiral binding along the left edge. "
            "Background: soft lavender to cream gradient with subtle ruled-line pattern. "
            "Style: charming education clipart, TPT product cover aesthetic, "
            "soft purples, pinks, greens, and golds. Warm and inviting. "
            "NO realistic photos. NO text in the image."
        ),
    },
]


def generate_thumbnail(product):
    """Generate a thumbnail image via Grok API and save it."""
    slug = product["slug"]
    name = product["name"]
    prompt = product["prompt"]
    output_dir = os.path.join(SCRIPT_DIR, "new-batch", slug)
    output_path = os.path.join(output_dir, "thumbnail.png")

    if not os.path.isdir(output_dir):
        print(f"  [SKIP] Directory not found: {output_dir}")
        return False

    print(f"\n  Generating: {name}")
    print(f"  Prompt: {prompt[:100]}...")

    body = json.dumps({
        "model": "grok-imagine-image",
        "prompt": prompt,
        "n": 1,
        "response_format": "url",
    }).encode()

    req = urllib.request.Request(GROK_IMAGE_URL, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {GROK_API_KEY}")
    req.add_header("User-Agent", "Teach4Texas/1.0")

    try:
        with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as resp:
            data = json.loads(resp.read().decode())
            image_url = data["data"][0]["url"]
            print(f"  Image URL received")
    except Exception as e:
        print(f"  [ERROR] Grok API: {e}")
        return False

    # Download image
    try:
        img_req = urllib.request.Request(image_url)
        img_req.add_header("User-Agent", "Teach4Texas/1.0")
        with urllib.request.urlopen(img_req, timeout=30, context=SSL_CTX) as resp:
            image_bytes = resp.read()

        with open(output_path, "wb") as f:
            f.write(image_bytes)

        size_kb = len(image_bytes) / 1024
        print(f"  Saved: {output_path} ({size_kb:.0f} KB)")
        return True
    except Exception as e:
        print(f"  [ERROR] Download: {e}")
        return False


def main():
    if not GROK_API_KEY:
        print("ERROR: No GROK_API_KEY found. Set it as an environment variable:")
        print("  export GROK_API_KEY='xai-...'")
        sys.exit(1)

    if "--list" in sys.argv:
        print("\nAvailable products:")
        for p in PRODUCTS:
            print(f"  {p['slug']} — {p['name']}")
        return

    # Filter by keyword if provided
    keyword = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else None
    targets = PRODUCTS
    if keyword:
        targets = [p for p in PRODUCTS if keyword.lower() in p["slug"].lower() or keyword.lower() in p["name"].lower()]
        if not targets:
            print(f"No products matching '{keyword}'. Use --list to see all.")
            return

    print(f"=== Generating {len(targets)} TPT Thumbnail(s) ===")
    success = 0
    for product in targets:
        if generate_thumbnail(product):
            success += 1

    print(f"\n=== Done: {success}/{len(targets)} thumbnails generated ===")


if __name__ == "__main__":
    main()
