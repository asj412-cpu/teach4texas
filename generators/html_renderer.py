"""HTML template assembly and Chrome headless PDF rendering."""
import os
import subprocess
import tempfile

from .brand import TEMPLATES_DIR, OUTPUT_DIR, ensure_output_dir

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def load_css(filename):
    """Load a CSS file from the templates directory."""
    path = os.path.join(TEMPLATES_DIR, filename)
    with open(path) as f:
        return f.read()


def build_html(body_html, css_content, title="Teach4Texas"):
    """Assemble a full HTML document with embedded CSS."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>
{css_content}
</style>
</head>
<body>
{body_html}
</body>
</html>"""


def html_to_pdf(html_content, output_path):
    """Convert HTML string to PDF using Chrome headless.

    Args:
        html_content: Full HTML document string
        output_path: Absolute path for the output PDF
    """
    ensure_output_dir()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with tempfile.NamedTemporaryFile(suffix=".html", mode="w", delete=False) as f:
        f.write(html_content)
        tmp_html = f.name

    try:
        result = subprocess.run(
            [
                CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                f"--print-to-pdf={output_path}",
                "--print-to-pdf-no-header",
                f"file://{tmp_html}",
            ],
            capture_output=True, text=True, timeout=30,
        )
        if os.path.exists(output_path):
            size = os.path.getsize(output_path)
            print(f"  PDF: {output_path} ({size:,} bytes)")
        else:
            print(f"  FAILED: {output_path}")
            if result.stderr:
                print(f"  Error: {result.stderr[:200]}")
    finally:
        os.unlink(tmp_html)


def embed_image(img):
    """Convert a PIL Image to a base64 data URI for embedding in HTML."""
    from .visual_aids import image_to_base64
    return image_to_base64(img)
