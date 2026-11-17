import { checkNumberLineDemoKey } from "./sample-number-line";

const report = checkNumberLineDemoKey();
console.log(report.lines.join("\n"));
process.exit(report.ok ? 0 : 1);
