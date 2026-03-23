"""Generate TPT store banner for Teach4Texas (1200x320px)."""
from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = "/Users/andrewjohnson/Claude/teach4texas/site/public/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Brand colors
NAVY = (27, 54, 93)       # #1B365D
BURNT = (191, 87, 0)      # #BF5700
WHITE = (255, 255, 255)
LIGHT_BLUE = (230, 240, 250)
CREAM = (250, 247, 240)

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

img = Image.new('RGB', (1200, 320), NAVY)
draw = ImageDraw.Draw(img)

# Top accent stripe
draw.rectangle([0, 0, 1200, 6], fill=BURNT)

# Bottom accent stripe
draw.rectangle([0, 314, 1200, 320], fill=BURNT)

# Left decorative bar
draw.rectangle([0, 6, 8, 314], fill=BURNT)

# Star decorations (Texas theme) - simple diamond shapes
for i, y_pos in enumerate([80, 160, 240]):
    cx, cy = 60, y_pos
    size = 8
    draw.polygon([(cx, cy - size), (cx + size, cy), (cx, cy + size), (cx - size, cy)], fill=BURNT)

# Main title
title_font = get_font(72, bold=True)
title_text = "Teach4Texas"
title_width = title_font.getlength(title_text)
title_x = (1200 - title_width) / 2
draw.text((title_x, 55), title_text, font=title_font, fill=WHITE)

# Decorative line under title
line_width = 200
line_x = (1200 - line_width) / 2
draw.rectangle([line_x, 145, line_x + line_width, 149], fill=BURNT)

# Tagline
tagline_font = get_font(28)
tagline = "Texas Teacher Resources  |  STAAR Prep  |  TIA Designation  |  Classroom Tools"
tagline_width = tagline_font.getlength(tagline)
tagline_x = (1200 - tagline_width) / 2
draw.text((tagline_x, 170), tagline, font=tagline_font, fill=LIGHT_BLUE)

# Subtitle
sub_font = get_font(22)
sub_text = "Built by Texas educators, for Texas educators."
sub_width = sub_font.getlength(sub_text)
sub_x = (1200 - sub_width) / 2
draw.text((sub_x, 225), sub_text, font=sub_font, fill=(180, 200, 220))

# Decorative dots at bottom
for i in range(7):
    dot_x = 510 + i * 30
    draw.ellipse([dot_x, 275, dot_x + 6, 281], fill=BURNT)

# Right decorative bar (mirror left)
draw.rectangle([1192, 6, 1200, 314], fill=BURNT)

# Right star decorations
for i, y_pos in enumerate([80, 160, 240]):
    cx, cy = 1140, y_pos
    size = 8
    draw.polygon([(cx, cy - size), (cx + size, cy), (cx, cy + size), (cx - size, cy)], fill=BURNT)

img.save(os.path.join(OUTPUT_DIR, "tpt-banner.png"), quality=95)
print("Created: tpt-banner.png (1200x320)")
