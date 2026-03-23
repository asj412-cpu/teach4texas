#!/usr/bin/env python3
"""Master build script for all Teach4Texas visual TPT products.

Usage:
    python3 -m generators.build_all          # Build everything
    python3 -m generators.build_all tasks     # Task cards only
    python3 -m generators.build_all daily     # Daily reviews only
    python3 -m generators.build_all covers    # Covers/thumbnails only
    python3 -m generators.build_all pptx      # PowerPoint only
"""
import sys
import os
import time

# Ensure we can import from parent
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from generators.brand import ensure_output_dir
from generators.task_card_generator import generate_all_task_cards
from generators.daily_review_generator import generate_all_daily_reviews
from generators.cover_generator import generate_all_thumbnails
from generators.pptx_generator import generate_all_pptx


def build_all(targets=None):
    """Build all or specified product types."""
    ensure_output_dir()
    start = time.time()

    if targets is None:
        targets = ["tasks", "daily", "covers", "pptx"]

    results = {}

    if "tasks" in targets:
        print("=" * 60)
        print("TASK CARDS")
        print("=" * 60)
        results["tasks"] = generate_all_task_cards()

    if "daily" in targets:
        print("\n" + "=" * 60)
        print("DAILY REVIEWS (4-A-Day)")
        print("=" * 60)
        results["daily"] = generate_all_daily_reviews()

    if "covers" in targets:
        print("\n" + "=" * 60)
        print("COVERS & THUMBNAILS")
        print("=" * 60)
        results["covers"] = generate_all_thumbnails()

    if "pptx" in targets:
        print("\n" + "=" * 60)
        print("POWERPOINT FILES")
        print("=" * 60)
        results["pptx"] = generate_all_pptx()

    elapsed = time.time() - start
    total = sum(len(v) for v in results.values() if v)

    print("\n" + "=" * 60)
    print(f"BUILD COMPLETE: {total} files in {elapsed:.1f}s")
    print("=" * 60)

    return results


if __name__ == "__main__":
    targets = sys.argv[1:] if len(sys.argv) > 1 else None
    build_all(targets)
