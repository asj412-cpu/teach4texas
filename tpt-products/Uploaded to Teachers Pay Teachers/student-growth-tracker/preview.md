---
pdf_options:
  margin: 30mm 20mm
  headerTemplate: '<div style="font-size:8px;color:#999;width:100%;text-align:center;">PREVIEW — Teach4Texas</div>'
  footerTemplate: '<div style="font-size:8px;color:#999;width:100%;text-align:center;"><span class="pageNumber"></span></div>'
---

<div style="text-align:center; padding:40px 0;">

# ★ Student Growth Tracker ★

### Google Sheets Template for TIA Documentation

**All Grades | Teach4Texas**

---

*⚠️ PREVIEW — Sample pages only*

</div>

---

## Table of Contents

1. Class Roster Tab
2. Assessment Scores Tab
3. Growth Analysis Tab
4. STAAR Readiness Tab
5. Class Dashboard Tab
6. Setup Instructions

---

> **⚠️ PREVIEW** — This is a sample preview. Purchase for the full editable Google Sheets template.

---

## Tab 1: Class Roster — Layout

| Column | Header | Format | Notes |
|--------|--------|--------|-------|
| A | Last Name | Text | Required |
| B | First Name | Text | Required |
| C | Student ID | Text | Required |
| D | Subgroup Tags | Text | Comma-separated: ELL, SpEd, GT, 504, Dyslexia, At-Risk, Bilingual |
| E | Grade Level | Number | Optional |
| F | Notes | Text | Optional |

- Row 1: Header (bold, frozen, background #4472C4, white text)
- Rows 3–37: Student data (supports 35 students)

---

## Tab 2: Assessment Scores — Layout & Formulas

Columns A–C auto-populate from Class Roster. Columns D–Q hold scores:

| Columns | Purpose |
|---------|---------|
| D | Pre-Test |
| E–L | Unit 1–8 |
| M | Mid-Year |
| N | Post-Test |
| O–Q | STAAR Mock 1–3 |
| R | Current Average (auto-calculated) |
| S | Trend (↑ Rising / ↓ Falling / → Flat) |

### Key Formulas

**Current Average:**
```
=IFERROR(AVERAGE(D3:Q3),"")
```

**Trend:**
```
=IF(AND(D3<>"",N3<>""), IF(N3>D3,"↑ Rising", IF(N3<D3,"↓ Falling","→ Flat")), "")
```

### Conditional Formatting
- Below 50: 🔴 Light red
- 50–69: 🟡 Light yellow
- 70–84: 🔵 Light blue
- 85–100: 🟢 Light green

---

## Tab 3: Growth Analysis — Sample Formulas

| Column | Formula |
|--------|---------|
| Point Growth | `=IFERROR(E3-D3, "")` |
| % Growth | `=IFERROR(IF(D3=0, "", (E3-D3)/D3*100), "")` |
| Growth Rating | 🔴 Low (<10%) / 🟡 Moderate (10-20%) / 🟢 Strong (>20%) |
| Intervention Flag | `⚠️ NEEDS INTERVENTION` if growth <10% or score <50 |

---

<div style="text-align:center; padding:60px 20px; background:#F8F9FA; border:2px solid #1B365D; border-radius:8px; margin-top:40px;">

## ★ Get the Full Version! ★

### Student Growth Tracker — Complete Google Sheets Template

All 5 tabs fully built with formulas, conditional formatting, charts, and a printable dashboard.

**Available on Teachers Pay Teachers**

*Search: Teach4Texas Student Growth Tracker*

**Teach4Texas** — Professional Resources for Texas Educators

</div>
