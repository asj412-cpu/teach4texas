import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(astro|ts|js|mjs)$/.test(name)) out.push(path);
  }
  return out;
}

const srcFiles = walk(join(root, 'src'));
const srcText = srcFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

const catalog = readFileSync(join(root, 'src/lib/tpt-catalog.ts'), 'utf8');
const resources = readFileSync(join(root, 'src/pages/resources.astro'), 'utf8');
const indexPage = readFileSync(join(root, 'src/pages/index.astro'), 'utf8');
const siteLinks = readFileSync(join(root, 'src/lib/site-links.ts'), 'utf8');

const failures = [];

if (srcText.includes('YOUR_GUMROAD_URL')) {
  failures.push('YOUR_GUMROAD_URL is still in src/');
}
if (/teacherspayteachers\.com\/store\/teach-4-texas/.test(srcText)) {
  failures.push('Katy store slug teach-4-texas is in src/');
}
if (/teacherspayteachers\.com\/store\/teach4texas[^-]/.test(srcText)) {
  failures.push('Old store slug teach4texas (no hyphen) is in src/');
}
if (!siteLinks.includes('https://www.teacherspayteachers.com/store/teach4-texas')) {
  failures.push('Spring store slug teach4-texas missing from site-links.ts');
}
if (!indexPage.includes('href="/resources"')) {
  failures.push('Homepage Explore Resources CTA is not pointing at /resources');
}
if (resources.includes('STAAR Boot Camp MEGA BUNDLE') || resources.includes('YOUR_GUMROAD')) {
  failures.push('Gumroad / boot-camp block is still on /resources');
}

const hrefs = [...catalog.matchAll(/href:\s*`?\$\{TPT\}\/([^`']+)`|href:\s*'(https:\/\/www\.teacherspayteachers\.com\/Product\/[^']+)'/g)]
  .map((m) => m[1] ? `https://www.teacherspayteachers.com/Product/${m[1]}` : m[2]);

const ids = [...catalog.matchAll(/id:\s*'(\d+)'/g)].map((m) => m[1]);
const uniqueHrefs = new Set(hrefs);
const uniqueIds = new Set(ids);

if (hrefs.length < 40) failures.push(`Expected 40+ live TPT hrefs, found ${hrefs.length}`);
if (uniqueHrefs.size !== hrefs.length) failures.push('Duplicate TPT hrefs in catalog');
if (uniqueIds.size !== ids.length) failures.push('Duplicate TPT ids in catalog');
if (hrefs.some((h) => !h.includes('/Product/'))) failures.push('Catalog href is not a product URL');
if (hrefs.some((h) => h.includes('/store/'))) failures.push('Catalog href points at store root');

const requiredIds = [
  '17493794', // FREE Score Desk Companion
  '17493531', // ECR posters
  '17493627', // SCR checklists
  '17493690', // RACE posters
  '17493754', // TIA Growth Evidence Kit
  '17506345', // Back to School Grade 3 STAAR Math
  '17516930', // First Day of School Scavenger Hunt Grade 4 STAAR Math
  '17500215', // Number Vault G7
  '17468013', // Archive Vault
  '17468482', // Cycle Vault
];
for (const id of requiredIds) {
  if (!uniqueIds.has(id)) failures.push(`Missing required live SKU ${id}`);
}

if (failures.length) {
  console.error('TPT catalog checks failed:');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}

console.log(`TPT catalog OK: ${hrefs.length} unique product URLs, store slug teach4-texas, Gumroad placeholder gone.`);
