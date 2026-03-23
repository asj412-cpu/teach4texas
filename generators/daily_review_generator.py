"""Generate 4-A-Day Daily Review PDF packets from content JSON files.

Each product: cover + 40 day pages (8 weeks × 5 days × 4 questions) + answer key.
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
    return subject if subject in ("rla", "science") else ""


def _build_question_block(q, num, subject):
    """Build HTML for a single question within a day page."""
    cls = _subject_css_class(subject)
    teks_cls = f"q-teks {cls}".strip()

    visual_html = ""
    if q.get("visual"):
        data_uri = _generate_visual(q["visual"])
        if data_uri:
            visual_html = f'<div class="q-visual"><img src="{data_uri}" alt="visual aid"></div>'

    choices_html = ""
    for choice in q["choices"]:
        letter = choice[0]
        text = choice[3:] if len(choice) > 3 else choice[2:]
        choices_html += f'<div class="q-choice"><span class="q-choice-letter">{letter})</span> {text}</div>\n'

    return f"""<div class="question-block">
  <div class="q-header">
    <div class="q-number">{num}</div>
    <div class="{teks_cls}">TEKS {q['teks']}</div>
  </div>
  <div class="q-text">{q['question']}</div>
  {visual_html}
  <div class="q-choices">{choices_html}</div>
  <div class="workspace">Work Space</div>
</div>"""


def _build_day_page(week, day, questions, subject, grade):
    """Build one day page with 4 questions."""
    cls = _subject_css_class(subject)
    badge_cls = f"subject-badge {cls}".strip()
    subject_labels = {"math": "Math", "rla": "RLA", "science": "Science"}
    subj_name = subject_labels.get(subject, subject.upper())

    questions_html = ""
    for i, q in enumerate(questions, 1):
        questions_html += _build_question_block(q, i, subject)

    return f"""<div class="day-page">
  <div class="day-header">
    <div class="week-day">Week {week} &mdash; Day {day}</div>
    <div class="subject-grade">
      <div class="{badge_cls}">{subj_name}</div>
      <div class="{badge_cls}" style="background:{HEX['navy']};">Grade {grade}</div>
      <div class="brand-tag">T4T</div>
    </div>
  </div>
  {questions_html}
</div>"""


def _build_answer_key(data):
    """Build answer key pages organized by week."""
    questions = data["questions"]
    weeks_html = ""

    for week in range(1, 9):
        week_start = (week - 1) * 20
        week_questions = questions[week_start:week_start + 20]
        if not week_questions:
            break

        rows_html = ""
        for day in range(1, 6):
            day_start = (day - 1) * 4
            day_qs = week_questions[day_start:day_start + 4]
            if not day_qs:
                break
            answers = " | ".join(
                f'<span class="correct">{q["answer"]}</span>' for q in day_qs
            )
            teks_list = ", ".join(q["teks"] for q in day_qs)
            rows_html += f"<tr><td>Day {day}</td><td>{answers}</td><td style='font-size:8pt;color:#666;'>{teks_list}</td></tr>\n"

        weeks_html += f"""
<div class="ak-week-header">Week {week}</div>
<table class="ak-table">
  <thead><tr><th>Day</th><th>Q1 | Q2 | Q3 | Q4</th><th>TEKS</th></tr></thead>
  <tbody>{rows_html}</tbody>
</table>"""

    return f"""<div class="answer-key-page">
  <h2>Answer Key</h2>
  {weeks_html}
</div>"""


def _build_cover_page(data):
    """Build cover page for daily review packet."""
    subject = data["subject"]
    grade = data["grade"]
    accent = SUBJECT_HEX.get(subject, HEX["burnt"])
    subject_labels = {"math": "Math", "rla": "Reading & Language Arts", "science": "Science"}
    subj_name = subject_labels.get(subject, subject.upper())

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
      align-self:flex-start;">4-A-Day Review</div>
    <div style="width:60px;height:4px;background:{accent};margin-bottom:20px;"></div>
    <div style="color:#fff;font-size:44px;font-weight:800;line-height:1.15;margin-bottom:16px;">
      Daily {subj_name}<br>Review Packet</div>
    <div style="color:rgba(255,255,255,0.9);font-size:22px;font-weight:400;line-height:1.4;margin-bottom:50px;">
      8 Weeks of Spiraling TEKS Practice</div>
    <ul style="list-style:none;margin-bottom:auto;">
      <li style="color:#fff;font-size:19px;padding:12px 0 12px 36px;position:relative;
        border-bottom:1px solid rgba(255,255,255,0.1);">
        <span style="position:absolute;left:0;font-size:18px;">&#9733;</span>160 STAAR-aligned questions</li>
      <li style="color:#fff;font-size:19px;padding:12px 0 12px 36px;position:relative;
        border-bottom:1px solid rgba(255,255,255,0.1);">
        <span style="position:absolute;left:0;font-size:18px;">&#9733;</span>Visual aids &amp; diagrams</li>
      <li style="color:#fff;font-size:19px;padding:12px 0 12px 36px;position:relative;
        border-bottom:1px solid rgba(255,255,255,0.1);">
        <span style="position:absolute;left:0;font-size:18px;">&#9733;</span>Spiraling TEKS coverage</li>
      <li style="color:#fff;font-size:19px;padding:12px 0 12px 36px;position:relative;">
        <span style="position:absolute;left:0;font-size:18px;">&#9733;</span>Answer key included</li>
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


def generate_daily_review(json_path, output_name=None):
    """Generate a complete daily review PDF from a content JSON file.

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
        output_name = f"daily-review-{subject}-grade{grade}"

    print(f"Generating: {output_name} ({len(questions)} questions)")

    # Build cover
    cover = _build_cover_page(data)

    # Build day pages
    day_pages = []
    qi = 0  # question index
    for week in range(1, 9):
        for day in range(1, 6):
            day_qs = questions[qi:qi + 4]
            if len(day_qs) < 4:
                break
            day_pages.append(_build_day_page(week, day, day_qs, subject, grade))
            qi += 4

    # Build answer key
    answer_key = _build_answer_key(data)

    body = cover + "\n" + "\n".join(day_pages) + "\n" + answer_key
    css = load_css("daily_review.css")
    html = build_html(body, css, title=f"4-A-Day Review - {subject.upper()} Grade {grade}")

    output_path = os.path.join(OUTPUT_DIR, f"{output_name}.pdf")
    html_to_pdf(html, output_path)

    # Also save HTML for debugging
    html_path = os.path.join(OUTPUT_DIR, f"{output_name}.html")
    with open(html_path, "w") as f:
        f.write(html)
    print(f"  HTML: {html_path}")

    return output_path


def generate_all_daily_reviews():
    """Generate daily review PDFs for all content JSON files."""
    ensure_output_dir()
    generated = []

    for fname in sorted(os.listdir(CONTENT_DIR)):
        if fname.endswith("_daily.json"):
            json_path = os.path.join(CONTENT_DIR, fname)
            pdf_path = generate_daily_review(json_path)
            generated.append(pdf_path)

    print(f"\nGenerated {len(generated)} daily review PDF(s)")
    return generated


if __name__ == "__main__":
    generate_all_daily_reviews()
