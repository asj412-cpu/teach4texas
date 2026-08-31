import { SCORE_DESK_URL, TPT_STORE_URL } from './site-links';

export type TptCategory = 'free' | 'score-desk' | 'vault' | 'classroom';

export type TptListing = {
  id: string;
  href: string;
  title: string;
  description: string;
  /** Listed TPT price, e.g. "FREE" or "$4.99". */
  price: string;
  /** Listed original price when TPT shows a sale strikethrough. */
  originalPrice?: string;
  category: TptCategory;
  featured?: boolean;
};

const TPT = 'https://www.teacherspayteachers.com/Product';

/**
 * Live Teach4 Texas (Spring) listings verified 200 from the store
 * https://www.teacherspayteachers.com/store/teach4-texas.
 * Prices are the listed TPT prices (no sitewide promo-code markdown).
 */
export const TPT_LISTINGS: TptListing[] = [
  {
    id: '17493794',
    href: `${TPT}/FREE-Score-Desk-Companion-STAAR-Click-Score-One-Pager-17493794`,
    title: 'FREE Score Desk Companion | STAAR Click-Score One-Pager',
    description:
      'Free one-pager for click-scoring a STAAR-style stack with Score Desk. No login, no student accounts, nothing is uploaded.',
    price: 'FREE',
    category: 'free',
    featured: true,
  },
  {
    id: '15593331',
    href: `${TPT}/TIA-Quick-Reference-Teacher-Incentive-Allotment-FREE-Guide-for-Texas-Teachers-15593331`,
    title: 'TIA Quick Reference | FREE Guide for Texas Teachers',
    description:
      'Free printable on TIA designation levels, pay ranges, and next steps — one page for Texas teachers.',
    price: 'FREE',
    category: 'free',
  },
  {
    id: '17493531',
    href: `${TPT}/STAAR-ECR-Rubric-Posters-Recording-Sheets-RLA-3-EOC-17493531`,
    title: 'STAAR ECR Rubric Posters + Recording Sheets | RLA 3–EOC',
    description:
      'Student rubric posters and empty recording sheets for Grades 3 through EOC RLA. Organization and Development 0–3, Conventions 0–2.',
    price: '$5.99',
    category: 'score-desk',
    featured: true,
  },
  {
    id: '17493627',
    href: `${TPT}/STAAR-SCR-Reading-2-pt-Writing-1-pt-Checklists-3-EOC-17493627`,
    title: 'STAAR SCR Reading 2-pt & Writing 1-pt Checklists | 3–EOC',
    description:
      'Short constructed-response checklists for Grades 3 through EOC RLA. Reading SCR 0–2 (answer + evidence). Writing SCR 0–1.',
    price: '$4.99',
    category: 'score-desk',
    featured: true,
  },
  {
    id: '17493690',
    href: `${TPT}/RACE-Constructed-Response-Posters-Daily-Practice-Grades-3-5-17493690`,
    title: 'RACE Constructed Response Posters | Daily Practice | Grades 3–5',
    description:
      'Restate, Answer, Cite, and Explain posters plus a 4-in-1 mini set for desks. Daily practice language, not the official STAAR rubric.',
    price: '$3.99',
    category: 'score-desk',
    featured: true,
  },
  {
    id: '17493754',
    href: `${TPT}/TIA-Growth-Evidence-Kit-BOY-MOY-EOY-Conference-Portfolio-17493754`,
    title: 'TIA Growth Evidence Kit | BOY MOY EOY | Conference + Portfolio',
    description:
      '12-page working growth file: BOY, MOY, and EOY class summaries, a conference one-pager, T-TESS teacher-chair notes, and artifact cover slips.',
    price: '$7.99',
    category: 'score-desk',
    featured: true,
  },
  {
    id: '17517520',
    href: `${TPT}/Labor-Day-Escape-Room-Grade-3-STAAR-Math-TEKS-34K-34G-35A-17517520`,
    title: 'Labor Day Escape Room Grade 3 STAAR Math | TEKS 3.4K 3.4G 3.5A',
    description:
      'Grade 3 STAAR math Labor Day escape room. Parade Depot, Helper Station, Weekend Market, Town Picnic. Self-checking Google Slides + printable missions. TEKS 3.4K, 3.4G, 3.5A.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17516930',
    href: `${TPT}/First-Day-of-School-Scavenger-Hunt-Grade-4-STAAR-Math-TEKS-42B-44A-44H-17516930`,
    title: 'First Day of School Scavenger Hunt | Grade 4 STAAR Math | TEKS 4.2B 4.4A 4.4H',
    description:
      'Grade 4 STAAR math scavenger hunt for the first week of school. Word problems, expanded notation, digit value through 1,000,000,000, and STAAR 2.0 items. Not a Number Vault reprint.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17506345',
    href: `${TPT}/Back-to-School-Escape-Room-Grade-3-STAAR-Math-TEKS-32A-32C-34A-17506345`,
    title: 'Back to School Escape Room Grade 3 STAAR Math | TEKS 3.2A 3.2C 3.4A',
    description:
      'Grade 3 STAAR math scavenger/escape for the first week of school. Word problems, expanded notation, rounding to 10 or 100, and STAAR 2.0 items.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17500215',
    href: `${TPT}/Number-Vault-G7-STAAR-Math-Escape-Room-TEKS-73B-74A-74D-711A-17500215`,
    title: 'Number Vault G7 STAAR Math Escape Room | TEKS 7.3B 7.4A 7.4D 7.11A',
    description:
      'Grade 7 STAAR math escape room. Four missions plus a boss lock: integers, rates, percent, and two-step equations. $4.99.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17468013',
    href: `${TPT}/Archive-Vault-English-I-STAAR-EOC-TEKS-E19C-E19D-E18A-Google-Slides-17468013`,
    title: 'Archive Vault English I STAAR EOC | TEKS E1.9C E1.9D E1.8A',
    description:
      'English I STAAR EOC escape room. Revising and editing drafts plus reading items on original literary and informational selections.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17468482',
    href: `${TPT}/Cycle-Vault-Biology-STAAR-EOC-Escape-Room-TEKS-B6A-B6C-B6B-Google-Slides-17468482`,
    title: 'Cycle Vault Biology STAAR EOC Escape Room | TEKS B.6A B.6C B.6B',
    description:
      'Biology STAAR EOC escape room. Cell cycle, mitosis, DNA replication, and how disruption of the cycle relates to cancer.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17478715',
    href: `${TPT}/Number-Vault-K-Math-Escape-Room-TEKS-K2I-K3A-K2G-17478715`,
    title: 'Number Vault K Math Escape Room | TEKS K.2I K.3A K.2G',
    description:
      'Kindergarten math escape room. Word problems, pictures and tables of sets, and Select TWO. Kindergarten math, not STAAR.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17478343',
    href: `${TPT}/Number-Vault-G1-Math-Escape-Room-TEKS-12B-13B-15F-17478343`,
    title: 'Number Vault G1 Math Escape Room | TEKS 1.2B 1.3B 1.5F',
    description:
      'Grade 1 math escape room. Word problems, tables, Select TWO, number sentences with a letter, and strip diagrams.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17477971',
    href: `${TPT}/Number-Vault-G2-Math-Escape-Room-TEKS-22A-24C-27C-17477971`,
    title: 'Number Vault G2 Math Escape Room | TEKS 2.2A 2.4C 2.7C',
    description:
      'Grade 2 math escape room. Word problems, tables, Select TWO, number sentences with a letter, and strip diagrams.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17460089',
    href: `${TPT}/Number-Vault-Grade-3-STAAR-Math-Escape-Room-TEKS-34K-35B-34A-Google-Slides-17460089`,
    title: 'Number Vault Grade 3 STAAR Math Escape Room | TEKS 3.4K 3.5B 3.4A',
    description:
      'Grade 3 STAAR math escape room. Word problems, multi-select, arrays, and strip diagrams. Self-checking Google Slides.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17455809',
    href: `${TPT}/Number-Vault-Grade-4-STAAR-Math-Escape-Room-TEKS-44H-45A-42B-Google-Slides-17455809`,
    title: 'Number Vault Grade 4 STAAR Math Escape Room | TEKS 4.4H 4.5A 4.2B',
    description:
      'Grade 4 STAAR math escape room. Word problems, multi-select, equations with a letter for the unknown, and strip diagrams.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17460004',
    href: `${TPT}/Number-Vault-Grade-5-STAAR-Math-Escape-Room-TEKS-53E-54B-52A-Google-Slides-17460004`,
    title: 'Number Vault Grade 5 STAAR Math Escape Room | TEKS 5.3E 5.4B 5.2A',
    description:
      'Grade 5 STAAR math escape room. Word problems, multi-select, equations with a letter, and decimal place value through thousandths.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17460207',
    href: `${TPT}/Number-Vault-Grade-6-STAAR-Math-Escape-Room-TEKS-63E-65B-610AGoogle-Slides-17460207`,
    title: 'Number Vault Grade 6 STAAR Math Escape Room | TEKS 6.3E 6.5B 6.10A',
    description:
      'Grade 6 STAAR math escape room. Rationals, ratios, percents, and one-step equations. Self-checking Google Slides.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17476508',
    href: `${TPT}/History-Vault-Grade-8-STAAR-US-History-Escape-Room-TEKS-82A-83A-84A-84C-17476508`,
    title: 'History Vault Grade 8 STAAR US History | TEKS 8.2A 8.3A 8.4A 8.4C',
    description:
      'Grade 8 US History STAAR escape room for Colonies through Revolution. STAAR 2.0 multi-select and multipart items.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17467685',
    href: `${TPT}/Science-Vault-Grade-8-STAAR-Escape-Room-TEKS-86E-87A-87B-Google-Slides-17467685`,
    title: 'Science Vault Grade 8 STAAR Escape Room | TEKS 8.6E 8.7A 8.7B',
    description:
      'Grade 8 Science STAAR escape room. Conservation of mass, Newton’s Second Law, and Newton’s three laws in systems.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17467264',
    href: `${TPT}/Equation-Vault-Algebra-I-STAAR-EOC-TEKS-A5A-A8A-A9C-Google-Slides-17467264`,
    title: 'Equation Vault Algebra I STAAR EOC | TEKS A.5A A.8A A.9C',
    description:
      'Algebra I STAAR EOC escape room. Linear equations, exponential functions, and quadratics with real solutions.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '15602263',
    href: `${TPT}/TIA-Portfolio-Guide-Evidence-Kit-Texas-Teacher-Incentive-Allotment-Roadmap-15602263`,
    title: 'TIA Portfolio Guide & Evidence Kit | Teacher Incentive Allotment Roadmap',
    description:
      'Editable guide to building a TIA portfolio for Recognized, Exemplary, or Master designation.',
    price: '$2.99',
    category: 'classroom',
  },
  {
    id: '15593390',
    href: `${TPT}/T-TESS-Observation-Prep-Kit-Score-Distinguished-PrePost-Observation-Templat-15593390`,
    title: 'T-TESS Observation Prep Kit | Score Distinguished',
    description:
      'Domain-by-domain Distinguished indicators, pre/post observation templates, evidence log, and self-scoring rubric.',
    price: '$6.99',
    category: 'classroom',
  },
  {
    id: '15602401',
    href: `${TPT}/Student-Growth-Tracking-Template-Data-Tracker-Google-Sheets-STAAR-15602401`,
    title: 'Student Growth Tracking Template | Google Sheets | STAAR',
    description:
      'Google Sheets template that tracks student growth across assessments and flags data for PLC and TIA documentation.',
    price: '$5.99',
    category: 'classroom',
  },
  {
    id: '15602134',
    href: `${TPT}/Fun-STAAR-Aligned-Math-Lesson-Plans-Grades-3-5-Hands-On-Activities-TEKS-15602134`,
    title: 'STAAR-Aligned Math Lesson Plans | Grades 3–5 | Hands-On Activities',
    description:
      'Five complete hands-on math lessons with STAAR 2.0 question types for grades 3, 4, and 5.',
    price: '$9.99',
    category: 'classroom',
  },
  {
    id: '15602165',
    href: `${TPT}/Fun-STAAR-Aligned-RLA-Lesson-Plans-Grades-3-5-Reading-Writing-Activities-15602165`,
    title: 'STAAR-Aligned RLA Lesson Plans | Grades 3–5 | Reading & Writing',
    description:
      'Five reading and writing lessons that embed STAAR 2.0 question types for grades 3–5.',
    price: '$9.99',
    category: 'classroom',
  },
  {
    id: '15602216',
    href: `${TPT}/Fun-STAAR-Aligned-Science-Lesson-Plans-Grades-5-8-Hands-On-Labs-TEKS-15602216`,
    title: 'STAAR-Aligned Science Lesson Plans | Grades 5 & 8 | Hands-On Labs',
    description:
      'Five hands-on science lesson plans for 5th and 8th grade, including labs and review activities aligned to TEKS.',
    price: '$9.99',
    category: 'classroom',
  },
  {
    id: '15609299',
    href: `${TPT}/STAAR-Math-Task-Cards-Grade-3-32-TEKS-Aligned-Questions-with-Visuals-15609299`,
    title: 'STAAR Math Task Cards Grade 3 | 32 TEKS-Aligned Questions',
    description:
      '32 Grade 3 math task cards covering major TEKS with STAAR 2.0-style items. About half include visual aids.',
    price: '$8.99',
    category: 'classroom',
  },
  {
    id: '15609323',
    href: `${TPT}/STAAR-Math-Task-Cards-Grade-4-32-TEKS-Aligned-Questions-with-Visuals-15609323`,
    title: 'STAAR Math Task Cards Grade 4 | 32 TEKS-Aligned Questions',
    description:
      '32 Grade 4 math task cards covering TEKS 4.2–4.9 with STAAR 2.0-style items. About half include visual aids.',
    price: '$8.99',
    category: 'classroom',
  },
  {
    id: '17470369',
    href: `${TPT}/STAAR-Math-Game-Show-Grade-3-TEKS-Review-Live-Classroom-No-Prep-17470369`,
    title: 'STAAR Math Game Show Grade 3 | Live Classroom | No Prep',
    description:
      'Hosted live Grade 3 math game show. Redeem the access code, project the 5×5 board, students join with a room code. 25 original items.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15601955',
    href: `${TPT}/Summer-STAAR-Review-Game-Show-Math-RLA-Jeopardy-Grades-3-5-15601955`,
    title: 'Summer STAAR Review Game Show: Math & RLA Jeopardy (Grades 3–5)',
    description:
      'Interactive Jeopardy-style game show covering Math and RLA. Three complete boards (one per grade) with 150 questions.',
    price: '$7.99',
    category: 'classroom',
  },
  {
    id: '15950382',
    href: `${TPT}/Grammar-Escape-Room-STAAR-Test-Prep-Editing-Revising-15950382`,
    title: 'Grammar Escape Room | STAAR Test Prep Editing & Revising',
    description:
      'Digital escape room with five STAAR-style editing and revising missions on interactive Google Slides. Grades 3–5.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602049',
    href: `${TPT}/Grammar-Escape-Room-Parts-of-Speech-3rd-Grade-Digital-Activity-wGoog-Slide-15602049`,
    title: 'Grammar Escape Room | Parts of Speech | 3rd Grade',
    description:
      'Interactive digital escape room: five planets of parts-of-speech puzzles on Google Slides for 3rd grade.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602066',
    href: `${TPT}/Grammar-Escape-Room-Subject-Verb-Agreement-Pronouns-Commas-4th-Grade-15602066`,
    title: 'Grammar Escape Room | Subject-Verb Agreement, Pronouns & Commas | 4th Grade',
    description:
      'Interactive digital grammar mystery. Five crime-scene challenges covering agreement, pronouns, and commas.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602085',
    href: `${TPT}/Grammar-Escape-Room-Conjunctions-Verb-Tenses-Prepositional-Phrases-5th-15602085`,
    title: 'Grammar Escape Room | Conjunctions, Verb Tenses & Prepositional Phrases | 5th',
    description:
      'Interactive digital escape room with five grammar challenges on conjunctions, verb tenses, and prepositional phrases.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602107',
    href: `${TPT}/Escape-Room-4-The-Haunted-Grammar-House-15602107`,
    title: 'Escape Room 4: The Haunted Grammar House',
    description:
      'Grammar escape room for grades 3–5 with three difficulty levels, from capitalization through advanced editing.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602003',
    href: `${TPT}/Spring-Testing-Motivation-Kit-STAAR-Pep-Rally-Pack-Grades-3-5-15602003`,
    title: 'Spring Testing Motivation Kit: STAAR Pep Rally Pack (Grades 3–5)',
    description:
      'Door decorations, motivational posters, bookmarks, and testing-tip cards to build confidence before STAAR.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15601716',
    href: `${TPT}/Black-History-Month-Texas-Trailblazers-Reading-Passages-Activities-Grades-3--15601716`,
    title: 'Black History Month: Texas Trailblazers Reading Passages (Grades 3–5)',
    description:
      'Five original nonfiction passages about Black trailblazers from Texas, with STAAR-style questions and writing prompts.',
    price: '$5.99',
    category: 'classroom',
  },
  {
    id: '15601750',
    href: `${TPT}/Womens-History-Month-STEM-Challenge-Cards-Grades-3-5-15601750`,
    title: "Women's History Month STEM Challenge Cards (Grades 3–5)",
    description:
      'Ten STEM challenge cards, each with a short biography of a woman in STEM and a hands-on mini-challenge.',
    price: '$5.99',
    category: 'classroom',
  },
  {
    id: '15601786',
    href: `${TPT}/St-Patricks-Day-Math-Mystery-The-Case-of-the-Missing-Gold-Grades-3-5-15601786`,
    title: "St. Patrick's Day Math Mystery: The Case of the Missing Gold (Grades 3–5)",
    description:
      'Escape-room style math mystery with six stations and three difficulty levels for grades 3, 4, and 5.',
    price: '$5.99',
    category: 'classroom',
  },
  {
    id: '15601876',
    href: `${TPT}/Earth-Day-Science-Investigation-Hands-On-Ecosystem-Conservation-Activities-G-15601876`,
    title: 'Earth Day Science Investigation: Ecosystems & Conservation (Grades 3–5)',
    description:
      'Five TEKS-aligned science investigations on ecosystems, recycling, water conservation, and human impact.',
    price: '$5.99',
    category: 'classroom',
  },
  {
    id: '15601904',
    href: `${TPT}/Cinco-de-Mayo-Cultural-Reading-Math-Fiesta-Grades-3-5-15601904`,
    title: 'Cinco de Mayo Cultural Reading & Math Fiesta (Grades 3–5)',
    description:
      'Original reading passages about Mexican-American culture in Texas plus themed math word problems.',
    price: '$5.99',
    category: 'classroom',
  },
  {
    id: '15601830',
    href: `${TPT}/Spring-Writing-Prompts-Journal-20-Creative-Informational-Prompts-Grades-3--15601830`,
    title: 'Spring Writing Prompts & Journal: 20 Creative & Informational Prompts',
    description:
      '20 spring writing prompts for grades 3–5, each with a prompt page, graphic organizer, and lined writing page.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15601925',
    href: `${TPT}/End-of-Year-Memory-Book-Reflection-Journal-Grades-3-5-15601925`,
    title: 'End of Year Memory Book & Reflection Journal (Grades 3–5)',
    description:
      'Memory book pages, academic reflection, writing prompts, and autograph pages for the end of the year.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15601975',
    href: `${TPT}/Teacher-Appreciation-Week-Cards-Activities-Grades-3-5-15601975`,
    title: 'Teacher Appreciation Week Cards & Activities (Grades 3–5)',
    description:
      'Printable card templates, writing prompts, and a collaborative class-book activity for Teacher Appreciation Week.',
    price: '$3.99',
    category: 'classroom',
  },
];

export const SCORE_DESK_APP = {
  href: '/tools',
  title: 'Score Desk',
  description:
    'Score a STAAR ECR or SCR stack locally. Build a TEKS rubric, print the student checklist, and keep a BOY→EOY growth snapshot. Nothing is uploaded.',
  cta: 'Open Score Desk',
  externalHref: SCORE_DESK_URL,
};

export const listingsByCategory = (category: TptCategory) =>
  TPT_LISTINGS.filter((item) => item.category === category);

export const featuredListings = () => TPT_LISTINGS.filter((item) => item.featured);

export { TPT_STORE_URL };
