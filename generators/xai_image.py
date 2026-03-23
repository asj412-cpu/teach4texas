"""xAI Grok image generation API integration.

Wraps the xAI image generation endpoint for creating TPT-style
cartoon clipart illustrations for covers, thumbnails, and interiors.
"""
import os
import base64
import hashlib
import requests
from dotenv import load_dotenv

from .brand import OUTPUT_DIR

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

API_URL = "https://api.x.ai/v1/images/generations"
IMAGES_DIR = os.path.join(OUTPUT_DIR, "ai-images")

# Models and their per-image cost
MODELS = {
    "standard": "grok-imagine-image",
    "pro": "grok-imagine-image-pro",
}
COST_PER_IMAGE = {
    "standard": 0.02,
    "pro": 0.07,
}


class XAIImageGenerator:
    """Generate images using xAI's Grok image generation API."""

    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("XAI_API_KEY", "")
        if not self.api_key:
            raise ValueError("XAI_API_KEY not set in environment or .env file")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })
        self.total_cost = 0.0
        self.images_generated = 0

    def generate(self, prompt, n=1, model="standard", response_format="b64_json"):
        """Generate image(s) from a text prompt.

        Args:
            prompt: Text description of the image to generate
            n: Number of images to generate (1-4)
            model: "standard" or "pro"
            response_format: "b64_json" (default) or "url"

        Returns:
            List of dicts with 'b64_json' or 'url' keys
        """
        model_name = MODELS.get(model, model)
        payload = {
            "model": model_name,
            "prompt": prompt,
            "n": n,
            "response_format": response_format,
        }

        resp = self.session.post(API_URL, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()

        cost = COST_PER_IMAGE.get(model, 0.02) * n
        self.total_cost += cost
        self.images_generated += n

        return data.get("data", [])

    def generate_and_save(self, prompt, output_path, model="standard", skip_existing=True):
        """Generate an image and save it to disk.

        Args:
            prompt: Text description of the image
            output_path: Where to save the PNG file
            model: "standard" or "pro"
            skip_existing: If True, skip generation if file already exists

        Returns:
            Path to saved image, or None on failure
        """
        if skip_existing and os.path.exists(output_path):
            print(f"  [cached] {os.path.basename(output_path)}")
            return output_path

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        try:
            results = self.generate(prompt, n=1, model=model, response_format="b64_json")
            if not results:
                print(f"  [error] No image returned for: {output_path}")
                return None

            img_data = base64.b64decode(results[0]["b64_json"])
            with open(output_path, "wb") as f:
                f.write(img_data)

            print(f"  [saved] {os.path.basename(output_path)} (${COST_PER_IMAGE.get(model, 0.02):.2f})")
            return output_path

        except requests.exceptions.HTTPError as e:
            print(f"  [error] API error: {e}")
            return None
        except Exception as e:
            print(f"  [error] {e}")
            return None

    def prompt_to_filename(self, prompt, prefix=""):
        """Generate a stable filename from a prompt (for caching)."""
        h = hashlib.md5(prompt.encode()).hexdigest()[:10]
        safe = prefix or prompt[:30].replace(" ", "_").replace("/", "")
        return f"{safe}_{h}.png"

    def print_summary(self):
        """Print generation cost summary."""
        print(f"\n--- xAI Image Generation Summary ---")
        print(f"  Images generated: {self.images_generated}")
        print(f"  Estimated cost:   ${self.total_cost:.2f}")
