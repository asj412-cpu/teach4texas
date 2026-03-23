"""Generate a branded profile picture for Teach4Texas (600x600px)."""
from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = "/Users/andrewjohnson/Claude/teach4texas/site/public/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

NAVY = (27, 54, 93)
BURNT = (191, 87, 0)
WHITE = (255, 255, 255)
LIGHT_BLUE = (230, 240, 250)

FONT_PATHS = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNSDisplay.ttf",
    "/System/Library/Fonts/SFNS.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/HelveticaNeue.ttc",
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

img = Image.new('RGB', (600, 600), NAVY)
draw = ImageDraw.Draw(img)

# Outer border ring
draw.rounded_rectangle([8, 8, 592, 592], radius=40, outline=BURNT, width=6)

# Inner subtle border
draw.rounded_rectangle([20, 20, 580, 580], radius=34, outline=(40, 70, 110), width=2)

# Large "T4T" monogram
mono_font = get_font(180, bold=True)
mono_text = "T4T"
mono_width = mono_font.getlength(mono_text)
mono_bbox = mono_font.getbbox(mono_text)
mono_height = mono_bbox[3] - mono_bbox[1]
mono_x = (600 - mono_width) / 2
mono_y = 120
draw.text((mono_x, mono_y), mono_text, font=mono_font, fill=WHITE)

# Burnt orange underline beneath monogram
line_width = 160
line_x = (600 - line_width) / 2
draw.rectangle([line_x, mono_y + mono_height + 30, line_x + line_width, mono_y + mono_height + 36], fill=BURNT)

# "TEACH4TEXAS" text below
brand_font = get_font(42, bold=True)
brand_text = "TEACH4TEXAS"
brand_width = brand_font.getlength(brand_text)
brand_x = (600 - brand_width) / 2
draw.text((brand_x, 400), brand_text, font=brand_font, fill=LIGHT_BLUE)

# Tagline
tag_font = get_font(24)
tag_text = "Texas Teacher Resources"
tag_width = tag_font.getlength(tag_text)
tag_x = (600 - tag_width) / 2
draw.text((tag_x, 465), tag_text, font=tag_font, fill=(160, 185, 210))

# Small decorative diamonds
for cx in [230, 300, 370]:
    cy = 530
    s = 5
    draw.polygon([(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)], fill=BURNT)

img.save(os.path.join(OUTPUT_DIR, "tpt-profile.png"), quality=95)
print("Created: tpt-profile.png (600x600)")
