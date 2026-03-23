#!/bin/bash
# Build PDFs from HTML covers + generate Grok thumbnails for new TPT batch
# Usage: ./build-new-batch.sh

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BATCH_DIR="$SCRIPT_DIR/new-batch"

echo "=== Building New Batch Cover PDFs ==="

for dir in "$BATCH_DIR"/*/; do
  cover="$dir/cover.html"
  if [ -f "$cover" ]; then
    pdf="${cover%.html}.pdf"
    name=$(basename "$dir")
    echo "  Converting: $name/cover.html"
    "$CHROME" --headless --disable-gpu --no-sandbox \
      --print-to-pdf="$pdf" --print-to-pdf-no-header \
      "file://$cover" 2>/dev/null
    if [ -f "$pdf" ]; then
      size=$(ls -lh "$pdf" | awk '{print $5}')
      echo "    ✅ $size"
    else
      echo "    ❌ FAILED"
    fi
  fi
done

echo ""
echo "=== Generating Grok Thumbnail Images ==="
python3 "$SCRIPT_DIR/generate-thumbnails.py"

echo ""
echo "=== All Done ==="
echo "Products ready in: $BATCH_DIR"
echo ""
echo "Next steps:"
echo "  1. Review cover.pdf files (open in Preview)"
echo "  2. Review thumbnail.png files"
echo "  3. Pick the best cover for each product (HTML or Grok)"
echo "  4. Upload to TPT with listing.md content"
