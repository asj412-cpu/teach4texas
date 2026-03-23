# Student Growth Tracking Template — Google Sheets Specification

This document specifies the structure, formulas, and formatting for each tab in the Google Sheets template. Use this to build the spreadsheet or import the companion CSV files.

---

## Tab 1: Class Roster

### Layout

| Column | Header | Width | Format | Notes |
|--------|--------|-------|--------|-------|
| A | Last Name | 150px | Text | Required |
| B | First Name | 150px | Text | Required |
| C | Student ID | 100px | Text | Required |
| D | Subgroup Tags | 200px | Text | Comma-separated: ELL, SpEd, GT, 504, Dyslexia, At-Risk, Bilingual |
| E | Grade Level | 80px | Number | Optional |
| F | Notes | 250px | Text | Optional |

### Data Validation (Column D)
- Dropdown with checkboxes or free text
- Suggested values: ELL, SpEd, GT, 504, Dyslexia, At-Risk, Bilingual

### Row Layout
- Row 1: Header (bold, frozen, background #4472C4, white text)
- Row 2: Column descriptions (italic, gray text, frozen)
- Rows 3–37: Student data (35 students)

---

## Tab 2: Assessment Scores

### Layout

| Column | Header | Width | Format |
|--------|--------|-------|--------|
| A | Last Name | 150px | Auto-populated: `='Class Roster'!A3` |
| B | First Name | 150px | Auto-populated: `='Class Roster'!B3` |
| C | Student ID | 100px | Auto-populated: `='Class Roster'!C3` |
| D | Pre-Test | 80px | Number (0-100) |
| E | Unit 1 | 80px | Number (0-100) |
| F | Unit 2 | 80px | Number (0-100) |
| G | Unit 3 | 80px | Number (0-100) |
| H | Unit 4 | 80px | Number (0-100) |
| I | Unit 5 | 80px | Number (0-100) |
| J | Unit 6 | 80px | Number (0-100) |
| K | Unit 7 | 80px | Number (0-100) |
| L | Unit 8 | 80px | Number (0-100) |
| M | Mid-Year | 80px | Number (0-100) |
| N | Post-Test | 80px | Number (0-100) |
| O | STAAR Mock 1 | 90px | Number (0-100) |
| P | STAAR Mock 2 | 90px | Number (0-100) |
| Q | STAAR Mock 3 | 90px | Number (0-100) |
| R | Current Average | 90px | Formula |
| S | Trend | 80px | Formula |

### Formulas

**Current Average (R3):**
```
=IFERROR(AVERAGE(D3:Q3),"")
```

**Trend (S3):**
```
=IF(AND(D3<>"",N3<>""), IF(N3>D3,"↑ Rising", IF(N3<D3,"↓ Falling","→ Flat")), "")
```

### Conditional Formatting
- Scores below 50: Light red background (#FFC7CE)
- Scores 50-69: Light yellow (#FFEB9C)
- Scores 70-84: Light blue (#BDD7EE)
- Scores 85-100: Light green (#C6EFCE)

### Header Formatting
- Row 1: Bold, frozen, background #4472C4, white text
- Columns D-L grouped under "Unit Assessments" merge header
- Columns O-Q grouped under "STAAR Mocks" merge header

---

## Tab 3: Growth Analysis

### Layout

| Column | Header | Width | Format |
|--------|--------|-------|--------|
| A | Last Name | 150px | Auto-populated |
| B | First Name | 150px | Auto-populated |
| C | Subgroup | 150px | Auto-populated from Roster |
| D | Pre-Test Score | 90px | Auto-populated from Tab 2 |
| E | Most Recent Score | 90px | Formula |
| F | Point Growth | 90px | Formula |
| G | % Growth | 90px | Formula |
| H | Growth Rating | 100px | Formula |
| I | Pre→Mid Growth | 90px | Formula |
| J | Mid→Post Growth | 90px | Formula |
| K | STAAR Mock Trend | 100px | Formula |
| L | Intervention Flag | 100px | Formula |

### Formulas

**Most Recent Score (E3):**
```
=IFERROR(INDEX('Assessment Scores'!D3:Q3, MATCH(2,1/('Assessment Scores'!D3:Q3<>""),1)), "")
```

**Point Growth (F3):**
```
=IFERROR(E3-D3, "")
```

**% Growth (G3):**
```
=IFERROR(IF(D3=0, "", (E3-D3)/D3*100), "")
```

**Growth Rating (H3):**
```
=IF(G3="","", IF(G3<10,"🔴 Low Growth", IF(G3<20,"🟡 Moderate Growth","🟢 Strong Growth")))
```

**Pre→Mid Growth (I3):**
```
=IFERROR('Assessment Scores'!M3 - 'Assessment Scores'!D3, "")
```

**Mid→Post Growth (J3):**
```
=IFERROR('Assessment Scores'!N3 - 'Assessment Scores'!M3, "")
```

**STAAR Mock Trend (K3):**
```
=IF(AND('Assessment Scores'!O3<>"",'Assessment Scores'!P3<>""), IF('Assessment Scores'!P3>'Assessment Scores'!O3,"↑","↓"), "")
```

**Intervention Flag (L3):**
```
=IF(OR(G3<10, E3<50), "⚠️ NEEDS INTERVENTION", "")
```

### Conditional Formatting (Column G — % Growth)
- Less than 10%: Background #FFC7CE (red), bold
- 10% to 20%: Background #FFEB9C (yellow)
- Greater than 20%: Background #C6EFCE (green), bold

---

## Tab 4: STAAR Readiness

### Layout

| Column | Header | Width | Format |
|--------|--------|-------|--------|
| A | Last Name | 150px | Auto-populated |
| B | First Name | 150px | Auto-populated |
| C | Subgroup | 150px | Auto-populated |
| D | BOY Level | 90px | Dropdown: D/A/M/MA |
| E | MOY Level | 90px | Dropdown: D/A/M/MA |
| F | Mock 1 Level | 90px | Dropdown: D/A/M/MA |
| G | Mock 2 Level | 90px | Dropdown: D/A/M/MA |
| H | Current Projection | 100px | Formula |
| I | Movement | 100px | Formula |
| J | Action Needed | 150px | Formula |

### Legend
- **D** = Did Not Meet Grade Level
- **A** = Approaches Grade Level
- **M** = Meets Grade Level
- **MA** = Masters Grade Level

### Formulas

**Current Projection (H3):**
```
=IFERROR(INDEX(D3:G3, MATCH(2,1/(D3:G3<>""),1)), "")
```

**Movement (I3):**
Uses helper function to convert D/A/M/MA to numeric (1/2/3/4):
```
=IF(AND(D3<>"",H3<>""),
  IF(VLOOKUP(H3,{"D",1;"A",2;"M",3;"MA",4},2,0) > VLOOKUP(D3,{"D",1;"A",2;"M",3;"MA",4},2,0),
    "⬆️ Moving Up",
    IF(VLOOKUP(H3,{"D",1;"A",2;"M",3;"MA",4},2,0) < VLOOKUP(D3,{"D",1;"A",2;"M",3;"MA",4},2,0),
      "⬇️ Moving Down",
      "➡️ No Change")),
  "")
```

**Action Needed (J3):**
```
=IF(H3="D","🚨 Intensive Intervention — Tutorials, Small Group, Parent Contact",
 IF(H3="A","📋 Targeted Practice — Focus on weak TEKS, test-taking strategies",
 IF(H3="M","💪 Enrichment to push toward Masters",
 IF(H3="MA","⭐ Extension activities, peer tutoring opportunities",""))))
```

### Conditional Formatting
- D cells: Red background
- A cells: Yellow background
- M cells: Light green
- MA cells: Dark green, white text

---

## Tab 5: Dashboard

### Layout (Summary Statistics)

**Section 1: Class Overview (Rows 1-8)**
| Cell | Content | Formula |
|------|---------|---------|
| A1 | "📊 CLASS DASHBOARD" | Header, merged A1:F1 |
| A3 | "Total Students:" | Label |
| B3 | (count) | `=COUNTA('Class Roster'!A3:A37)` |
| A4 | "Class Pre-Test Average:" | Label |
| B4 | (average) | `=AVERAGE('Assessment Scores'!D3:D37)` |
| A5 | "Class Current Average:" | Label |
| B5 | (average) | `=AVERAGE('Growth Analysis'!E3:E37)` |
| A6 | "Class Average Growth:" | Label |
| B6 | (average) | `=AVERAGE('Growth Analysis'!G3:G37)` |
| A7 | "Students Needing Intervention:" | Label |
| B7 | (count) | `=COUNTIF('Growth Analysis'!L3:L37,"⚠️*")` |

**Section 2: STAAR Readiness Distribution (Rows 10-15)**
| Cell | Content | Formula |
|------|---------|---------|
| A10 | "STAAR Readiness Breakdown" | Header |
| A11 | "Did Not Meet:" | Label |
| B11 | (count) | `=COUNTIF('STAAR Readiness'!H3:H37,"D")` |
| C11 | (percentage) | `=B11/B3*100 & "%"` |
| A12 | "Approaches:" | — |
| B12 | (count) | `=COUNTIF('STAAR Readiness'!H3:H37,"A")` |
| A13 | "Meets:" | — |
| B13 | (count) | `=COUNTIF('STAAR Readiness'!H3:H37,"M")` |
| A14 | "Masters:" | — |
| B14 | (count) | `=COUNTIF('STAAR Readiness'!H3:H37,"MA")` |

**Section 3: Subgroup Breakdown (Rows 17-25)**
- Average growth for each subgroup (ELL, SpEd, GT, etc.)
- Uses AVERAGEIFS to filter by subgroup tag

**Section 4: Charts (Rows 27+)**

**Chart 1 — STAAR Readiness Pie Chart**
- Data: B11:B14
- Labels: A11:A14
- Colors: Red, Yellow, Light Green, Dark Green

**Chart 2 — Growth Over Time Line Chart**
- X-axis: Assessment names (Pre-Test, Unit 1, Unit 2, ..., Post-Test)
- Y-axis: Class average score per assessment
- Data: Average of each column from Tab 2

**Chart 3 — Subgroup Comparison Bar Chart**
- X-axis: Subgroup names
- Y-axis: Average % growth
- One bar per subgroup

**Chart 4 — Growth Distribution Histogram**
- Bins: <0%, 0-10%, 10-20%, 20-30%, 30%+
- Count of students in each bin

---

## CSV Import Files

### roster-template.csv
```csv
Last Name,First Name,Student ID,Subgroup Tags,Grade Level,Notes
Smith,John,12345,"ELL",4,
Johnson,Maria,12346,"GT",4,
Williams,Carlos,12347,"ELL,At-Risk",4,
```

### scores-template.csv
```csv
Last Name,First Name,Student ID,Pre-Test,Unit 1,Unit 2,Unit 3,Unit 4,Unit 5,Unit 6,Unit 7,Unit 8,Mid-Year,Post-Test,STAAR Mock 1,STAAR Mock 2,STAAR Mock 3
Smith,John,12345,45,52,58,60,,,,,,,55,,
Johnson,Maria,12346,82,85,88,90,,,,,,,87,,
Williams,Carlos,12347,38,42,45,48,,,,,,,43,,
```

---

## Color Palette

| Use | Hex Code | Description |
|-----|----------|-------------|
| Headers | #4472C4 | Blue |
| Strong Growth | #C6EFCE | Light Green |
| Moderate Growth | #FFEB9C | Light Yellow |
| Low Growth | #FFC7CE | Light Red |
| Masters | #548235 | Dark Green |
| Meets | #A9D18E | Medium Green |
| Approaches | #FFD966 | Yellow |
| Did Not Meet | #FF6B6B | Red |
| Dashboard BG | #F2F2F2 | Light Gray |

---

## Print Settings
- Landscape orientation
- Fit to page width
- Repeat Row 1 on each page
- Include sheet name in footer
