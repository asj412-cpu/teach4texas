#!/bin/bash
CSS="/Users/andrewjohnson/.openclaw/workspace/projects/teacher-niche/tpt-products/tpt-style.css"
SEASONAL="/Users/andrewjohnson/.openclaw/workspace/projects/teacher-niche/tpt-products/seasonal"
GRAMMAR="/Users/andrewjohnson/.openclaw/workspace/projects/teacher-niche/tpt-products/grammar-escape-rooms"
BOOTCAMP="/Users/andrewjohnson/.openclaw/workspace/projects/teach4texas/staar-bootcamp"

echo "=== SEASONAL PRODUCTS ==="
for dir in "$SEASONAL"/*/; do
  name=$(basename "$dir")
  if [ -f "$dir/content.md" ]; then
    echo "Converting: $name"
    pandoc "$dir/content.md" -o "$dir/${name}.html" --standalone --css="$CSS" --embed-resources --metadata title="$name"
    echo "  -> HTML done"
  fi
done

echo ""
echo "=== GRAMMAR ESCAPE ROOMS ==="
for dir in "$GRAMMAR"/escape-room-*/; do
  name=$(basename "$dir")
  if [ -f "$dir/${name}.md" ]; then
    echo "Converting: $name"
    # Combine all MDs for this room into one PDF
    files=""
    [ -f "$dir/${name}.md" ] && files="$dir/${name}.md"
    [ -f "$dir/teacher-guide-${name#escape-room-}.md" ] && files="$files $dir/teacher-guide-${name#escape-room-}.md"
    [ -f "$dir/answer-key-${name#escape-room-}.md" ] && files="$files $dir/answer-key-${name#escape-room-}.md"
    pandoc $files -o "$dir/${name}.html" --standalone --css="$CSS" --embed-resources --metadata title="Grammar Escape Room ${name#escape-room-}"
    echo "  -> HTML done"
  fi
done

echo ""
echo "=== STAAR BOOTCAMP ==="
for tier in standard premium; do
  for dir in "$BOOTCAMP/$tier"/*/; do
    name=$(basename "$dir")
    echo "Converting: $tier/$name"
    files=""
    for md in OVERVIEW LESSON-PLANS ACTIVITIES STUDENT-MATERIALS DECORATIONS PARENT-LETTER; do
      [ -f "$dir/$md.md" ] && files="$files $dir/$md.md"
    done
    if [ -n "$files" ]; then
      pandoc $files -o "$dir/${name}.html" --standalone --css="$CSS" --embed-resources --metadata title="STAAR Bootcamp: $name"
      echo "  -> HTML done"
    fi
  done
done

echo ""
echo "=== DONE ==="
