"""Shared brand constants, fonts, and utilities for Teach4Texas generators."""
from PIL import ImageFont
import os
import textwrap

# Brand colors (RGB)
NAVY = (27, 54, 93)         # #1B365D
BURNT = (191, 87, 0)        # #BF5700
GREEN = (84, 130, 53)       # #548235
GOLD = (191, 135, 0)        # #BF8700
WHITE = (255, 255, 255)
LIGHT_BLUE = (230, 240, 250)
LIGHT_GRAY = (248, 249, 250)  # #F8F9FA
DARK_TEXT = (45, 45, 45)     # #2D2D2D

# Hex versions for CSS/HTML
HEX = {
    "navy": "#1B365D",
    "burnt": "#BF5700",
    "green": "#548235",
    "gold": "#BF8700",
    "white": "#FFFFFF",
    "light_blue": "#E6F0FA",
    "light_gray": "#F8F9FA",
    "dark_text": "#2D2D2D",
}

# Subject accent colors
SUBJECT_COLORS = {
    "math": BURNT,
    "rla": GREEN,
    "science": GOLD,
}

SUBJECT_HEX = {
    "math": "#BF5700",
    "rla": "#548235",
    "science": "#BF8700",
}

# System font paths (macOS)
FONT_PATHS = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNSDisplay.ttf",
    "/System/Library/Fonts/SFNS.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/HelveticaNeue.ttc",
]

# Project paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GENERATORS_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(GENERATORS_DIR, "templates")
CONTENT_DIR = os.path.join(GENERATORS_DIR, "content")
OUTPUT_DIR = os.path.join(GENERATORS_DIR, "output")


def get_font(size, bold=False):
    """Load a system font at given size."""
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


def wrap_text(text, font, max_width):
    """Wrap text to fit within max_width pixels. Returns list of lines."""
    avg_char_width = font.getlength("A")
    chars_per_line = max(1, int(max_width / avg_char_width))
    return textwrap.wrap(text, width=chars_per_line)


def draw_wrapped_text(draw, text, x, y, max_width, font, fill,
                      line_spacing=1.3, align="center"):
    """Draw text wrapped to fit within max_width. Returns total height used."""
    lines = wrap_text(text, font, max_width)
    total_height = 0
    for line in lines:
        bbox = font.getbbox(line)
        line_height = bbox[3] - bbox[1]
        line_width = font.getlength(line)
        if align == "center":
            line_x = x + (max_width - line_width) / 2
        elif align == "right":
            line_x = x + max_width - line_width
        else:
            line_x = x
        draw.text((line_x, y + total_height), line, font=font, fill=fill)
        total_height += int(line_height * line_spacing)
    return total_height


def ensure_output_dir():
    """Create output directory if it doesn't exist."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
