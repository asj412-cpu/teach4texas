"""Generate product covers (PDF first page) and TPT thumbnails (1000x1000).

Uses Pillow for thumbnails, HTML/CSS for full cover pages.
AI-generated clipart is composited onto thumbnails when available.
"""
import os
import numpy as np
from PIL import Image, ImageDraw

from .brand import (
    NAVY, BURNT, GREEN, GOLD, WHITE, LIGHT_GRAY,
    OUTPUT_DIR, get_font, draw_wrapped_text, ensure_output_dir
)
from .html_renderer import load_css, build_html, html_to_pdf
from .xai_image import XAIImageGenerator, IMAGES_DIR
from .prompts import get_thumbnail_prompt

# Product catalog for cover generation
PRODUCTS = [
    # Task Cards
    {"slug": "task-cards-math-grade3", "title": "STAAR Math\nTask Cards", "subtitle": "32 TEKS-Aligned Practice Questions", "grade": "Grade 3", "badge": "STAAR 2.0 Ready", "subject": "math", "type": "Task Cards",
     "features": ["STAAR 2.0 format practice", "Visual aids & diagrams", "Answer key included", "Recording sheet"]},
    {"slug": "task-cards-math-grade4", "title": "STAAR Math\nTask Cards", "subtitle": "32 TEKS-Aligned Practice Questions", "grade": "Grade 4", "badge": "STAAR 2.0 Ready", "subject": "math", "type": "Task Cards",
     "features": ["STAAR 2.0 format practice", "Visual aids & diagrams", "Answer key included", "Recording sheet"]},
    {"slug": "task-cards-math-grade5", "title": "STAAR Math\nTask Cards", "subtitle": "32 TEKS-Aligned Practice Questions", "grade": "Grade 5", "badge": "STAAR 2.0 Ready", "subject": "math", "type": "Task Cards",
     "features": ["STAAR 2.0 format practice", "Visual aids & diagrams", "Answer key included", "Recording sheet"]},
    {"slug": "task-cards-rla-grade3", "title": "STAAR RLA\nTask Cards", "subtitle": "32 TEKS-Aligned Practice Questions", "grade": "Grade 3", "badge": "STAAR 2.0 Ready", "subject": "rla", "type": "Task Cards",
     "features": ["STAAR 2.0 format practice", "Graphic organizers", "Answer key included", "Recording sheet"]},
    {"slug": "task-cards-rla-grade4", "title": "STAAR RLA\nTask Cards", "subtitle": "32 TEKS-Aligned Practice Questions", "grade": "Grade 4", "badge": "STAAR 2.0 Ready", "subject": "rla", "type": "Task Cards",
     "features": ["STAAR 2.0 format practice", "Graphic organizers", "Answer key included", "Recording sheet"]},
    {"slug": "task-cards-rla-grade5", "title": "STAAR RLA\nTask Cards", "subtitle": "32 TEKS-Aligned Practice Questions", "grade": "Grade 5", "badge": "STAAR 2.0 Ready", "subject": "rla", "type": "Task Cards",
     "features": ["STAAR 2.0 format practice", "Graphic organizers", "Answer key included", "Recording sheet"]},
    {"slug": "task-cards-science-grade5", "title": "STAAR Science\nTask Cards", "subtitle": "32 TEKS-Aligned Practice Questions", "grade": "Grade 5", "badge": "STAAR 2.0 Ready", "subject": "science", "type": "Task Cards",
     "features": ["STAAR 2.0 format practice", "Science diagrams", "Answer key included", "Recording sheet"]},
    {"slug": "task-cards-science-grade8", "title": "STAAR Science\nTask Cards", "subtitle": "32 TEKS-Aligned Practice Questions", "grade": "Grade 8", "badge": "STAAR 2.0 Ready", "subject": "science", "type": "Task Cards",
     "features": ["STAAR 2.0 format practice", "Science diagrams", "Answer key included", "Recording sheet"]},

    # Daily Reviews
    {"slug": "daily-review-math-grade3", "title": "4-A-Day\nMath Review", "subtitle": "8 Weeks of Spiraling TEKS Practice", "grade": "Grade 3", "badge": "Daily Review", "subject": "math", "type": "4-A-Day",
     "features": ["160 STAAR-aligned questions", "Spiraling TEKS coverage", "Visual aids included", "Answer key"]},
    {"slug": "daily-review-math-grade4", "title": "4-A-Day\nMath Review", "subtitle": "8 Weeks of Spiraling TEKS Practice", "grade": "Grade 4", "badge": "Daily Review", "subject": "math", "type": "4-A-Day",
     "features": ["160 STAAR-aligned questions", "Spiraling TEKS coverage", "Visual aids included", "Answer key"]},
    {"slug": "daily-review-math-grade5", "title": "4-A-Day\nMath Review", "subtitle": "8 Weeks of Spiraling TEKS Practice", "grade": "Grade 5", "badge": "Daily Review", "subject": "math", "type": "4-A-Day",
     "features": ["160 STAAR-aligned questions", "Spiraling TEKS coverage", "Visual aids included", "Answer key"]},
    {"slug": "daily-review-rla-grade3", "title": "4-A-Day\nRLA Review", "subtitle": "8 Weeks of Spiraling TEKS Practice", "grade": "Grade 3", "badge": "Daily Review", "subject": "rla", "type": "4-A-Day",
     "features": ["160 STAAR-aligned questions", "Spiraling TEKS coverage", "Graphic organizers", "Answer key"]},
    {"slug": "daily-review-rla-grade4", "title": "4-A-Day\nRLA Review", "subtitle": "8 Weeks of Spiraling TEKS Practice", "grade": "Grade 4", "badge": "Daily Review", "subject": "rla", "type": "4-A-Day",
     "features": ["160 STAAR-aligned questions", "Spiraling TEKS coverage", "Graphic organizers", "Answer key"]},
    {"slug": "daily-review-rla-grade5", "title": "4-A-Day\nRLA Review", "subtitle": "8 Weeks of Spiraling TEKS Practice", "grade": "Grade 5", "badge": "Daily Review", "subject": "rla", "type": "4-A-Day",
     "features": ["160 STAAR-aligned questions", "Spiraling TEKS coverage", "Graphic organizers", "Answer key"]},
]

SUBJECT_ACCENT = {
    "math": BURNT,
    "rla": GREEN,
    "science": GOLD,
}

SUBJECT_HEX_MAP = {
    "math": "#BF5700",
    "rla": "#548235",
    "science": "#BF8700",
}


def _draw_star(draw, cx, cy, outer_r, inner_r, fill, points=5):
    """Draw a 5-pointed star centered at (cx, cy)."""
    import math as m
    coords = []
    for i in range(points * 2):
        angle = m.pi / 2 + i * m.pi / points
        r = outer_r if i % 2 == 0 else inner_r
        coords.append((cx + r * m.cos(angle), cy - r * m.sin(angle)))
    draw.polygon(coords, fill=fill)


def _remove_white_bg(img, threshold=240):
    """Remove white/near-white background from an RGBA image."""
    arr = np.array(img)
    # Pixels where R, G, B are all above threshold → transparent
    white_mask = (arr[:, :, 0] > threshold) & \
                 (arr[:, :, 1] > threshold) & \
                 (arr[:, :, 2] > threshold)
    arr[white_mask, 3] = 0
    return Image.fromarray(arr)


def _load_clipart(product, ai_gen=None):
    """Load or generate AI clipart for a product thumbnail.

    Returns a PIL Image (RGBA) with white background removed, or None on failure.
    """
    if ai_gen is None:
        return None

    slug = product["slug"]
    clipart_path = os.path.join(IMAGES_DIR, "thumbnails", f"{slug}-clipart.png")

    # Generate if not cached
    if not os.path.exists(clipart_path):
        prompt = get_thumbnail_prompt(product["subject"], product["type"])
        result = ai_gen.generate_and_save(prompt, clipart_path, model="standard")
        if not result:
            return None

    try:
        clipart = Image.open(clipart_path).convert("RGBA")
        clipart = _remove_white_bg(clipart)
        return clipart
    except Exception as e:
        print(f"  [warn] Could not load clipart: {e}")
        return None


def generate_thumbnail(product, output_dir=None, ai_gen=None):
    """Generate a 1000x1000 TPT listing thumbnail.

    Args:
        product: Dict with slug, title, subtitle, grade, badge, subject, features
        output_dir: Output directory (defaults to OUTPUT_DIR/thumbnails)
        ai_gen: Optional XAIImageGenerator instance for clipart
    """
    if output_dir is None:
        output_dir = os.path.join(OUTPUT_DIR, "thumbnails")
    os.makedirs(output_dir, exist_ok=True)

    W, H = 1000, 1000
    accent = SUBJECT_ACCENT.get(product["subject"], BURNT)

    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    # Background gradient (simulated with rectangles)
    navy_h = int(H * 0.55)
    draw.rectangle([0, 0, W, navy_h], fill=NAVY)
    draw.rectangle([0, navy_h, W, H], fill=accent)

    # Top accent bar
    draw.rectangle([0, 0, W, 8], fill=accent)

    # Badge
    badge_font = get_font(18, bold=True)
    badge_text = product["badge"]
    badge_w = badge_font.getlength(badge_text) + 40
    badge_x = 50
    draw.rounded_rectangle(
        [badge_x, 50, badge_x + badge_w, 90],
        radius=18, fill=accent)
    draw.text((badge_x + 20, 56), badge_text, font=badge_font, fill=WHITE)

    # Decorative line
    draw.rectangle([50, 108, 110, 112], fill=accent)

    # Title
    title_font = get_font(52, bold=True)
    title_lines = product["title"].split("\n")
    y = 130
    for line in title_lines:
        draw.text((50, y), line, font=title_font, fill=WHITE)
        bbox = title_font.getbbox(line)
        y += bbox[3] - bbox[1] + 8

    # Subtitle
    sub_font = get_font(24)
    draw.text((50, y + 10), product["subtitle"], font=sub_font,
              fill=(255, 255, 255, 220))

    # Grade ribbon
    ribbon_font = get_font(22, bold=True)
    ribbon_text = product["grade"]
    ribbon_w = ribbon_font.getlength(ribbon_text) + 60
    draw.rectangle([W - ribbon_w, 180, W, 224], fill=accent)
    draw.rectangle([W - ribbon_w, 180, W - ribbon_w + 4, 224],
                   fill=(255, 255, 255, 80))
    draw.text((W - ribbon_w + 30, 188), ribbon_text,
              font=ribbon_font, fill=WHITE)

    # --- AI Clipart compositing ---
    # Place clipart in the right side of the navy section (empty space)
    clipart = _load_clipart(product, ai_gen)
    if clipart:
        # Target area: right half of navy zone, below grade ribbon
        clip_max_w = 380
        clip_max_h = 280
        # Scale clipart to fit target area while preserving aspect ratio
        cw, ch = clipart.size
        scale = min(clip_max_w / cw, clip_max_h / ch)
        new_w = int(cw * scale)
        new_h = int(ch * scale)
        clipart_resized = clipart.resize((new_w, new_h), Image.LANCZOS)
        # Position: right-center of navy section
        clip_x = W - new_w - 60
        clip_y = 240 + (clip_max_h - new_h) // 2
        # Composite with alpha
        img.paste(clipart_resized, (clip_x, clip_y), clipart_resized)
        # Redraw over composited area if needed
        draw = ImageDraw.Draw(img)
    else:
        # Fallback: original star decoration (top right)
        _draw_star(draw, W - 100, 80, 80, 32, (255, 255, 255, 15))

    # Features (in accent section)
    feat_font = get_font(20)
    fy = navy_h + 30
    for feat in product.get("features", [])[:4]:
        _draw_star(draw, 68, fy + 10, 10, 4, WHITE)
        draw.text((90, fy), feat, font=feat_font, fill=WHITE)
        fy += 38

    # Bottom brand bar
    draw.rectangle([0, H - 70, W, H], fill=(0, 0, 0, 50))
    brand_font = get_font(28, bold=True)
    draw.text((50, H - 55), "Teach4", font=brand_font, fill=WHITE)
    t4_w = brand_font.getlength("Teach4")
    draw.text((50 + t4_w, H - 55), "Texas", font=brand_font, fill=accent)

    # Star in bottom right
    _draw_star(draw, W - 45, H - 38, 22, 9, accent)

    output_path = os.path.join(output_dir, f"{product['slug']}-thumbnail.png")
    img.save(output_path, quality=95)
    print(f"  Thumbnail: {output_path}")
    return output_path


def generate_all_thumbnails(use_ai=True):
    """Generate thumbnails for all products.

    Args:
        use_ai: If True, generate and composite AI clipart (requires XAI_API_KEY)
    """
    ensure_output_dir()

    ai_gen = None
    if use_ai:
        try:
            ai_gen = XAIImageGenerator()
            print("AI image generation enabled")
        except ValueError:
            print("XAI_API_KEY not configured — generating plain thumbnails")

    generated = []
    for product in PRODUCTS:
        path = generate_thumbnail(product, ai_gen=ai_gen)
        generated.append(path)

    if ai_gen:
        ai_gen.print_summary()

    print(f"\nGenerated {len(generated)} thumbnail(s)")
    return generated


if __name__ == "__main__":
    generate_all_thumbnails()
