"""Centralized prompt templates for xAI image generation.

All prompts produce bold-outlined cartoon clipart suitable for TPT product
covers and thumbnails. Each prompt includes a consistent style anchor.
"""

# Style anchor appended to every prompt for visual consistency
STYLE_ANCHOR = (
    "bold black outline, flat color cartoon clipart, bright saturated colors, "
    "white background, elementary school style, no shadow, clean simple shapes, "
    "no text, no letters, no words, no numbers"
)

# Subject-specific color hints (matching brand.py palette)
COLOR_HINTS = {
    "math": "use warm orange and navy blue accents",
    "rla": "use green and navy blue accents",
    "science": "use golden yellow and navy blue accents",
}


def _build(description, subject=None):
    """Build a full prompt with style anchor and optional color hints."""
    parts = [description]
    if subject and subject in COLOR_HINTS:
        parts.append(COLOR_HINTS[subject])
    parts.append(STYLE_ANCHOR)
    return ", ".join(parts)


# ---------------------------------------------------------------------------
# Subject icons — small clipart for decorating covers
# ---------------------------------------------------------------------------

SUBJECT_ICONS = {
    "math": _build(
        "a collection of cartoon math items: a calculator, ruler, pencil, "
        "protractor, and plus/minus/equals signs scattered playfully",
        "math"
    ),
    "rla": _build(
        "a collection of cartoon reading items: an open book, pencil, "
        "speech bubbles, ABC letter blocks, and a magnifying glass over text",
        "rla"
    ),
    "science": _build(
        "a collection of cartoon science items: a bubbling beaker, microscope, "
        "magnifying glass, atom symbol, and a small plant in a pot",
        "science"
    ),
}


# ---------------------------------------------------------------------------
# Cover characters — diverse kids studying/learning
# ---------------------------------------------------------------------------

COVER_CHARACTERS = {
    "math_kids": _build(
        "three diverse elementary school children happily solving math problems, "
        "one holding a pencil, one pointing at a whiteboard with numbers, "
        "one giving a thumbs up, cartoon style",
        "math"
    ),
    "rla_kids": _build(
        "three diverse elementary school children reading books and writing, "
        "one with an open storybook, one writing with a pencil, "
        "one raising a hand excitedly, cartoon style",
        "rla"
    ),
    "science_kids": _build(
        "three diverse elementary school children doing a science experiment, "
        "one holding a beaker, one looking through a magnifying glass, "
        "one taking notes on a clipboard, cartoon style",
        "science"
    ),
}


# ---------------------------------------------------------------------------
# Scene illustrations — classroom/Texas themed
# ---------------------------------------------------------------------------

SCENES = {
    "classroom": _build(
        "a bright cartoon elementary school classroom with a chalkboard, "
        "desk, apple on the desk, and star decorations on the wall"
    ),
    "texas_star": _build(
        "a large Texas lone star with a small cartoon armadillo and bluebonnet "
        "flowers, patriotic and educational theme"
    ),
}


# ---------------------------------------------------------------------------
# Product type illustrations
# ---------------------------------------------------------------------------

PRODUCT_TYPE_ICONS = {
    "task_cards": _build(
        "a neat stack of colorful flashcards or task cards fanned out, "
        "with a large gold star sticker on the top card"
    ),
    "daily_review": _build(
        "a cartoon daily planner or checklist with four colorful checkmarks, "
        "a pencil beside it, and a small clock showing morning time"
    ),
}


# ---------------------------------------------------------------------------
# Thumbnail clipart — subject + product type combinations
# These are the primary images composited onto TPT thumbnails.
# ---------------------------------------------------------------------------

def get_thumbnail_prompt(subject, product_type):
    """Get the best prompt for a thumbnail based on subject and product type.

    Args:
        subject: "math", "rla", or "science"
        product_type: "Task Cards" or "4-A-Day"

    Returns:
        Full prompt string with style anchor
    """
    prompts = {
        ("math", "Task Cards"): _build(
            "a cheerful cartoon child holding up a large flashcard with a star on it, "
            "surrounded by floating math symbols (plus, minus, equals, multiplication), "
            "a calculator and ruler nearby",
            "math"
        ),
        ("math", "4-A-Day"): _build(
            "a cartoon desk scene with four small worksheets laid out in a grid, "
            "a pencil, a calculator, and a happy star character giving a thumbs up, "
            "math symbols floating around",
            "math"
        ),
        ("rla", "Task Cards"): _build(
            "a cheerful cartoon child holding up a large flashcard with a star on it, "
            "surrounded by floating letters and an open book, "
            "a pencil and speech bubble nearby",
            "rla"
        ),
        ("rla", "4-A-Day"): _build(
            "a cartoon desk scene with four small worksheets laid out in a grid, "
            "a pencil, an open book, and a happy star character giving a thumbs up, "
            "letters and words floating around",
            "rla"
        ),
        ("science", "Task Cards"): _build(
            "a cheerful cartoon child holding up a large flashcard with a star on it, "
            "surrounded by a bubbling beaker, magnifying glass, and atom symbol, "
            "a microscope nearby",
            "science"
        ),
    }

    key = (subject, product_type)
    if key in prompts:
        return prompts[key]

    # Fallback: use subject icon
    return SUBJECT_ICONS.get(subject, SUBJECT_ICONS["math"])


# ---------------------------------------------------------------------------
# Test prompts — a curated set for visual QA
# ---------------------------------------------------------------------------

TEST_PROMPTS = {
    "math_icon": SUBJECT_ICONS["math"],
    "rla_icon": SUBJECT_ICONS["rla"],
    "science_icon": SUBJECT_ICONS["science"],
    "math_kids": COVER_CHARACTERS["math_kids"],
    "task_card_art": PRODUCT_TYPE_ICONS["task_cards"],
    "texas_star": SCENES["texas_star"],
}
