"""Generate STAAR Task Card PDFs from content JSON files.

Each product: cover page + card pages (2x3 grid) + answer key + recording sheet.
"""
import json
import os

from .brand import (
    OUTPUT_DIR, CONTENT_DIR, HEX, SUBJECT_HEX, ensure_output_dir
)
from .html_renderer import load_css, build_html, html_to_pdf, embed_image
from . import visual_aids


def _generate_visual(spec):
    """Generate a visual aid image from a spec dict. Returns base64 data URI."""
    vtype = spec["type"]
    params = spec.get("params", {})

    generators = {
        "number_line": visual_aids.draw_number_line,
        "fraction_bar": visual_aids.draw_fraction_bar,
        "area_model": visual_aids.draw_area_model,
        "coordinate_grid": visual_aids.draw_coordinate_grid,
        "bar_graph": visual_aids.draw_bar_graph,
        "data_table": visual_aids.draw_data_table,
        "geometric_shape": visual_aids.draw_geometric_shape,
        "graphic_organizer": visual_aids.draw_graphic_organizer,
        "food_web": visual_aids.draw_food_web,
        "force_arrows": visual_aids.draw_force_arrows,
    }

    gen = generators.get(vtype)
    if gen is None:
        return None

    img = gen(**params)
    return embed_image(img)


def _subject_css_class(subject):
    """Return CSS class modifier for subject color."""
    return subject if subject in ("rla", "science") else ""


def _build_card_html(q, subject):
    """Build HTML for a single task card."""
    cls = _subject_css_class(subject)
    teks_cls = f"teks-badge {cls}".strip()

    visual_html = ""
    if q.get("visual"):
        data_uri = _generate_visual(q["visual"])
        if data_uri:
            visual_html = f'<div class="visual-aid"><img src="{data_uri}" alt="visual aid"></div>'

    choices_html = ""
    for choice in q["choices"]:
        letter = choice[0]
        text = choice[3:] if len(choice) > 3 else choice[2:]
        choices_html += f'<div class="choice"><span class="choice-letter">{letter})</span> {text}</div>\n'

    return f"""<div class="card">
  <div class="card-num">{q['id']}</div>
  <div class="{teks_cls}">TEKS {q['teks']}</div>
  <div class="question">{q['question']}</div>
  {visual_html}
  <div class="choices">
    {choices_html}
  </div>
</div>"""


def _build_card_pages(questions, subject):
    """Build all card grid pages (6 cards per page)."""
    pages = []
    for i in range(0, len(questions), 6):
        chunk = questions[i:i + 6]
        cards_html = "\n".join(_build_card_html(q, subject) for q in chunk)
        pages.append(f'<div class="card-grid">\n{cards_html}\n</div>')
    return "\n".join(pages)


def _build_answer_key(questions, subject):
    """Build answer key page(s)."""
    rows_html = ""
    for q in questions:
        correct_text = ""
        for c in q["choices"]:
            if c.startswith(q["answer"]):
                correct_text = c
                break
        rows_html += f"""<tr>
  <td>{q['id']}</td>
  <td>TEKS {q['teks']}</td>
  <td><span class="answer-letter">{q['answer']}</span></td>
  <td>{correct_text}</td>
</tr>\n"""

    return f"""<div class="answer-key-page">
  <h2>Answer Key</h2>
  <table class="answer-table">
    <thead><tr>
      <th>#</th><th>TEKS</th><th>Answer</th><th>Correct Choice</th>
    </tr></thead>
    <tbody>{rows_html}</tbody>
  </table>
</div>"""


def _build_recording_sheet(questions):
    """Build student recording sheet."""
    cells_html = ""
    for q in questions:
        cells_html += f"""<div class="recording-cell">
  <div class="cell-num">#{q['id']}</div>
  <div class="bubbles">
    <div class="bubble">A</div>
    <div class="bubble">B</div>
    <div class="bubble">C</div>
    <div class="bubble">D</div>
  </div>
</div>\n"""

    return f"""<div class="recording-sheet">
  <h2>Student Recording Sheet</h2>
  <p>Name: ________________________________  Date: ________________</p>
  <div class="recording-grid">
    {cells_html}
  </div>
</div>"""


def _build_cover_page(data):
    """Build a simple cover page using the cover pattern."""
    subject = data["subject"]
    grade = data["grade"]
    accent = SUBJECT_HEX.get(subject, HEX["burnt"])
    subject_label = {"math": "Math", "rla": "Reading & Language Arts", "science": "Science"}
    subj_name = subject_label.get(subject, subject.upper())

    return f"""<div class="cover-page">
<div style="width:816px;height:1056px;position:relative;
  background:linear-gradient(160deg,{HEX['navy']} 0%,{HEX['navy']} 55%,{accent} 55%,{accent} 100%);
  display:flex;flex-direction:column;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden;">
  <div style="height:8px;background:{accent};width:100%;"></div>
  <div style="position:absolute;top:60px;right:40px;font-size:200px;color:rgba(255,255,255,0.06);line-height:1;">&#9733;</div>
  <div style="position:absolute;bottom:180px;left:-20px;font-size:120px;color:rgba(255,255,255,0.05);line-height:1;">&#9733;</div>
  <div style="flex:1;display:flex;flex-direction:column;padding:60px 50px 30px;position:relative;z-index:1;">
    <div style="display:inline-block;background:{accent};color:#fff;padding:8px 24px;border-radius:20px;
      font-size:16px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:30px;
      align-self:flex-start;">STAAR 2.0 Ready</div>
    <div style="width:60px;height:4px;background:{accent};margin-bottom:20px;"></div>
    <div style="color:#fff;font-size:48px;font-weight:800;line-height:1.15;margin-bottom:16px;">
      STAAR {subj_name}<br>Task Cards</div>
    <div style="color:rgba(255,255,255,0.9);font-size:22px;font-weight:400;line-height:1.4;margin-bottom:50px;">
      32 TEKS-Aligned Practice Questions</div>
    <ul style="list-style:none;margin-bottom:auto;">
      <li style="color:#fff;font-size:19px;padding:12px 0 12px 36px;position:relative;
        border-bottom:1px solid rgba(255,255,255,0.1);">
        <span style="position:absolute;left:0;font-size:18px;">&#9733;</span>STAAR 2.0 format practice</li>
      <li style="color:#fff;font-size:19px;padding:12px 0 12px 36px;position:relative;
        border-bottom:1px solid rgba(255,255,255,0.1);">
        <span style="position:absolute;left:0;font-size:18px;">&#9733;</span>Visual aids &amp; diagrams</li>
      <li style="color:#fff;font-size:19px;padding:12px 0 12px 36px;position:relative;
        border-bottom:1px solid rgba(255,255,255,0.1);">
        <span style="position:absolute;left:0;font-size:18px;">&#9733;</span>Answer key included</li>
      <li style="color:#fff;font-size:19px;padding:12px 0 12px 36px;position:relative;">
        <span style="position:absolute;left:0;font-size:18px;">&#9733;</span>Recording sheet</li>
    </ul>
    <div style="position:absolute;top:200px;right:0;background:{accent};color:#fff;
      padding:14px 30px 14px 40px;font-size:18px;font-weight:700;letter-spacing:1px;
      border-left:4px solid rgba(255,255,255,0.3);">Grade {grade}</div>
  </div>
  <div style="background:rgba(0,0,0,0.2);padding:28px 50px;display:flex;
    justify-content:space-between;align-items:center;">
    <div>
      <div style="color:#fff;font-size:28px;font-weight:800;letter-spacing:2px;">
        Teach4<span style="color:{accent};">Texas</span></div>
      <div style="color:rgba(255,255,255,0.7);font-size:14px;">Professional Resources for Texas Educators</div>
    </div>
    <div style="font-size:36px;color:{accent};">&#9733;</div>
  </div>
</div>
</div>"""


def generate_task_cards(json_path, output_name=None):
    """Generate a complete task card PDF from a content JSON file.

    Args:
        json_path: Path to the content JSON file
        output_name: Optional output filename (without extension)
    """
    with open(json_path) as f:
        data = json.load(f)

    subject = data["subject"]
    grade = data["grade"]
    questions = data["questions"]

    if output_name is None:
        output_name = f"task-cards-{subject}-grade{grade}"

    print(f"Generating: {output_name} ({len(questions)} questions)")

    # Build HTML sections
    cover = _build_cover_page(data)
    cards = _build_card_pages(questions, subject)
    answer_key = _build_answer_key(questions, subject)
    recording = _build_recording_sheet(questions)

    body = f"{cover}\n{cards}\n{answer_key}\n{recording}"

    css = load_css("task_card.css")
    html = build_html(body, css, title=f"Task Cards - {subject.upper()} Grade {grade}")

    output_path = os.path.join(OUTPUT_DIR, f"{output_name}.pdf")
    html_to_pdf(html, output_path)

    # Also save HTML for debugging
    html_path = os.path.join(OUTPUT_DIR, f"{output_name}.html")
    with open(html_path, "w") as f:
        f.write(html)
    print(f"  HTML: {html_path}")

    return output_path


def generate_all_task_cards():
    """Generate task card PDFs for all content JSON files."""
    ensure_output_dir()
    generated = []

    for fname in sorted(os.listdir(CONTENT_DIR)):
        if fname.endswith("_tasks.json"):
            json_path = os.path.join(CONTENT_DIR, fname)
            pdf_path = generate_task_cards(json_path)
            generated.append(pdf_path)

    print(f"\nGenerated {len(generated)} task card PDF(s)")
    return generated


if __name__ == "__main__":
    generate_all_task_cards()
