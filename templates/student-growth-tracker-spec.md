---
title: "Student Growth Tracking Template — Google Sheets Specification"
description: "Complete specification for a Google Sheets template that tracks student assessment data, calculates growth, and visualizes progress for TIA designation evidence."
---

# Student Growth Tracking Template — Google Sheets Specification

This document specifies a Google Sheets template designed for Texas teachers pursuing TIA designation. The template tracks individual student assessment scores, auto-calculates growth, and visualizes class-wide and individual progress. It works for any grade level or subject area.

---

## Overview

**Tabs (Sheets):**

1. **Setup** — Configuration (teacher info, class period, subject, assessment names)
2. **Class Roster** — Student list with demographic flags
3. **Assessment Scores** — All assessment scores entered here
4. **Growth Analysis** — Auto-calculated growth between pre/post assessments
5. **STAAR Readiness** — STAAR-specific tracking (for tested grades/subjects)
6. **Dashboard** — Charts and summary visualizations

---

## Tab 1: Setup

### Purpose
One-time configuration that feeds into all other tabs.

### Layout

| Row | Column A (Label) | Column B (Input) |
|-----|-----------------|-----------------|
| 1 | **Teacher Name** | [text input] |
| 2 | **Campus** | [text input] |
| 3 | **District** | [text input] |
| 4 | **Grade Level** | [dropdown: PK, K, 1-12] |
| 5 | **Subject** | [text input] |
| 6 | **Class Period** | [text input] |
| 7 | **School Year** | [dropdown: 2025-2026, 2026-2027, etc.] |
| 8 | **Number of Assessments** | [number: 1-20] |

**Rows 10-29: Assessment Configuration**

| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| Assessment # | Assessment Name | Type (Pre/Post/Benchmark/Diagnostic/STAAR) | Max Points |
| 1 | BOY Diagnostic | Diagnostic | 100 |
| 2 | Unit 1 Pre-Test | Pre | 50 |
| 3 | Unit 1 Post-Test | Post | 50 |
| ... | ... | ... | ... |

---

## Tab 2: Class Roster

### Purpose
Central student list referenced by all other tabs.

### Column Headers (Row 1)

| Column | Header | Description |
|--------|--------|-------------|
| A | **Student ID** | Unique identifier (district ID or sequential number) |
| B | **Last Name** | Student last name |
| C | **First Name** | Student first name |
| D | **ELL** | Yes/No — English Language Learner flag |
| E | **SPED** | Yes/No — Special Education flag |
| F | **504** | Yes/No — 504 Plan flag |
| G | **GT** | Yes/No — Gifted and Talented flag |
| H | **Eco Dis** | Yes/No — Economically Disadvantaged flag |
| I | **Prior Year STAAR** | Did Not Meet / Approaches / Meets / Masters / N/A |
| J | **Notes** | Free text for teacher notes |

### Specifications
- Rows 2-51 available for up to 50 students
- Column A auto-generates sequential IDs if left blank: `=IF(B2="","",ROW()-1)`
- Columns D-H use data validation dropdowns: Yes / No
- Column I uses data validation: Did Not Meet / Approaches / Meets / Masters / N/A
- Header row is frozen

---

## Tab 3: Assessment Scores

### Purpose
Single location for all assessment score entry.

### Column Headers (Row 1)

| Column | Header |
|--------|--------|
| A | **Student ID** | Auto-populated from Roster: `='Class Roster'!A2` |
| B | **Student Name** | Auto-populated: `='Class Roster'!C2&" "&'Class Roster'!B2` |
| C | **Assessment 1** | Header auto-pulls from Setup: `=Setup!B10` |
| D | **Assessment 1 %** | Auto-calculated percentage |
| E | **Assessment 2** | Header from Setup: `=Setup!B11` |
| F | **Assessment 2 %** | Auto-calculated percentage |
| ... | Continues for all configured assessments |

### Column Pattern (repeating for each assessment)
- **Odd columns (C, E, G...):** Raw score input (teacher enters the number)
- **Even columns (D, F, H...):** Auto-calculated percentage

### Formulas

**Percentage calculation (Column D, Row 2):**
```
=IF(C2="","",ROUND(C2/Setup!$D$10*100,1))
```
Where `Setup!$D$10` is the max points for Assessment 1.

**Student ID (Column A):**
```
='Class Roster'!A2
```

**Student Name (Column B):**
```
=IF('Class Roster'!B2="","",('Class Roster'!C2&" "&'Class Roster'!B2))
```

### Conditional Formatting (applied to percentage columns)

| Condition | Color | Meaning |
|-----------|-------|---------|
| Score < 60% | Red fill (#F4CCCC) | At-risk / Did Not Meet threshold |
| Score 60-79% | Yellow fill (#FFF2CC) | On-track / Approaches threshold |
| Score ≥ 80% | Green fill (#D9EAD3) | Exceeding / Meets-Masters threshold |

### Specifications
- Row 1 frozen
- Columns A-B frozen (student info always visible when scrolling)
- Up to 20 assessments (40 columns: raw + percentage for each)
- Blank score cells show no percentage (IF check prevents divide-by-zero)

---

## Tab 4: Growth Analysis

### Purpose
Auto-calculated growth between paired pre/post assessments and cumulative growth from BOY diagnostic.

### Section A: Pre/Post Growth Pairs (Columns A-J)

| Column | Header |
|--------|--------|
| A | **Student ID** | Auto-populated from Roster |
| B | **Student Name** | Auto-populated from Roster |
| C | **Pre-Test 1 %** | Pulled from Assessment Scores tab |
| D | **Post-Test 1 %** | Pulled from Assessment Scores tab |
| E | **Growth 1 (pp)** | Percentage point growth: `=IF(OR(C2="",D2=""),"",D2-C2)` |
| F | **Pre-Test 2 %** | Pulled from Assessment Scores tab |
| G | **Post-Test 2 %** | Pulled from Assessment Scores tab |
| H | **Growth 2 (pp)** | `=IF(OR(F2="",G2=""),"",G2-F2)` |
| I | **Average Growth (pp)** | `=AVERAGE(E2,H2,...)` across all growth columns |
| J | **Growth Category** | See formula below |

**Growth Category Formula (Column J):**
```
=IF(I2="","",
  IF(I2>=20,"Exceptional Growth",
    IF(I2>=10,"Strong Growth",
      IF(I2>=0,"Some Growth",
        "Negative Growth"))))
```

### Section B: Cumulative Growth from BOY (Columns L-O)

| Column | Header |
|--------|--------|
| L | **Student Name** | Auto-populated |
| M | **BOY Diagnostic %** | Pulled from Assessment Scores (first assessment) |
| N | **Most Recent Assessment %** | Pulled from Assessment Scores (latest non-blank) |
| O | **Cumulative Growth (pp)** | `=IF(OR(M2="",N2=""),"",N2-M2)` |

**Most Recent Assessment Formula (Column N):**
```
=IF(COUNTA('Assessment Scores'!D2,F2,H2,...)=0,"",
  LOOKUP(2,1/('Assessment Scores'!D2:XX2<>""),'Assessment Scores'!D2:XX2))
```
(Uses LOOKUP trick to find the last non-empty value in the percentage columns.)

### Conditional Formatting (Growth columns E, H, I, O)

| Condition | Color | Meaning |
|-----------|-------|---------|
| Growth < 0 | Red fill (#F4CCCC) | Negative growth — losing ground |
| Growth 0-9 | Yellow fill (#FFF2CC) | Minimal growth — needs attention |
| Growth 10-19 | Light green (#D9EAD3) | Solid growth |
| Growth ≥ 20 | Dark green (#B6D7A8) | Exceptional growth |

### Summary Row (below last student)

| Cell | Formula | Purpose |
|------|---------|---------|
| E-row | `=AVERAGE(E2:E51)` | Class average growth for pair 1 |
| I-row | `=AVERAGE(I2:I51)` | Class average overall growth |
| Below avg | `=COUNTIF(E2:E51,">="&10)/COUNTA(E2:E51)*100` | % of students with 10+ pp growth |

---

## Tab 5: STAAR Readiness

### Purpose
Track projected STAAR performance levels and readiness based on assessment data.

### Column Headers (Row 1)

| Column | Header | Description |
|--------|--------|-------------|
| A | **Student ID** | Auto-populated |
| B | **Student Name** | Auto-populated |
| C | **Prior STAAR Level** | Pulled from Roster Column I |
| D | **BOY Diagnostic %** | Pulled from Assessment Scores |
| E | **Current Average %** | Average of all assessment percentages |
| F | **Projected STAAR Level** | Formula-based projection |
| G | **Growth from Prior Level** | Calculated growth trajectory |
| H | **Risk Level** | High / Medium / Low |
| I | **Target Level** | The next STAAR level up (growth target) |
| J | **Notes / Intervention** | Teacher input |

### Key Formulas

**Current Average (Column E):**
```
=IF(B2="","",AVERAGE('Assessment Scores'!D2,'Assessment Scores'!F2,...))
```
(Averages all non-blank percentage columns from Assessment Scores.)

**Projected STAAR Level (Column F):**
```
=IF(E2="","",
  IF(E2>=80,"Masters",
    IF(E2>=65,"Meets",
      IF(E2>=45,"Approaches",
        "Did Not Meet"))))
```
*Note: These thresholds are approximations. Teachers should adjust based on their district's correlation data between classroom assessments and STAAR performance.*

**Risk Level (Column H):**
```
=IF(E2="","",
  IF(AND(C2="Did Not Meet",F2="Did Not Meet"),"High",
    IF(OR(F2="Did Not Meet",AND(C2="Approaches",F2="Approaches")),"Medium",
      "Low")))
```

**Target Level (Column I):**
```
=IF(C2="","",
  IF(C2="Did Not Meet","Approaches",
    IF(C2="Approaches","Meets",
      IF(C2="Meets","Masters",
        "Maintain Masters"))))
```

### Conditional Formatting

**Column F (Projected STAAR Level):**
| Value | Color |
|-------|-------|
| Did Not Meet | Red fill (#F4CCCC) |
| Approaches | Yellow fill (#FFF2CC) |
| Meets | Light green (#D9EAD3) |
| Masters | Dark green (#B6D7A8) |

**Column H (Risk Level):**
| Value | Color |
|-------|-------|
| High | Red fill, bold white text |
| Medium | Yellow fill |
| Low | Green fill |

### Summary Section (below student rows)

| Metric | Formula |
|--------|---------|
| % Projected Approaches+ | `=COUNTIFS(F2:F51,"<>Did Not Meet",F2:F51,"<>")/COUNTA(F2:F51)*100` |
| % Projected Meets+ | `=COUNTIFS(F2:F51,"Meets",F2:F51,"Masters")/COUNTA(F2:F51)*100` |
| % Showing Level Growth | Count where Projected > Prior |
| Students Needing Intervention | `=COUNTIF(H2:H51,"High")` |

---

## Tab 6: Dashboard

### Purpose
Visual summary for portfolio evidence and at-a-glance monitoring.

### Chart 1: Class Growth Distribution (Bar Chart)
- **Type:** Horizontal bar chart
- **Data:** Count of students in each Growth Category (from Growth Analysis tab)
- **Categories:** Exceptional Growth, Strong Growth, Some Growth, Negative Growth
- **Colors:** Dark green, light green, yellow, red (matching conditional formatting)

### Chart 2: Average Assessment Scores Over Time (Line Chart)
- **Type:** Line chart
- **X-axis:** Assessment names (in chronological order)
- **Y-axis:** Average class percentage score
- **Data:** Class average for each assessment from Assessment Scores tab
- **Includes:** Horizontal reference line at 70% (approximate grade-level threshold)

### Chart 3: STAAR Level Projection vs. Prior Year (Grouped Bar Chart)
- **Type:** Grouped bar chart
- **Categories:** Did Not Meet, Approaches, Meets, Masters
- **Series 1:** Count of students at each prior-year STAAR level
- **Series 2:** Count of students at each projected STAAR level
- **Purpose:** Visually shows movement between STAAR levels

### Chart 4: Individual Student Growth (Sortable Table)
- **Type:** Data table (not a chart — formatted range)
- **Columns:** Student Name | BOY % | Current % | Growth | Growth Category
- **Sorted by:** Growth (descending) — top growers at top
- **Conditional formatting:** Same red/yellow/green scheme

### Chart 5: Growth by Subgroup (Bar Chart)
- **Type:** Grouped bar chart
- **Categories:** ELL, SPED, 504, GT, Eco Dis, All Students
- **Data:** Average growth for each subgroup
- **Formula example for ELL average:**
```
=AVERAGEIF('Class Roster'!D2:D51,"Yes",'Growth Analysis'!I2:I51)
```
- **Purpose:** Shows equitable growth across student populations — powerful TIA evidence

### Summary Metrics (displayed as large formatted numbers at top of Dashboard)

| Metric | Formula |
|--------|---------|
| **Class Average Growth** | `='Growth Analysis'!I-summary` |
| **% Students Showing Growth** | `=COUNTIF('Growth Analysis'!I2:I51,">"&0)/COUNTA('Growth Analysis'!I2:I51)*100` |
| **Highest Individual Growth** | `=MAX('Growth Analysis'!I2:I51)` |
| **Students at High Risk** | `='STAAR Readiness'!H-count-high` |

---

## Global Specifications

### Data Validation Rules
- All Yes/No fields: dropdown list (Yes, No)
- STAAR levels: dropdown list (Did Not Meet, Approaches, Meets, Masters, N/A)
- Assessment types in Setup: dropdown list (Pre, Post, Benchmark, Diagnostic, STAAR, Other)
- Score inputs: number validation (0 to max points, whole numbers)

### Conditional Formatting (consistent across all tabs)
| Score/Growth Range | Fill Color | Hex Code | Meaning |
|-------------------|------------|----------|---------|
| Below threshold / Negative | Light red | #F4CCCC | At-risk |
| Near threshold / Minimal | Light yellow | #FFF2CC | On-track / caution |
| At threshold / Solid | Light green | #D9EAD3 | Meeting expectations |
| Above threshold / Exceptional | Medium green | #B6D7A8 | Exceeding |

### Print Settings
- All tabs set to landscape orientation
- Row 1 (headers) repeats on every printed page
- Margins: 0.5" all sides
- Scale: Fit to width (1 page wide, as many pages tall as needed)

### Protection
- Formula cells locked (protected)
- Input cells unlocked (editable)
- Sheet protection with password (default: "tia2026" — teacher can change)
- Setup tab should be edited first, then protected to prevent accidental changes

### Naming Convention
Suggested file name: `Student-Growth-Tracker_[LastName]_[Subject]_[Year].gsheet`
Example: `Student-Growth-Tracker_Garcia_Math4_2025-2026.gsheet`

---

## Implementation Notes

1. **Teacher enters data in only two places:** Setup tab (once) and Assessment Scores tab (ongoing). Everything else auto-calculates.

2. **Pre/Post pairing:** The Growth Analysis tab pairs assessments based on the Type column in Setup. Assessments marked "Pre" pair with the next assessment marked "Post." This allows flexible assessment schedules.

3. **The template works for non-STAAR subjects.** Simply ignore the STAAR Readiness tab or repurpose it for whatever summative assessment applies to your subject.

4. **Charts update automatically** as new assessment data is entered.

5. **The Dashboard tab is designed to be screenshot-friendly** — teachers can capture charts directly for their TIA portfolio.

6. **Color scheme is colorblind-accessible.** Red/yellow/green are supplemented with fill patterns (diagonal lines for red, dots for yellow, solid for green) in the print version.

---

*This template specification is part of the Lone Star Educator TIA toolkit. For guidance on using this data in your TIA portfolio, see our [TIA Portfolio Guide](/templates/tia-portfolio-guide).*
