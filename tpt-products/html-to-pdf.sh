#!/bin/bash
# Use Chrome headless to print HTML to PDF
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

convert_to_pdf() {
  local html="$1"
  local pdf="${html%.html}.pdf"
  echo "Converting: $(basename "$html") -> $(basename "$pdf")"
  "$CHROME" --headless --disable-gpu --no-sandbox --print-to-pdf="$pdf" --print-to-pdf-no-header "file://$html" 2>/dev/null
  if [ -f "$pdf" ]; then
    size=$(ls -lh "$pdf" | awk '{print $5}')
    echo "  ✅ $size"
  else
    echo "  ❌ FAILED"
  fi
}

echo "=== SEASONAL ==="
for f in /Users/andrewjohnson/.openclaw/workspace/projects/teacher-niche/tpt-products/seasonal/*/*.html; do
  convert_to_pdf "$f"
done

echo ""
echo "=== GRAMMAR ESCAPE ROOMS ==="
for f in /Users/andrewjohnson/.openclaw/workspace/projects/teacher-niche/tpt-products/grammar-escape-rooms/escape-room-*/*.html; do
  convert_to_pdf "$f"
done

echo ""
echo "=== STAAR BOOTCAMP ==="
for f in /Users/andrewjohnson/.openclaw/workspace/projects/teach4texas/staar-bootcamp/*/*/*.html; do
  convert_to_pdf "$f"
done

echo ""
echo "=== ALL DONE ==="
