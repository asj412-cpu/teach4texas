export const SCORE_DESK_URL = 'https://t4t-score-desk.grok.me';

// Teach4 Texas (Spring TX). Never use /store/teach-4-texas — that is a different Katy seller.
export const TPT_STORE_URL = 'https://www.teacherspayteachers.com/store/teach4-texas';

export type TptPack = { href: string; label: string };

export const TPT_PRODUCTS = {
  ecr: {
    href: 'https://www.teacherspayteachers.com/Product/STAAR-ECR-Rubric-Posters-Recording-Sheets-RLA-3-EOC-17493531',
    label: 'STAAR ECR rubric posters',
  },
  scr: {
    href: 'https://www.teacherspayteachers.com/Product/STAAR-SCR-Reading-2-pt-Writing-1-pt-Checklists-3-EOC-17493627',
    label: 'STAAR SCR checklists',
  },
  race: {
    href: 'https://www.teacherspayteachers.com/Product/RACE-Constructed-Response-Posters-Daily-Practice-Grades-3-5-17493690',
    label: 'RACE constructed-response posters',
  },
  tia: {
    href: 'https://www.teacherspayteachers.com/Product/TIA-Growth-Evidence-Kit-BOY-MOY-EOY-Conference-Portfolio-17493754',
    label: 'TIA Growth Evidence Kit',
  },
  freeCompanion: {
    href: 'https://www.teacherspayteachers.com/Product/FREE-Score-Desk-Companion-STAAR-Click-Score-One-Pager-17493794',
    label: 'Free Score Desk companion',
  },
  laborDayG3: {
    href: 'https://www.teacherspayteachers.com/Product/Labor-Day-Escape-Room-Grade-3-STAAR-Math-TEKS-34K-34G-35A-17517520',
    label: 'Labor Day Escape Room Grade 3 STAAR Math',
  },
  firstDayG4: {
    href: 'https://www.teacherspayteachers.com/Product/First-Day-of-School-Scavenger-Hunt-Grade-4-STAAR-Math-TEKS-42B-44A-44H-17516930',
    label: 'First Day of School Scavenger Hunt Grade 4 STAAR Math',
  },
  backToSchoolG3: {
    href: 'https://www.teacherspayteachers.com/Product/Back-to-School-Escape-Room-Grade-3-STAAR-Math-TEKS-32A-32C-34A-17506345',
    label: 'Back to School Grade 3 STAAR Math',
  },
  numberVaultG7: {
    href: 'https://www.teacherspayteachers.com/Product/Number-Vault-G7-STAAR-Math-Escape-Room-TEKS-73B-74A-74D-711A-17500215',
    label: 'Number Vault G7',
  },
  archiveVault: {
    href: 'https://www.teacherspayteachers.com/Product/Archive-Vault-English-I-STAAR-EOC-TEKS-E19C-E19D-E18A-Google-Slides-17468013',
    label: 'Archive Vault English I',
  },
  cycleVault: {
    href: 'https://www.teacherspayteachers.com/Product/Cycle-Vault-Biology-STAAR-EOC-Escape-Room-TEKS-B6A-B6C-B6B-Google-Slides-17468482',
    label: 'Cycle Vault Biology',
  },
} as const satisfies Record<string, TptPack>;

export const SCORE_DESK_PACKS: TptPack[] = [
  TPT_PRODUCTS.ecr,
  TPT_PRODUCTS.scr,
  TPT_PRODUCTS.race,
  TPT_PRODUCTS.tia,
  TPT_PRODUCTS.freeCompanion,
];

const TIA_SLUGS = new Set([
  'tia-complete-guide',
  'ttess-observation-tips-tia',
  'tia-portfolio-evidence-guide',
  'staar-scores-tia-designation',
]);

export function tptPacksForSlug(slug: string): TptPack[] {
  if (slug === 'staar-rla-constructed-response') {
    return [TPT_PRODUCTS.ecr, TPT_PRODUCTS.race, TPT_PRODUCTS.freeCompanion];
  }
  if (TIA_SLUGS.has(slug)) {
    return [TPT_PRODUCTS.tia, TPT_PRODUCTS.freeCompanion];
  }
  return [];
}
