// Run this in Google Apps Script (Extensions > Apps Script) from a blank Google Sheet
// It will build the entire Student Growth Tracker template

function buildTracker() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename("Student Growth Tracker — Teach4Texas");
  
  // Clean up default sheet
  const defaultSheet = ss.getSheets()[0];
  defaultSheet.setName("Class Roster");
  
  // Create all tabs
  const scoresSheet = ss.insertSheet("Assessment Scores");
  const growthSheet = ss.insertSheet("Growth Analysis");
  const staarSheet = ss.insertSheet("STAAR Readiness");
  const dashSheet = ss.insertSheet("Dashboard");
  
  buildRoster(defaultSheet);
  buildScores(scoresSheet);
  buildGrowth(growthSheet);
  buildSTAAR(staarSheet);
  buildDashboard(dashSheet);
  
  // Set active sheet to Dashboard
  ss.setActiveSheet(dashSheet);
  SpreadsheetApp.flush();
}

function styleHeader(sheet, lastCol, color) {
  const hdr = sheet.getRange(1, 1, 1, lastCol);
  hdr.setBackground(color || "#4472C4")
     .setFontColor("white")
     .setFontWeight("bold")
     .setFontSize(11)
     .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

function buildRoster(s) {
  const headers = ["Last Name","First Name","Student ID","Subgroup Tags","Grade Level","Notes"];
  s.getRange(1,1,1,6).setValues([headers]);
  styleHeader(s, 6);
  
  // Set column widths
  s.setColumnWidth(1, 150); s.setColumnWidth(2, 150); s.setColumnWidth(3, 100);
  s.setColumnWidth(4, 200); s.setColumnWidth(5, 80); s.setColumnWidth(6, 250);
  
  // Data validation for subgroup tags
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["ELL","SpEd","GT","504","Dyslexia","At-Risk","Bilingual"], true)
    .setAllowInvalid(true)
    .build();
  s.getRange(2, 4, 35, 1).setDataValidation(rule);
  
  // Alternate row colors
  for (let i = 2; i <= 36; i++) {
    if (i % 2 === 0) s.getRange(i, 1, 1, 6).setBackground("#F8F9FA");
  }
}

function buildScores(s) {
  const headers = ["Last Name","First Name","Student ID","Pre-Test","Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6","Unit 7","Unit 8","Mid-Year","Post-Test","STAAR Mock 1","STAAR Mock 2","STAAR Mock 3","Current Avg","Trend"];
  s.getRange(1,1,1,19).setValues([headers]);
  styleHeader(s, 19);
  
  // Auto-populate names from roster
  for (let r = 2; r <= 36; r++) {
    s.getRange(r, 1).setFormula(`='Class Roster'!A${r}`);
    s.getRange(r, 2).setFormula(`='Class Roster'!B${r}`);
    s.getRange(r, 3).setFormula(`='Class Roster'!C${r}`);
    // Current Average
    s.getRange(r, 18).setFormula(`=IFERROR(AVERAGE(D${r}:Q${r}),"")`);
    // Trend
    s.getRange(r, 19).setFormula(`=IF(AND(D${r}<>"",N${r}<>""),IF(N${r}>D${r},"↑ Rising",IF(N${r}<D${r},"↓ Falling","→ Flat")),"")`);
  }
  
  // Column widths
  for (let c = 1; c <= 3; c++) s.setColumnWidth(c, c === 3 ? 100 : 150);
  for (let c = 4; c <= 19; c++) s.setColumnWidth(c, 90);
  
  // Conditional formatting for scores
  const scoreRange = s.getRange(2, 4, 35, 14);
  const rules = s.getConditionalFormatRules();
  
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(50).setBackground("#FFC7CE").setRanges([scoreRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(50, 69).setBackground("#FFEB9C").setRanges([scoreRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(70, 84).setBackground("#BDD7EE").setRanges([scoreRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(85, 100).setBackground("#C6EFCE").setRanges([scoreRange]).build());
  
  s.setConditionalFormatRules(rules);
  
  // Number format
  scoreRange.setNumberFormat("0");
}

function buildGrowth(s) {
  const headers = ["Last Name","First Name","Subgroup","Pre-Test","Most Recent","Point Growth","% Growth","Growth Rating","Pre→Mid","Mid→Post","STAAR Mock Trend","Intervention Flag"];
  s.getRange(1,1,1,12).setValues([headers]);
  styleHeader(s, 12);
  
  for (let r = 2; r <= 36; r++) {
    s.getRange(r, 1).setFormula(`='Class Roster'!A${r}`);
    s.getRange(r, 2).setFormula(`='Class Roster'!B${r}`);
    s.getRange(r, 3).setFormula(`='Class Roster'!D${r}`);
    s.getRange(r, 4).setFormula(`='Assessment Scores'!D${r}`);
    // Most recent non-empty score
    s.getRange(r, 5).setFormula(`=IFERROR(LOOKUP(2,1/('Assessment Scores'!D${r}:Q${r}<>""),'Assessment Scores'!D${r}:Q${r}),"")`);
    s.getRange(r, 6).setFormula(`=IFERROR(E${r}-D${r},"")`);
    s.getRange(r, 7).setFormula(`=IFERROR(IF(D${r}=0,"",(E${r}-D${r})/D${r}*100),"")`);
    s.getRange(r, 8).setFormula(`=IF(G${r}="","",IF(G${r}<10,"🔴 Low Growth",IF(G${r}<20,"🟡 Moderate",IF(G${r}>=20,"🟢 Strong",""))))`);
    s.getRange(r, 9).setFormula(`=IFERROR('Assessment Scores'!M${r}-'Assessment Scores'!D${r},"")`);
    s.getRange(r, 10).setFormula(`=IFERROR('Assessment Scores'!N${r}-'Assessment Scores'!M${r},"")`);
    s.getRange(r, 11).setFormula(`=IF(AND('Assessment Scores'!O${r}<>"",'Assessment Scores'!P${r}<>""),IF('Assessment Scores'!P${r}>'Assessment Scores'!O${r},"↑","↓"),"")`);
    s.getRange(r, 12).setFormula(`=IF(OR(G${r}<10,E${r}<50),"⚠️ NEEDS INTERVENTION","")`);
  }
  
  // Conditional formatting for % Growth
  const growthRange = s.getRange(2, 7, 35, 1);
  const rules = s.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(10).setBackground("#FFC7CE").setFontColor("#9C0006").setBold(true).setRanges([growthRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(10, 20).setBackground("#FFEB9C").setRanges([growthRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(20).setBackground("#C6EFCE").setFontColor("#006100").setBold(true).setRanges([growthRange]).build());
  s.setConditionalFormatRules(rules);
  
  for (let c = 1; c <= 12; c++) s.setColumnWidth(c, c <= 3 ? 150 : 110);
}

function buildSTAAR(s) {
  const headers = ["Last Name","First Name","Subgroup","BOY Level","MOY Level","Mock 1 Level","Mock 2 Level","Current Projection","Movement","Action Needed"];
  s.getRange(1,1,1,10).setValues([headers]);
  styleHeader(s, 10);
  
  const levelRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["D","A","M","MA"], true).setAllowInvalid(false).build();
  
  for (let r = 2; r <= 36; r++) {
    s.getRange(r, 1).setFormula(`='Class Roster'!A${r}`);
    s.getRange(r, 2).setFormula(`='Class Roster'!B${r}`);
    s.getRange(r, 3).setFormula(`='Class Roster'!D${r}`);
    // Data validation for level columns
    s.getRange(r, 4, 1, 4).setDataValidation(levelRule);
    // Current projection (most recent non-empty)
    s.getRange(r, 8).setFormula(`=IFERROR(LOOKUP(2,1/(D${r}:G${r}<>""),D${r}:G${r}),"")`);
    // Movement
    s.getRange(r, 9).setFormula(`=IF(AND(D${r}<>"",H${r}<>""),IF(MATCH(H${r},{"D","A","M","MA"},0)>MATCH(D${r},{"D","A","M","MA"},0),"⬆️ Moving Up",IF(MATCH(H${r},{"D","A","M","MA"},0)<MATCH(D${r},{"D","A","M","MA"},0),"⬇️ Moving Down","➡️ No Change")),"")`);
    // Action Needed
    s.getRange(r, 10).setFormula(`=IF(H${r}="D","🚨 Intensive Intervention",IF(H${r}="A","📋 Targeted Practice",IF(H${r}="M","💪 Push toward Masters",IF(H${r}="MA","⭐ Extension & Peer Tutoring",""))))`);
  }
  
  // Conditional formatting for level columns
  const levelRange = s.getRange(2, 4, 35, 5);
  const rules = s.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("D").setBackground("#FF6B6B").setFontColor("white").setRanges([levelRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("A").setBackground("#FFD966").setRanges([levelRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("M").setBackground("#A9D18E").setRanges([levelRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("MA").setBackground("#548235").setFontColor("white").setRanges([levelRange]).build());
  s.setConditionalFormatRules(rules);
  
  for (let c = 1; c <= 10; c++) s.setColumnWidth(c, c <= 3 ? 150 : (c === 10 ? 200 : 110));
}

function buildDashboard(s) {
  s.getRange("A1").setValue("📊 CLASS DASHBOARD").setFontSize(18).setFontWeight("bold").setFontColor("#1B365D");
  s.getRange("A1:F1").merge().setBackground("#F2F2F2");
  
  // Class Overview
  s.getRange("A3").setValue("📋 CLASS OVERVIEW").setFontSize(14).setFontWeight("bold").setFontColor("#4472C4");
  
  const labels1 = [["Total Students:",`=COUNTA('Class Roster'!A2:A36)`],
                   ["Pre-Test Average:",`=IFERROR(AVERAGE('Assessment Scores'!D2:D36),0)`],
                   ["Current Average:",`=IFERROR(AVERAGE('Growth Analysis'!E2:E36),0)`],
                   ["Average Growth %:",`=IFERROR(AVERAGE('Growth Analysis'!G2:G36),0)`],
                   ["Students Needing Intervention:",`=COUNTIF('Growth Analysis'!L2:L36,"⚠️*")`]];
  
  for (let i = 0; i < labels1.length; i++) {
    s.getRange(4 + i, 1).setValue(labels1[i][0]).setFontWeight("bold");
    s.getRange(4 + i, 2).setFormula(labels1[i][1]);
  }
  s.getRange(5, 2, 3, 1).setNumberFormat("0.0");
  
  // STAAR Readiness Breakdown
  s.getRange("A10").setValue("📊 STAAR READINESS BREAKDOWN").setFontSize(14).setFontWeight("bold").setFontColor("#4472C4");
  
  const staarLabels = [
    ["Did Not Meet (D)", `=COUNTIF('STAAR Readiness'!H2:H36,"D")`, "#FF6B6B"],
    ["Approaches (A)", `=COUNTIF('STAAR Readiness'!H2:H36,"A")`, "#FFD966"],
    ["Meets (M)", `=COUNTIF('STAAR Readiness'!H2:H36,"M")`, "#A9D18E"],
    ["Masters (MA)", `=COUNTIF('STAAR Readiness'!H2:H36,"MA")`, "#548235"]
  ];
  
  for (let i = 0; i < staarLabels.length; i++) {
    const row = 11 + i;
    s.getRange(row, 1).setValue(staarLabels[i][0]).setFontWeight("bold");
    s.getRange(row, 2).setFormula(staarLabels[i][1]);
    s.getRange(row, 3).setFormula(`=IFERROR(TEXT(B${row}/B4,"0%"),"")`);
    s.getRange(row, 1, 1, 3).setBackground(staarLabels[i][2]);
    if (i === 3) s.getRange(row, 1, 1, 3).setFontColor("white");
  }
  
  // Growth Distribution
  s.getRange("A16").setValue("📈 GROWTH DISTRIBUTION").setFontSize(14).setFontWeight("bold").setFontColor("#4472C4");
  
  const growthBuckets = [
    ["Negative Growth (<0%)", `=COUNTIF('Growth Analysis'!G2:G36,"<0")`, "#FFC7CE"],
    ["Low Growth (0-10%)", `=COUNTIFS('Growth Analysis'!G2:G36,">=0",'Growth Analysis'!G2:G36,"<10")`, "#FFEB9C"],
    ["Moderate Growth (10-20%)", `=COUNTIFS('Growth Analysis'!G2:G36,">=10",'Growth Analysis'!G2:G36,"<20")`, "#BDD7EE"],
    ["Strong Growth (20%+)", `=COUNTIF('Growth Analysis'!G2:G36,">=20")`, "#C6EFCE"]
  ];
  
  for (let i = 0; i < growthBuckets.length; i++) {
    const row = 17 + i;
    s.getRange(row, 1).setValue(growthBuckets[i][0]).setFontWeight("bold");
    s.getRange(row, 2).setFormula(growthBuckets[i][1]);
    s.getRange(row, 1, 1, 3).setBackground(growthBuckets[i][2]);
  }
  
  // Subgroup Breakdown
  s.getRange("A22").setValue("👥 SUBGROUP GROWTH AVERAGES").setFontSize(14).setFontWeight("bold").setFontColor("#4472C4");
  
  const subgroups = ["ELL","SpEd","GT","504","At-Risk"];
  for (let i = 0; i < subgroups.length; i++) {
    const row = 23 + i;
    s.getRange(row, 1).setValue(subgroups[i]).setFontWeight("bold");
    s.getRange(row, 2).setFormula(`=IFERROR(AVERAGEIF('Growth Analysis'!C2:C36,"*${subgroups[i]}*",'Growth Analysis'!G2:G36),"N/A")`);
    s.getRange(row, 2).setNumberFormat("0.0");
  }
  
  // Formatting
  s.setColumnWidth(1, 280);
  s.setColumnWidth(2, 100);
  s.setColumnWidth(3, 80);
  s.getRange("A1:F30").setFontFamily("Inter");
  
  // Instructions
  s.getRange("E3").setValue("ℹ️ This dashboard auto-updates as you enter data in the other tabs.").setFontColor("#666666").setFontStyle("italic");
}
