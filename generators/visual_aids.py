"""Pillow-based visual aid generators for math, science, and RLA diagrams.

All generators render at 2x resolution then downsample for anti-aliasing.
Each returns a PIL Image (call image_to_base64() to embed in HTML).
"""
import base64
import io
import math
from PIL import Image, ImageDraw, ImageFont

from .brand import get_font, NAVY, BURNT, GREEN, WHITE, DARK_TEXT, LIGHT_GRAY

# Render scale for anti-aliasing
SCALE = 2


def _downscale(img):
    """Downsample 2x image for crisp anti-aliased output."""
    w, h = img.size
    return img.resize((w // SCALE, h // SCALE), Image.LANCZOS)


def image_to_base64(img, fmt="PNG"):
    """Convert PIL Image to base64 data URI string."""
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/{fmt.lower()};base64,{b64}"


# ---------------------------------------------------------------------------
# 1. Number Line
# ---------------------------------------------------------------------------
def draw_number_line(start, end, marks=None, highlight=None,
                     width=500, height=100):
    """Draw a number line from start to end with labeled marks.

    Args:
        start: Left bound
        end: Right bound
        marks: List of values to label (default: integer steps)
        highlight: Optional value or (value, label) to highlight in burnt orange
    """
    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(11 * SCALE)

    pad = 40 * SCALE
    line_y = H // 2
    x0, x1 = pad, W - pad

    # Main line
    draw.line([(x0, line_y), (x1, line_y)], fill=NAVY, width=2 * SCALE)
    # Arrows
    arrow = 8 * SCALE
    draw.polygon([(x0, line_y), (x0 + arrow, line_y - arrow // 2),
                   (x0 + arrow, line_y + arrow // 2)], fill=NAVY)
    draw.polygon([(x1, line_y), (x1 - arrow, line_y - arrow // 2),
                   (x1 - arrow, line_y + arrow // 2)], fill=NAVY)

    if marks is None:
        step = 1
        marks = list(range(int(start), int(end) + 1, step))

    span = end - start
    tick_h = 10 * SCALE

    for val in marks:
        if span == 0:
            continue
        x = x0 + (val - start) / span * (x1 - x0)
        color = NAVY
        if highlight is not None:
            hval = highlight[0] if isinstance(highlight, (tuple, list)) else highlight
            if abs(val - hval) < 1e-9:
                color = BURNT
        draw.line([(x, line_y - tick_h), (x, line_y + tick_h)],
                  fill=color, width=2 * SCALE)
        label = str(val) if val == int(val) else f"{val:.1f}"
        bbox = font.getbbox(label)
        tw = bbox[2] - bbox[0]
        draw.text((x - tw / 2, line_y + tick_h + 4 * SCALE),
                  label, font=font, fill=color)

    # Highlight dot
    if highlight is not None:
        hval = highlight[0] if isinstance(highlight, (tuple, list)) else highlight
        hx = x0 + (hval - start) / span * (x1 - x0)
        r = 6 * SCALE
        draw.ellipse([hx - r, line_y - r, hx + r, line_y + r], fill=BURNT)
        if isinstance(highlight, (tuple, list)) and len(highlight) > 1:
            lbl = str(highlight[1])
            bbox = font.getbbox(lbl)
            tw = bbox[2] - bbox[0]
            draw.text((hx - tw / 2, line_y - r - 18 * SCALE),
                      lbl, font=font, fill=BURNT)

    return _downscale(img)


# ---------------------------------------------------------------------------
# 2. Fraction Bar
# ---------------------------------------------------------------------------
def draw_fraction_bar(numerator, denominator, shaded=None,
                      width=400, height=80):
    """Draw a fraction bar model divided into equal parts.

    Args:
        numerator: Number of shaded parts (or use shaded for custom list)
        denominator: Total parts
        shaded: Optional list of 0-indexed parts to shade
    """
    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(11 * SCALE)

    pad = 20 * SCALE
    bar_h = 40 * SCALE
    bar_y = (H - bar_h) // 2
    bar_w = W - 2 * pad
    part_w = bar_w / denominator

    if shaded is None:
        shaded = list(range(numerator))

    for i in range(denominator):
        x0 = pad + i * part_w
        x1 = x0 + part_w
        fill = BURNT if i in shaded else (240, 240, 240)
        draw.rectangle([x0, bar_y, x1, bar_y + bar_h], fill=fill,
                       outline=NAVY, width=2 * SCALE)

    # Label
    label = f"{numerator}/{denominator}"
    bbox = font.getbbox(label)
    tw = bbox[2] - bbox[0]
    draw.text((W / 2 - tw / 2, bar_y + bar_h + 6 * SCALE),
              label, font=font, fill=NAVY)

    return _downscale(img)


# ---------------------------------------------------------------------------
# 3. Area Model
# ---------------------------------------------------------------------------
def draw_area_model(rows, cols, shaded=None, labels=None,
                    width=400, height=300):
    """Draw a rectangular area model (grid).

    Args:
        rows: Number of rows
        cols: Number of columns
        shaded: Number of cells to shade (left-to-right, top-to-bottom)
                or list of (row, col) tuples
        labels: Optional dict with 'top' and 'left' labels
    """
    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(11 * SCALE)

    pad_left = 50 * SCALE if labels and "left" in labels else 20 * SCALE
    pad_top = 30 * SCALE if labels and "top" in labels else 20 * SCALE
    pad_right = 20 * SCALE
    pad_bottom = 20 * SCALE

    grid_w = W - pad_left - pad_right
    grid_h = H - pad_top - pad_bottom
    cell_w = grid_w / cols
    cell_h = grid_h / rows

    # Determine shaded cells
    shaded_set = set()
    if isinstance(shaded, int):
        for i in range(shaded):
            r, c = divmod(i, cols)
            if r < rows:
                shaded_set.add((r, c))
    elif isinstance(shaded, list):
        shaded_set = set(shaded)

    for r in range(rows):
        for c in range(cols):
            x0 = pad_left + c * cell_w
            y0 = pad_top + r * cell_h
            fill = BURNT if (r, c) in shaded_set else (245, 245, 245)
            draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h],
                           fill=fill, outline=NAVY, width=2 * SCALE)

    # Labels
    if labels:
        if "top" in labels:
            lbl = str(labels["top"])
            bbox = font.getbbox(lbl)
            tw = bbox[2] - bbox[0]
            draw.text((pad_left + grid_w / 2 - tw / 2, 4 * SCALE),
                      lbl, font=font, fill=NAVY)
        if "left" in labels:
            lbl = str(labels["left"])
            bbox = font.getbbox(lbl)
            th = bbox[3] - bbox[1]
            draw.text((4 * SCALE, pad_top + grid_h / 2 - th / 2),
                      lbl, font=font, fill=NAVY)

    return _downscale(img)


# ---------------------------------------------------------------------------
# 4. Coordinate Grid
# ---------------------------------------------------------------------------
def draw_coordinate_grid(points=None, x_range=(-5, 5), y_range=(-5, 5),
                         width=400, height=400):
    """Draw a coordinate plane with optional plotted points.

    Args:
        points: List of (x, y) or (x, y, label) tuples
        x_range: (min, max) for x-axis
        y_range: (min, max) for y-axis
    """
    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(10 * SCALE)

    pad = 40 * SCALE
    gx0, gx1 = pad, W - pad
    gy0, gy1 = pad, H - pad

    def to_pixel(vx, vy):
        px = gx0 + (vx - x_range[0]) / (x_range[1] - x_range[0]) * (gx1 - gx0)
        py = gy1 - (vy - y_range[0]) / (y_range[1] - y_range[0]) * (gy1 - gy0)
        return px, py

    # Grid lines
    grid_color = (220, 220, 220)
    for x in range(int(x_range[0]), int(x_range[1]) + 1):
        px, _ = to_pixel(x, 0)
        draw.line([(px, gy0), (px, gy1)], fill=grid_color, width=1 * SCALE)
    for y in range(int(y_range[0]), int(y_range[1]) + 1):
        _, py = to_pixel(0, y)
        draw.line([(gx0, py), (gx1, py)], fill=grid_color, width=1 * SCALE)

    # Axes
    ox, oy = to_pixel(0, 0)
    draw.line([(gx0, oy), (gx1, oy)], fill=NAVY, width=2 * SCALE)
    draw.line([(ox, gy0), (ox, gy1)], fill=NAVY, width=2 * SCALE)

    # Tick labels
    for x in range(int(x_range[0]), int(x_range[1]) + 1):
        if x == 0:
            continue
        px, _ = to_pixel(x, 0)
        lbl = str(x)
        bbox = font.getbbox(lbl)
        tw = bbox[2] - bbox[0]
        draw.text((px - tw / 2, oy + 4 * SCALE), lbl, font=font, fill=DARK_TEXT)
    for y in range(int(y_range[0]), int(y_range[1]) + 1):
        if y == 0:
            continue
        _, py = to_pixel(0, y)
        lbl = str(y)
        bbox = font.getbbox(lbl)
        tw = bbox[2] - bbox[0]
        draw.text((ox - tw - 6 * SCALE, py - 8 * SCALE), lbl, font=font, fill=DARK_TEXT)

    # Plot points
    if points:
        r = 6 * SCALE
        for pt in points:
            vx, vy = pt[0], pt[1]
            px, py = to_pixel(vx, vy)
            draw.ellipse([px - r, py - r, px + r, py + r], fill=BURNT)
            if len(pt) > 2:
                lbl = str(pt[2])
                draw.text((px + r + 2 * SCALE, py - 8 * SCALE),
                          lbl, font=font, fill=BURNT)

    return _downscale(img)


# ---------------------------------------------------------------------------
# 5. Bar Graph
# ---------------------------------------------------------------------------
def draw_bar_graph(data, labels, title="", width=500, height=300):
    """Draw a simple bar graph.

    Args:
        data: List of numeric values
        labels: List of category labels
        title: Optional chart title
    """
    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(10 * SCALE)
    title_font = get_font(12 * SCALE, bold=True)

    pad_left = 50 * SCALE
    pad_right = 20 * SCALE
    pad_top = 40 * SCALE if title else 20 * SCALE
    pad_bottom = 40 * SCALE

    # Title
    if title:
        bbox = title_font.getbbox(title)
        tw = bbox[2] - bbox[0]
        draw.text((W / 2 - tw / 2, 8 * SCALE), title, font=title_font, fill=NAVY)

    chart_w = W - pad_left - pad_right
    chart_h = H - pad_top - pad_bottom
    max_val = max(data) if data else 1

    # Y-axis
    draw.line([(pad_left, pad_top), (pad_left, pad_top + chart_h)],
              fill=NAVY, width=2 * SCALE)
    # X-axis
    draw.line([(pad_left, pad_top + chart_h), (pad_left + chart_w, pad_top + chart_h)],
              fill=NAVY, width=2 * SCALE)

    n = len(data)
    bar_gap = chart_w / n
    bar_w = bar_gap * 0.65

    colors = [BURNT, GREEN, NAVY, (191, 135, 0), (100, 150, 200)]

    for i, (val, lbl) in enumerate(zip(data, labels)):
        bar_h = (val / max_val) * chart_h if max_val > 0 else 0
        x0 = pad_left + i * bar_gap + (bar_gap - bar_w) / 2
        y0 = pad_top + chart_h - bar_h
        color = colors[i % len(colors)]
        draw.rectangle([x0, y0, x0 + bar_w, pad_top + chart_h],
                       fill=color, outline=NAVY, width=1 * SCALE)

        # Value label
        vlbl = str(val)
        bbox = font.getbbox(vlbl)
        tw = bbox[2] - bbox[0]
        draw.text((x0 + bar_w / 2 - tw / 2, y0 - 16 * SCALE),
                  vlbl, font=font, fill=DARK_TEXT)

        # Category label
        bbox = font.getbbox(lbl)
        tw = bbox[2] - bbox[0]
        draw.text((x0 + bar_w / 2 - tw / 2, pad_top + chart_h + 6 * SCALE),
                  lbl, font=font, fill=DARK_TEXT)

    # Y-axis labels
    for i in range(5):
        val = int(max_val * i / 4)
        y = pad_top + chart_h - (i / 4) * chart_h
        lbl = str(val)
        bbox = font.getbbox(lbl)
        tw = bbox[2] - bbox[0]
        draw.text((pad_left - tw - 6 * SCALE, y - 6 * SCALE),
                  lbl, font=font, fill=DARK_TEXT)
        if i > 0:
            draw.line([(pad_left, y), (pad_left + chart_w, y)],
                      fill=(230, 230, 230), width=1 * SCALE)

    return _downscale(img)


# ---------------------------------------------------------------------------
# 6. Data Table
# ---------------------------------------------------------------------------
def draw_data_table(headers, rows, width=500, height=None):
    """Draw a simple data table as an image.

    Args:
        headers: List of column header strings
        rows: List of lists of cell values
    """
    row_h = 30
    if height is None:
        height = (len(rows) + 1) * row_h + 20

    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(10 * SCALE)
    bold_font = get_font(10 * SCALE, bold=True)

    pad = 10 * SCALE
    cell_h = row_h * SCALE
    n_cols = len(headers)
    col_w = (W - 2 * pad) / n_cols
    y = pad

    # Header row
    draw.rectangle([pad, y, W - pad, y + cell_h], fill=NAVY)
    for i, hdr in enumerate(headers):
        x = pad + i * col_w
        draw.rectangle([x, y, x + col_w, y + cell_h], outline=WHITE, width=1 * SCALE)
        bbox = bold_font.getbbox(hdr)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((x + col_w / 2 - tw / 2, y + cell_h / 2 - th / 2),
                  hdr, font=bold_font, fill=WHITE)

    # Data rows
    for ri, row in enumerate(rows):
        y = pad + (ri + 1) * cell_h
        bg = (242, 249, 255) if ri % 2 == 0 else WHITE
        draw.rectangle([pad, y, W - pad, y + cell_h], fill=bg)
        for ci, cell in enumerate(row):
            x = pad + ci * col_w
            draw.rectangle([x, y, x + col_w, y + cell_h],
                           outline=(189, 195, 199), width=1 * SCALE)
            txt = str(cell)
            bbox = font.getbbox(txt)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text((x + col_w / 2 - tw / 2, y + cell_h / 2 - th / 2),
                      txt, font=font, fill=DARK_TEXT)

    return _downscale(img)


# ---------------------------------------------------------------------------
# 7. Geometric Shape
# ---------------------------------------------------------------------------
def draw_geometric_shape(shape_type, measurements=None,
                         width=300, height=300):
    """Draw a geometric shape with optional measurements.

    Args:
        shape_type: "rectangle", "triangle", "circle", "square",
                    "pentagon", "hexagon", "parallelogram", "trapezoid"
        measurements: Dict of side labels, e.g. {"width": "8 cm", "height": "5 cm"}
    """
    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(11 * SCALE)

    cx, cy = W // 2, H // 2
    pad = 50 * SCALE

    if shape_type in ("rectangle", "square"):
        sw = (W - 2 * pad)
        sh = sw if shape_type == "square" else int(sw * 0.6)
        x0 = cx - sw // 2
        y0 = cy - sh // 2
        draw.rectangle([x0, y0, x0 + sw, y0 + sh],
                       outline=NAVY, width=3 * SCALE)
        # Dashed fill pattern
        for i in range(y0 + 8 * SCALE, y0 + sh, 12 * SCALE):
            draw.line([(x0 + 4 * SCALE, i), (x0 + sw - 4 * SCALE, i)],
                      fill=(230, 230, 230), width=1 * SCALE)
        if measurements:
            if "width" in measurements:
                lbl = measurements["width"]
                bbox = font.getbbox(lbl)
                tw = bbox[2] - bbox[0]
                draw.text((cx - tw / 2, y0 + sh + 8 * SCALE),
                          lbl, font=font, fill=BURNT)
            if "height" in measurements:
                lbl = measurements["height"]
                bbox = font.getbbox(lbl)
                tw = bbox[2] - bbox[0]
                draw.text((x0 - tw - 10 * SCALE, cy - 8 * SCALE),
                          lbl, font=font, fill=BURNT)

    elif shape_type == "triangle":
        r = min(W, H) // 2 - pad
        pts = [
            (cx, cy - r),
            (cx - int(r * 0.9), cy + int(r * 0.7)),
            (cx + int(r * 0.9), cy + int(r * 0.7)),
        ]
        draw.polygon(pts, outline=NAVY, fill=None)
        draw.line([pts[0], pts[1]], fill=NAVY, width=3 * SCALE)
        draw.line([pts[1], pts[2]], fill=NAVY, width=3 * SCALE)
        draw.line([pts[2], pts[0]], fill=NAVY, width=3 * SCALE)
        if measurements:
            if "base" in measurements:
                lbl = measurements["base"]
                bbox = font.getbbox(lbl)
                tw = bbox[2] - bbox[0]
                mid_x = (pts[1][0] + pts[2][0]) / 2
                draw.text((mid_x - tw / 2, pts[1][1] + 8 * SCALE),
                          lbl, font=font, fill=BURNT)
            if "height" in measurements:
                lbl = measurements["height"]
                # Draw dashed height line
                draw.line([(cx, pts[0][1]), (cx, pts[1][1])],
                          fill=(180, 180, 180), width=1 * SCALE)
                bbox = font.getbbox(lbl)
                tw = bbox[2] - bbox[0]
                draw.text((cx + 8 * SCALE, cy - 8 * SCALE),
                          lbl, font=font, fill=BURNT)

    elif shape_type == "circle":
        r = min(W, H) // 2 - pad
        draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                     outline=NAVY, width=3 * SCALE)
        if measurements and "radius" in measurements:
            draw.line([(cx, cy), (cx + r, cy)], fill=BURNT, width=2 * SCALE)
            lbl = measurements["radius"]
            bbox = font.getbbox(lbl)
            tw = bbox[2] - bbox[0]
            draw.text((cx + r // 2 - tw // 2, cy - 20 * SCALE),
                      lbl, font=font, fill=BURNT)

    elif shape_type == "trapezoid":
        top_w = (W - 2 * pad) * 0.5
        bot_w = W - 2 * pad
        h = H - 2 * pad
        pts = [
            (cx - top_w / 2, pad),
            (cx + top_w / 2, pad),
            (cx + bot_w / 2, pad + h),
            (cx - bot_w / 2, pad + h),
        ]
        for i in range(4):
            draw.line([pts[i], pts[(i + 1) % 4]], fill=NAVY, width=3 * SCALE)
        if measurements:
            if "top" in measurements:
                lbl = measurements["top"]
                bbox = font.getbbox(lbl)
                tw = bbox[2] - bbox[0]
                draw.text((cx - tw / 2, pad - 20 * SCALE),
                          lbl, font=font, fill=BURNT)
            if "bottom" in measurements:
                lbl = measurements["bottom"]
                bbox = font.getbbox(lbl)
                tw = bbox[2] - bbox[0]
                draw.text((cx - tw / 2, pad + h + 6 * SCALE),
                          lbl, font=font, fill=BURNT)

    else:
        # Generic regular polygon
        sides = {"pentagon": 5, "hexagon": 6}.get(shape_type, 6)
        r = min(W, H) // 2 - pad
        pts = []
        for i in range(sides):
            angle = 2 * math.pi * i / sides - math.pi / 2
            pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
        for i in range(sides):
            draw.line([pts[i], pts[(i + 1) % sides]], fill=NAVY, width=3 * SCALE)

    return _downscale(img)


# ---------------------------------------------------------------------------
# 8. Graphic Organizer
# ---------------------------------------------------------------------------
def draw_graphic_organizer(org_type, content=None, width=500, height=400):
    """Draw a graphic organizer (Venn diagram, T-chart, web, flow chart).

    Args:
        org_type: "venn", "t_chart", "web", "flow"
        content: Dict with labels. E.g.:
            venn: {"left": "A", "right": "B", "center": "Both"}
            t_chart: {"left_title": "A", "right_title": "B",
                      "left_items": [...], "right_items": [...]}
            web: {"center": "Main Idea", "branches": ["A", "B", "C"]}
            flow: {"steps": ["Step 1", "Step 2", "Step 3"]}
    """
    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(10 * SCALE)
    bold_font = get_font(11 * SCALE, bold=True)
    content = content or {}

    if org_type == "venn":
        r = int(min(W, H) * 0.35)
        offset = int(r * 0.55)
        cx_left = W // 2 - offset
        cx_right = W // 2 + offset
        cy = H // 2
        # Left circle
        draw.ellipse([cx_left - r, cy - r, cx_left + r, cy + r],
                     outline=NAVY, width=3 * SCALE)
        # Right circle
        draw.ellipse([cx_right - r, cy - r, cx_right + r, cy + r],
                     outline=BURNT, width=3 * SCALE)
        # Labels
        if "left" in content:
            lbl = content["left"]
            bbox = bold_font.getbbox(lbl)
            tw = bbox[2] - bbox[0]
            draw.text((cx_left - tw // 2, cy - 10 * SCALE),
                      lbl, font=bold_font, fill=NAVY)
        if "right" in content:
            lbl = content["right"]
            bbox = bold_font.getbbox(lbl)
            tw = bbox[2] - bbox[0]
            draw.text((cx_right - tw // 2, cy - 10 * SCALE),
                      lbl, font=bold_font, fill=BURNT)
        if "center" in content:
            lbl = content["center"]
            bbox = font.getbbox(lbl)
            tw = bbox[2] - bbox[0]
            draw.text((W // 2 - tw // 2, cy - 10 * SCALE),
                      lbl, font=font, fill=DARK_TEXT)

    elif org_type == "t_chart":
        pad = 30 * SCALE
        header_h = 40 * SCALE
        # Header bar
        draw.rectangle([pad, pad, W - pad, pad + header_h], fill=NAVY)
        # Divider
        mid_x = W // 2
        draw.line([(mid_x, pad), (mid_x, H - pad)], fill=NAVY, width=3 * SCALE)
        # Border
        draw.rectangle([pad, pad, W - pad, H - pad],
                       outline=NAVY, width=3 * SCALE)
        # Headers
        lt = content.get("left_title", "")
        rt = content.get("right_title", "")
        if lt:
            bbox = bold_font.getbbox(lt)
            tw = bbox[2] - bbox[0]
            draw.text(((pad + mid_x) / 2 - tw / 2, pad + 8 * SCALE),
                      lt, font=bold_font, fill=WHITE)
        if rt:
            bbox = bold_font.getbbox(rt)
            tw = bbox[2] - bbox[0]
            draw.text(((mid_x + W - pad) / 2 - tw / 2, pad + 8 * SCALE),
                      rt, font=bold_font, fill=WHITE)
        # Items
        left_items = content.get("left_items", [])
        right_items = content.get("right_items", [])
        item_y = pad + header_h + 15 * SCALE
        for item in left_items:
            draw.text((pad + 15 * SCALE, item_y),
                      f"• {item}", font=font, fill=DARK_TEXT)
            item_y += 22 * SCALE
        item_y = pad + header_h + 15 * SCALE
        for item in right_items:
            draw.text((mid_x + 15 * SCALE, item_y),
                      f"• {item}", font=font, fill=DARK_TEXT)
            item_y += 22 * SCALE

    elif org_type == "web":
        center_text = content.get("center", "Main Idea")
        branches = content.get("branches", ["A", "B", "C", "D"])
        # Center bubble
        cr = 50 * SCALE
        draw.ellipse([W // 2 - cr, H // 2 - cr, W // 2 + cr, H // 2 + cr],
                     fill=NAVY, outline=NAVY, width=3 * SCALE)
        bbox = bold_font.getbbox(center_text)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((W // 2 - tw // 2, H // 2 - th // 2),
                  center_text, font=bold_font, fill=WHITE)
        # Branch bubbles
        br = 35 * SCALE
        dist = 140 * SCALE
        for i, branch in enumerate(branches):
            angle = 2 * math.pi * i / len(branches) - math.pi / 2
            bx = W // 2 + dist * math.cos(angle)
            by = H // 2 + dist * math.sin(angle)
            # Line
            draw.line([(W // 2, H // 2), (bx, by)], fill=NAVY, width=2 * SCALE)
            draw.ellipse([bx - br, by - br, bx + br, by + br],
                         fill=WHITE, outline=BURNT, width=3 * SCALE)
            bbox = font.getbbox(branch)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text((bx - tw // 2, by - th // 2),
                      branch, font=font, fill=DARK_TEXT)

    elif org_type == "flow":
        steps = content.get("steps", ["Step 1", "Step 2", "Step 3"])
        n = len(steps)
        box_w = 120 * SCALE
        box_h = 40 * SCALE
        gap = 30 * SCALE
        total_w = n * box_w + (n - 1) * gap
        start_x = (W - total_w) / 2
        y = H // 2 - box_h // 2

        for i, step in enumerate(steps):
            x = start_x + i * (box_w + gap)
            draw.rounded_rectangle([x, y, x + box_w, y + box_h],
                                   radius=10 * SCALE, fill=NAVY,
                                   outline=NAVY, width=2 * SCALE)
            bbox = font.getbbox(step)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text((x + box_w / 2 - tw / 2, y + box_h / 2 - th / 2),
                      step, font=font, fill=WHITE)
            # Arrow
            if i < n - 1:
                ax = x + box_w
                draw.line([(ax + 4 * SCALE, H // 2),
                           (ax + gap - 4 * SCALE, H // 2)],
                          fill=BURNT, width=3 * SCALE)
                draw.polygon([
                    (ax + gap - 4 * SCALE, H // 2),
                    (ax + gap - 14 * SCALE, H // 2 - 8 * SCALE),
                    (ax + gap - 14 * SCALE, H // 2 + 8 * SCALE),
                ], fill=BURNT)

    return _downscale(img)


# ---------------------------------------------------------------------------
# 9. Food Web
# ---------------------------------------------------------------------------
def draw_food_web(organisms, connections, width=500, height=400):
    """Draw a food web diagram.

    Args:
        organisms: List of organism names
        connections: List of (prey_idx, predator_idx) pairs
    """
    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(10 * SCALE)
    bold_font = get_font(11 * SCALE, bold=True)

    n = len(organisms)
    positions = []
    # Arrange in a circle
    cx, cy = W // 2, H // 2
    r = min(W, H) // 2 - 70 * SCALE
    for i in range(n):
        angle = 2 * math.pi * i / n - math.pi / 2
        positions.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))

    # Draw connections (arrows)
    for prey_idx, pred_idx in connections:
        x1, y1 = positions[prey_idx]
        x2, y2 = positions[pred_idx]
        draw.line([(x1, y1), (x2, y2)], fill=(180, 180, 180), width=2 * SCALE)
        # Arrowhead
        dx, dy = x2 - x1, y2 - y1
        dist = math.sqrt(dx * dx + dy * dy)
        if dist > 0:
            ux, uy = dx / dist, dy / dist
            ar = 30 * SCALE
            ax, ay = x2 - ux * ar, y2 - uy * ar
            perp_x, perp_y = -uy * 8 * SCALE, ux * 8 * SCALE
            draw.polygon([
                (x2 - ux * 5 * SCALE, y2 - uy * 5 * SCALE),
                (ax + perp_x, ay + perp_y),
                (ax - perp_x, ay - perp_y),
            ], fill=BURNT)

    # Draw organism bubbles
    br = 28 * SCALE
    for i, org in enumerate(organisms):
        bx, by = positions[i]
        draw.ellipse([bx - br, by - br, bx + br, by + br],
                     fill=WHITE, outline=NAVY, width=3 * SCALE)
        bbox = font.getbbox(org)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((bx - tw // 2, by - th // 2), org, font=font, fill=DARK_TEXT)

    return _downscale(img)


# ---------------------------------------------------------------------------
# 10. Force Arrows
# ---------------------------------------------------------------------------
def draw_force_arrows(obj_label="Object", forces=None, width=400, height=400):
    """Draw a force diagram with labeled arrows.

    Args:
        obj_label: Label for the central object
        forces: List of dicts with 'direction' (up/down/left/right),
                'label', and optional 'magnitude'
    """
    W, H = width * SCALE, height * SCALE
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    font = get_font(10 * SCALE)
    bold_font = get_font(11 * SCALE, bold=True)

    cx, cy = W // 2, H // 2
    obj_r = 35 * SCALE

    # Object box
    draw.rounded_rectangle(
        [cx - obj_r, cy - obj_r, cx + obj_r, cy + obj_r],
        radius=8 * SCALE, fill=LIGHT_GRAY, outline=NAVY, width=3 * SCALE)
    bbox = bold_font.getbbox(obj_label)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2), obj_label, font=bold_font, fill=NAVY)

    if not forces:
        forces = [
            {"direction": "up", "label": "Normal"},
            {"direction": "down", "label": "Gravity"},
            {"direction": "right", "label": "Applied"},
            {"direction": "left", "label": "Friction"},
        ]

    arrow_len = 80 * SCALE
    arrow_w = 4 * SCALE
    head_size = 12 * SCALE

    direction_vectors = {
        "up": (0, -1), "down": (0, 1),
        "left": (-1, 0), "right": (1, 0),
    }
    colors = [BURNT, GREEN, NAVY, (191, 135, 0)]

    for i, force in enumerate(forces):
        d = force["direction"]
        dx, dy = direction_vectors.get(d, (0, -1))
        color = colors[i % len(colors)]
        mag = force.get("magnitude", 1.0)
        alen = arrow_len * mag

        sx = cx + dx * (obj_r + 5 * SCALE)
        sy = cy + dy * (obj_r + 5 * SCALE)
        ex = sx + dx * alen
        ey = sy + dy * alen

        # Arrow shaft
        draw.line([(sx, sy), (ex, ey)], fill=color, width=arrow_w)
        # Arrowhead
        draw.polygon([
            (ex, ey),
            (ex - dx * head_size - dy * head_size / 2,
             ey - dy * head_size + dx * head_size / 2),
            (ex - dx * head_size + dy * head_size / 2,
             ey - dy * head_size - dx * head_size / 2),
        ], fill=color)

        # Label
        lbl = force["label"]
        bbox = font.getbbox(lbl)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        label_offset = 10 * SCALE
        if d == "up":
            draw.text((ex - tw / 2, ey - th - label_offset),
                      lbl, font=font, fill=color)
        elif d == "down":
            draw.text((ex - tw / 2, ey + label_offset),
                      lbl, font=font, fill=color)
        elif d == "left":
            draw.text((ex - tw - label_offset, ey - th / 2),
                      lbl, font=font, fill=color)
        elif d == "right":
            draw.text((ex + label_offset, ey - th / 2),
                      lbl, font=font, fill=color)

    return _downscale(img)
