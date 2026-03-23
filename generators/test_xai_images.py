#!/usr/bin/env python3
"""Test xAI image generation with sample prompts.

Generates 6 sample images across different categories to verify
quality before integrating into the cover generator.

Usage:
    python3 -m generators.test_xai_images
"""
import os
import sys

# Ensure we can import from parent
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from generators.xai_image import XAIImageGenerator, IMAGES_DIR
from generators.prompts import TEST_PROMPTS


def run_test():
    """Generate test images and print results."""
    test_dir = os.path.join(IMAGES_DIR, "test")
    os.makedirs(test_dir, exist_ok=True)

    print("=" * 60)
    print("xAI Image Generation Test")
    print("=" * 60)

    gen = XAIImageGenerator()

    results = []
    for name, prompt in TEST_PROMPTS.items():
        print(f"\n[{name}]")
        print(f"  Prompt: {prompt[:80]}...")
        output_path = os.path.join(test_dir, f"{name}.png")
        path = gen.generate_and_save(prompt, output_path, model="standard")
        if path:
            size_kb = os.path.getsize(path) / 1024
            results.append((name, size_kb))
            print(f"  Size: {size_kb:.0f} KB")
        else:
            results.append((name, 0))

    gen.print_summary()

    print(f"\nTest images saved to: {test_dir}")
    print(f"\nResults:")
    for name, size in results:
        status = f"{size:.0f} KB" if size > 0 else "FAILED"
        print(f"  {name:20s} {status}")


if __name__ == "__main__":
    run_test()
