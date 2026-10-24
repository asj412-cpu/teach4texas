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
  /** Real product preview screenshot (site path), when we have one. Never a mockup. */
  image?: string;
  featured?: boolean;
  /** Live Pinterest pin URL for this listing; Pin It links here instead of the create-pin button. */
  pin?: string;
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
    image: '/images/covers/tpt-17493794-cover-f3cd87d8.jpg',
    title: 'FREE Score Desk Companion | STAAR Click-Score One-Pager',
    // Free download on TPT, not for sale.
    description:
      'Free download: a one-pager for click-scoring a STAAR-style stack with Score Desk. No login, no student accounts, nothing is uploaded.',
    price: 'FREE',
    category: 'free',
    featured: true,
  },
  {
    id: '15593331',
    href: `${TPT}/TIA-Quick-Reference-Texas-Teacher-Incentive-Allotment-FREE-2026-27-Guide-15593331`,
    image: '/images/covers/tpt-15593331-cover-7e9d17b9.jpg',
    title: 'TIA Quick Reference | Texas Teacher Incentive Allotment | FREE 2026-27 Guide',
    description:
      'Free printable on TIA designation levels, pay ranges, and next steps — one page for Texas teachers.',
    price: 'FREE',
    category: 'free',
  },
  {
    id: '17493531',
    href: `${TPT}/STAAR-ECR-Rubric-Posters-Recording-Sheets-RLA-3-EOC-17493531`,
    image: '/images/covers/tpt-17493531-cover-db62d5bd.jpg',
    title: 'STAAR ECR Rubric Posters + Recording Sheets | RLA 3-EOC',
    description:
      'Student rubric posters and empty recording sheets for Grades 3 through EOC RLA. Organization and Development 0–3, Conventions 0–2.',
    price: '$5.99',
    category: 'score-desk',
    featured: true,
  },
  {
    id: '17493627',
    href: `${TPT}/STAAR-SCR-Reading-2-pt-Writing-1-pt-Checklists-3-EOC-17493627`,
    image: '/images/covers/tpt-17493627-cover-a2bd0c99.jpg',
    title: 'STAAR SCR Reading 2-pt & Writing 1-pt Checklists | 3-EOC',
    description:
      'Short constructed-response checklists for Grades 3 through EOC RLA. Reading SCR 0–2 (answer + evidence). Writing SCR 0–1.',
    price: '$4.99',
    category: 'score-desk',
    featured: true,
  },
  {
    id: '17493690',
    href: `${TPT}/RACE-Constructed-Response-Posters-Daily-Practice-Grades-3-5-17493690`,
    image: '/images/covers/tpt-17493690-cover-fa91c680.jpg',
    title: 'RACE Constructed Response Posters | Daily Practice | Grades 3-5',
    description:
      'Restate, Answer, Cite, and Explain posters plus a 4-in-1 mini set for desks. Daily practice language, not the official STAAR rubric.',
    price: '$3.99',
    category: 'score-desk',
    featured: true,
  },
  {
    id: '17696158',
    href: `${TPT}/Texas-Grade-3-Morning-Work-4-Weeks-TEKS-Warmups-Print-17696158`,
    image: '/images/covers/tpt-17696158-cover-ea862fb5.jpg',
    title: 'Texas Grade 3 Morning Work — 4 Weeks TEKS Warmups (Print)',
    description:
      'TEKS-tagged Grade 3 Math + RLA morning warmups, 4 weeks / 16 days, Print (TPT Easel digital option). Cadet Corps pages labeled with Texas TEKS (not Common Core). Not an escape room.',
    price: '$4.99',
    category: 'classroom',
    featured: true,
  },
  {
    id: '17751292',
    href: `${TPT}/Texas-Grade-4-Morning-Work-4-Weeks-TEKS-Warmups-Print-Easel-17751292`,
    image: '/images/morning-work/tpt-17751292-cover.jpg',
    title: 'Texas Grade 4 Morning Work — 4 Weeks TEKS Warmups (Print + Easel)',
    description:
      'TEKS-tagged Grade 4 Math + RLA morning warmups, 4 weeks / 16 days, Print + Easel. Cadet Corps pages labeled with Texas TEKS (not Common Core). Not an escape room.',
    price: '$4.99',
    category: 'classroom',
    featured: true,
  },
  {
    id: '17812227',
    href: `${TPT}/Halloween-Escape-Room-Grade-4-STAAR-Math-TEKS-44D-44E-45A-17812227`,
    image: '/images/seasonal/tpt-17812227-cover.jpg',
    title: 'Halloween Escape Room | Grade 4 STAAR Math | TEKS 4.4D 4.4E 4.5A',
    description:
      'Grade 4 STAAR math Halloween escape room. Missions for TEKS 4.4D, 4.4E, 4.5A (multiply up to 4×1 and 2×2, divide up to 4-digit by 1-digit, represent multi-step problems with strip diagrams/equations). Self-checking Cadet Corps Google Slides + printable missions. Not a color-by-number worksheet pack.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17850252',
    href: `${TPT}/Thanksgiving-Escape-Room-Grade-4-STAAR-Math-TEKS-43E-44H-48C-17850252`,
    image: '/images/covers/tpt-17850252-cover-a5937c03.jpg',
    title: 'Thanksgiving Escape Room | Grade 4 STAAR Math | TEKS 4.3E 4.4H 4.8C',
    description:
      'Grade 4 STAAR math Thanksgiving escape room. 20 STAAR 2.0-style word problems for TEKS 4.3E, 4.4H, 4.8C (add/subtract fractions with equal denominators, divide and interpret remainders, measurement problems with time, liquid volume, mass, and money). 4 feast scenes + Gratitude Gate boss. Self-checking Cadet Corps Google Slides + printable missions. Not a bare-facts worksheet.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '18020793',
    href: `${TPT}/Christmas-Escape-Room-Grade-4-STAAR-Math-Compare-Fractions-Area-Data-18020793`,
    image: '/images/covers/tpt-18020793-cover-297915ed.jpg',
    pin: 'https://www.pinterest.com/pin/1147503180094957291/',
    title: 'Christmas Escape Room Grade 4 STAAR Math | Compare Fractions, Area, Data',
    description:
      'Grade 4 STAAR math Christmas escape room. 20 STAAR 2.0-style items for TEKS 4.3D, 4.5D, 4.9A (compare fractions with different numerators and denominators, perimeter and area of rectangles, frequency tables, dot plots, and stem-and-leaf plots). 4 workshop scenes + Gift Gate boss. Self-checking Cadet Corps Google Slides + printable missions. Not a scavenger hunt.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '18041613',
    href: `${TPT}/Holiday-Escape-Room-Bundle-Grade-4-STAAR-Math-Halloween-Thanksgiving-Christmas-18041613`,
    image: '/images/covers/tpt-18041613-cover-a7d7e9b6.jpg',
    title: 'Holiday Escape Room Bundle Grade 4 STAAR Math | Halloween Thanksgiving Christmas',
    description:
      'Grade 4 STAAR math bundle of three escape rooms: Halloween (TEKS 4.4D, 4.4E, 4.5A), Thanksgiving (TEKS 4.3E, 4.4H, 4.8C), and Christmas (TEKS 4.3D, 4.5D, 4.9A). 20 STAAR 2.0-style items per room, 60 in all. Self-checking Cadet Corps Google Slides + printable missions. Bought one at a time the three rooms are $14.97.',
    price: '$11.99',
    originalPrice: '$14.97',
    category: 'vault',
    featured: true,
  },
  {
    id: '17547396',
    href: `${TPT}/Hispanic-Heritage-Scavenger-Hunt-Grade-3-STAAR-Math-TEKS-34A-34F-35E-17547396`,
    image: '/images/covers/tpt-17547396-cover-c1a0f2bb.jpg',
    title: 'Hispanic Heritage Scavenger Hunt | Grade 3 STAAR Math | TEKS 3.4A 3.4F 3.5E',
    description:
      'Grade 3 STAAR math scavenger hunt for Hispanic Heritage Month. Stations for TEKS 3.4A, 3.4F, 3.5E (addition/subtraction within 1,000, multiplication facts, number-pair tables). Self-checking Cadet Corps Google Slides + printable missions. Not a color-by-code worksheet pack.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17547135',
    href: `${TPT}/Brain-Teasers-Math-Logic-Lab-Grade-3-Money-Rounding-Compare-TEKS-34C-34B-32D-17547135`,
    image: '/images/covers/tpt-17547135-cover-e4c6c4e7.jpg',
    title: 'Brain Teasers Math Logic Lab Grade 3 Money Rounding Compare TEKS 3.4C 3.4B 3.2D',
    description:
      'Grade 3 math logic brain teasers covering money (TEKS 3.4C), rounding (3.4B), and comparing numbers (3.2D).',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17538014',
    href: `${TPT}/Crack-the-Code-Math-Mystery-Grade-3-Multiplication-Division-TEKS-34E-34H-35B-17538014`,
    image: '/images/covers/tpt-17538014-cover-0a00a548.jpg',
    title: 'Crack the Code Math Mystery Grade 3 Multiplication Division TEKS 3.4E 3.4H 3.5B',
    description:
      'Grade 3 STAAR math crack-the-code mystery. Multiplication facts, arrays, and strip-diagram equations across Cipher Lab, Number Grid, Array Alley, Clue Desk, and Final Code. Not an escape room reprint. Not a seasonal holiday pack.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17517520',
    href: `${TPT}/Labor-Day-Math-Escape-Room-Grade-3-STAAR-Review-TEKS-34K-34G-35A-17517520`,
    image: '/images/covers/tpt-17517520-cover-24e93493.jpg',
    title: 'Labor Day Math Escape Room | Grade 3 STAAR Review | TEKS 3.4K 3.4G 3.5A',
    description:
      'Grade 3 STAAR math Labor Day escape room. Parade Depot, Helper Station, Weekend Market, Town Picnic. Self-checking Google Slides + printable missions. TEKS 3.4K, 3.4G, 3.5A.',
    price: '$3.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17516930',
    href: `${TPT}/First-Day-of-School-Scavenger-Hunt-Grade-4-STAAR-Math-TEKS-42B-44A-44H-17516930`,
    image: '/images/covers/tpt-17516930-cover-32fea79f.jpg',
    title: 'First Day of School Scavenger Hunt | Grade 4 STAAR Math | TEKS 4.2B 4.4A 4.4H',
    description:
      'Grade 4 STAAR math scavenger hunt for the first week of school. Word problems, expanded notation, digit value through 1,000,000,000, and STAAR 2.0 items.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17506345',
    href: `${TPT}/Back-to-School-Escape-Room-Grade-3-Math-Place-Value-Rounding-TEKS-32A-32C-34A-17506345`,
    image: '/images/covers/tpt-17506345-cover-7274b485.jpg',
    title: 'Back to School Escape Room Grade 3 Math Place Value Rounding TEKS 3.2A 3.2C 3.4A',
    description:
      'Grade 3 STAAR math escape room for the first week of school. Word problems, expanded notation, rounding to 10 or 100, and STAAR 2.0 items.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17500215',
    href: `${TPT}/Number-Vault-G7-STAAR-Math-Escape-Room-TEKS-73B-74A-74D-711A-17500215`,
    image: '/images/escape-rooms/tpt-17500215-cover.jpg',
    title: 'Number Vault G7 STAAR Math Escape Room | TEKS 7.3B 7.4A 7.4D 7.11A',
    description:
      'Grade 7 STAAR math escape room. Four missions plus a boss lock: integers, rates, percent, and two-step equations.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17468013',
    href: `${TPT}/Archive-Vault-English-I-STAAR-EOC-TEKS-E19C-E19D-E18A-Google-Slides-17468013`,
    image: '/images/covers/tpt-17468013-cover-278ad978.jpg',
    title: 'Archive Vault English I STAAR EOC | TEKS E1.9C E1.9D E1.8A | Google Slides',
    description:
      'English I STAAR EOC escape room. Revising and editing drafts plus reading items on original literary and informational selections.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17468482',
    href: `${TPT}/Cycle-Vault-Biology-STAAR-EOC-Escape-Room-TEKS-B6A-B6C-B6B-Google-Slides-17468482`,
    image: '/images/covers/tpt-17468482-cover-05323600.jpg',
    title: 'Cycle Vault Biology STAAR EOC Escape Room | TEKS B.6A B.6C B.6B | Google Slides',
    description:
      'Biology STAAR EOC escape room. Cell cycle, mitosis, DNA replication, and how disruption of the cycle relates to cancer.',
    price: '$4.99',
    category: 'vault',
    featured: true,
  },
  {
    id: '17478715',
    href: `${TPT}/Number-Vault-K-Math-Escape-Room-TEKS-K2I-K3A-K2G-17478715`,
    image: '/images/covers/tpt-17478715-cover-b4c7d7ac.jpg',
    title: 'Number Vault K Math Escape Room | TEKS K.2I K.3A K.2G',
    description:
      'Kindergarten math escape room. Word problems, pictures and tables of sets, and Select TWO. Kindergarten math, not STAAR.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17478343',
    href: `${TPT}/Number-Vault-G1-Math-Escape-Room-TEKS-12B-13B-15F-17478343`,
    image: '/images/escape-rooms/tpt-17478343-cover.jpg',
    title: 'Number Vault G1 Math Escape Room | TEKS 1.2B 1.3B 1.5F',
    description:
      'Grade 1 math escape room. Word problems, tables, Select TWO, number sentences with a letter, and strip diagrams.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17477971',
    href: `${TPT}/Number-Vault-G2-Math-Escape-Room-TEKS-22A-24C-27C-17477971`,
    image: '/images/escape-rooms/tpt-17477971-cover.jpg',
    title: 'Number Vault G2 Math Escape Room | TEKS 2.2A 2.4C 2.7C',
    description:
      'Grade 2 math escape room. Word problems, tables, Select TWO, number sentences with a letter, and strip diagrams.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17460089',
    href: `${TPT}/Number-Vault-Grade-3-STAAR-Math-Escape-Room-TEKS-34K-35B-34A-Google-Slides-17460089`,
    image: '/images/covers/tpt-17460089-cover-4c86edbc.jpg',
    title: 'Number Vault Grade 3 STAAR Math Escape Room | TEKS 3.4K 3.5B 3.4A |Google Slides',
    description:
      'Grade 3 STAAR math escape room. Word problems, multiple-choice, arrays, and strip diagrams. Self-checking Google Slides.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17455809',
    href: `${TPT}/Number-Vault-Grade-4-STAAR-Math-Escape-Room-TEKS-44H-45A-42B-Google-Slides-17455809`,
    image: '/images/escape-rooms/tpt-17455809-cover.jpg',
    title: 'Number Vault Grade 4 STAAR Math Escape Room | TEKS 4.4H 4.5A 4.2B |Google Slides',
    description:
      'Grade 4 STAAR math escape room. Word problems, multiple-choice, equations with a letter for the unknown, and strip diagrams.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17460004',
    href: `${TPT}/Number-Vault-Grade-5-STAAR-Math-Escape-Room-TEKS-53E-54B-52A-Google-Slides-17460004`,
    image: '/images/covers/tpt-17460004-cover-ba8ce502.jpg',
    title: 'Number Vault Grade 5 STAAR Math Escape Room | TEKS 5.3E 5.4B 5.2A |Google Slides',
    description:
      'Grade 5 STAAR math escape room. Word problems, multiple-choice, equations with a letter, and decimal place value through thousandths.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17460207',
    href: `${TPT}/Number-Vault-Grade-6-STAAR-Math-Escape-Room-TEKS-63E-65B-610AGoogle-Slides-17460207`,
    image: '/images/covers/tpt-17460207-cover-cfc4297e.jpg',
    title: 'Number Vault Grade 6 STAAR Math Escape Room | TEKS 6.3E 6.5B 6.10A|Google Slides',
    description:
      'Grade 6 STAAR math escape room. Rationals, ratios, percents, and one-step equations. Self-checking Google Slides.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17476508',
    href: `${TPT}/History-Vault-Grade-8-STAAR-US-History-Escape-Room-TEKS-82A-83A-84A-84C-17476508`,
    image: '/images/covers/tpt-17476508-cover-e231b61b.jpg',
    title: 'History Vault Grade 8 STAAR US History Escape Room | TEKS 8.2A 8.3A 8.4A 8.4C',
    description:
      'Grade 8 US History STAAR escape room for Colonies through Revolution. STAAR 2.0 multi-select and multipart items.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17467685',
    href: `${TPT}/Science-Vault-Grade-8-STAAR-Escape-Room-TEKS-86E-87A-87B-Google-Slides-17467685`,
    image: '/images/covers/tpt-17467685-cover-e69ab085.jpg',
    title: 'Science Vault Grade 8 STAAR Escape Room | TEKS 8.6E 8.7A 8.7B | Google Slides',
    description:
      'Grade 8 Science STAAR escape room. Conservation of mass, Newton’s Second Law, and Newton’s three laws in systems.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '17467264',
    href: `${TPT}/Equation-Vault-Algebra-I-STAAR-EOC-TEKS-A5A-A8A-A9C-Google-Slides-17467264`,
    image: '/images/covers/tpt-17467264-cover-7b19e0f9.jpg',
    title: 'Equation Vault Algebra I STAAR EOC | TEKS A.5A A.8A A.9C | Google Slides',
    description:
      'Algebra I STAAR EOC escape room. Linear equations, exponential functions, and quadratics with real solutions.',
    price: '$4.99',
    category: 'vault',
  },
  {
    id: '15602263',
    href: `${TPT}/TIA-Portfolio-Guide-Texas-Teacher-Incentive-Allotment-Roadmap-2026-27-15602263`,
    image: '/images/covers/tpt-15602263-cover-b79950eb.jpg',
    title: 'TIA Portfolio Guide | Texas Teacher Incentive Allotment Roadmap | 2026-27',
    description:
      'Editable guide to building a TIA portfolio for Recognized, Exemplary, or Master designation.',
    price: '$2.99',
    category: 'score-desk',
    featured: true,
  },
  {
    id: '15593390',
    href: `${TPT}/T-TESS-Observation-Prep-Kit-Plan-for-Distinguished-PrePost-Templates-15593390`,
    image: '/images/covers/tpt-15593390-cover-394bf9fc.jpg',
    title: 'T-TESS Observation Prep Kit | Plan for Distinguished | Pre/Post Templates',
    description:
      'Domain-by-domain Distinguished indicators, pre/post observation templates, evidence log, and self-scoring rubric.',
    price: '$6.99',
    category: 'classroom',
  },
  {
    id: '15602401',
    href: `${TPT}/Student-Growth-Tracker-STAAR-Readiness-Data-Dashboard-Google-Sheets-15602401`,
    image: '/images/covers/tpt-15602401-cover-1e61f8fb.jpg',
    title: 'Student Growth Tracker | STAAR Readiness Data Dashboard | Google Sheets',
    description:
      'Google Sheets template that tracks student growth across assessments and flags data for PLC and TIA documentation.',
    price: '$5.99',
    category: 'classroom',
  },
  {
    id: '15602134',
    href: `${TPT}/STAAR-Math-Lesson-Plans-Grades-3-5-Hands-On-TEKS-Lessons-Google-Slides-15602134`,
    image: '/images/covers/tpt-15602134-cover-82f75267.jpg',
    title: 'STAAR Math Lesson Plans Grades 3-5 | Hands-On TEKS Lessons + Google Slides',
    description:
      'Five complete hands-on math lessons with STAAR 2.0 question types for grades 3, 4, and 5.',
    price: '$9.99',
    category: 'classroom',
  },
  {
    id: '15602165',
    href: `${TPT}/Fun-STAAR-Aligned-RLA-Lesson-Plans-Grades-3-5-Reading-Writing-Activities-15602165`,
    image: '/images/covers/tpt-15602165-cover-a69b3ea2.jpg',
    title: 'Fun STAAR-Aligned RLA Lesson Plans Grades 3-5 | Reading & Writing Activities',
    description:
      'Five reading and writing lessons that embed STAAR 2.0 question types for grades 3–5.',
    price: '$9.99',
    category: 'classroom',
  },
  {
    id: '15602216',
    href: `${TPT}/STAAR-Science-Lesson-Plans-Grades-5-8-Hands-On-Labs-Current-TEKS-15602216`,
    image: '/images/covers/tpt-15602216-cover-c8e3d238.jpg',
    title: 'STAAR Science Lesson Plans Grades 5 & 8 | Hands-On Labs | Current TEKS',
    description:
      'Five hands-on science lesson plans for 5th and 8th grade, including labs and review activities aligned to TEKS.',
    price: '$9.99',
    category: 'classroom',
  },
  {
    id: '15609299',
    href: `${TPT}/STAAR-Math-Task-Cards-Grade-3-32-TEKS-Aligned-Questions-with-Visuals-15609299`,
    image: '/images/escape-rooms/tpt-15609299-cover.jpg',
    title: 'STAAR Math Task Cards Grade 3 | 32 TEKS-Aligned Questions with Visuals',
    description:
      '32 Grade 3 math task cards covering major TEKS with STAAR 2.0-style items. About half include visual aids.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15609323',
    href: `${TPT}/STAAR-Math-Task-Cards-Grade-4-32-TEKS-Aligned-Questions-with-Visuals-15609323`,
    image: '/images/covers/tpt-15609323-cover-ab7c6039.jpg',
    title: 'STAAR Math Task Cards Grade 4 | 32 TEKS-Aligned Questions with Visuals',
    description:
      '32 Grade 4 math task cards covering TEKS 4.2–4.9 with STAAR 2.0-style items. About half include visual aids.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '17470369',
    href: `${TPT}/STAAR-Math-Game-Show-Grade-3-TEKS-Review-Live-Classroom-No-Prep-17470369`,
    image: '/images/covers/tpt-17470369-cover-1bce1e54.jpg',
    title: 'STAAR Math Game Show Grade 3 TEKS Review Live Classroom | No Prep',
    description:
      'Hosted live Grade 3 math game show. Redeem the access code, project the 5×5 board, students join with a room code. 25 original items and two Bonus Wagers.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15601955',
    href: `${TPT}/Summer-STAAR-Review-Game-Show-Style-Math-RLA-Grades-3-5-15601955`,
    title: 'Summer STAAR Review Game Show Style: Math & RLA (Grades 3-5)',
    description:
      'Interactive game-show-style review covering Math and RLA. Three complete boards (one per grade) with 150 questions.',
    price: '$7.99',
    category: 'classroom',
  },
  {
    id: '15950382',
    href: `${TPT}/STAAR-Grammar-Escape-Room-Editing-Revising-Grades-3-5-Google-Slides-15950382`,
    image: '/images/covers/tpt-15950382-cover-d75ce9c9.jpg',
    title: 'STAAR Grammar Escape Room | Editing & Revising | Grades 3-5 | Google Slides',
    description:
      'Digital escape room with five STAAR-style editing and revising missions on interactive Google Slides. Grades 3–5.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602049',
    href: `${TPT}/Grammar-Escape-Room-Parts-of-Speech-3rd-Grade-Digital-Google-Slides-Activity-15602049`,
    image: '/images/covers/tpt-15602049-cover-38736932.jpg',
    title: 'Grammar Escape Room | Parts of Speech | 3rd Grade Digital Google Slides Activity',
    description:
      'Interactive digital escape room: five planets of parts-of-speech puzzles on Google Slides for 3rd grade.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602066',
    href: `${TPT}/Grammar-Escape-Room-Subject-Verb-Agreement-Pronouns-Commas-4th-Grade-15602066`,
    image: '/images/covers/tpt-15602066-cover-8d9dff6d.jpg',
    title: 'Grammar Escape Room | Subject-Verb Agreement, Pronouns & Commas | 4th Grade',
    description:
      'Interactive digital grammar mystery. Five crime-scene challenges covering agreement, pronouns, and commas.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602085',
    href: `${TPT}/Grammar-Escape-Room-Conjunctions-Prepositions-Irregular-Verbs-5th-Grade-15602085`,
    image: '/images/covers/tpt-15602085-cover-53e3eccb.jpg',
    title: 'Grammar Escape Room | Conjunctions, Prepositions & Irregular Verbs | 5th Grade',
    description:
      'Interactive digital escape room with five grammar challenges on conjunctions, verb tenses, and prepositional phrases.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602107',
    href: `${TPT}/The-Haunted-Grammar-House-Grammar-Escape-Room-Grades-3-5-Google-Slides-15602107`,
    image: '/images/covers/tpt-15602107-cover-c32658cb.jpg',
    title: 'The Haunted Grammar House | Grammar Escape Room | Grades 3-5 Google Slides',
    description:
      'Grammar escape room for grades 3–5 with three difficulty levels, from capitalization through advanced editing.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15602003',
    href: `${TPT}/Spring-Testing-Motivation-Kit-STAAR-Pep-Rally-Posters-Desk-Notes-Grades-3-5-15602003`,
    image: '/images/covers/tpt-15602003-cover-69066573.jpg',
    title: 'Spring Testing Motivation Kit | STAAR Pep Rally Posters, Desk Notes | Grades 3-5',
    description:
      'Door decorations, motivational posters, bookmarks, and testing-tip cards to build confidence before STAAR.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15601830',
    href: `${TPT}/Spring-Writing-Prompts-Grades-3-5-20-TEKS-Prompts-Graphic-Organizers-15601830`,
    image: '/images/covers/tpt-15601830-cover-334ec37a.jpg',
    title: 'Spring Writing Prompts Grades 3-5 | 20 TEKS Prompts + Graphic Organizers',
    description:
      '20 spring writing prompts for grades 3–5, each with a prompt page, graphic organizer, and lined writing page.',
    price: '$4.99',
    category: 'classroom',
  },
  {
    id: '15601925',
    href: `${TPT}/End-of-Year-Memory-Book-Reflection-Journal-Google-Slides-Grades-3-5-15601925`,
    image: '/images/covers/tpt-15601925-cover-7f490969.jpg',
    title: 'End of Year Memory Book & Reflection Journal | Google Slides | Grades 3-5',
    description:
      'Memory book pages, academic reflection, writing prompts, and autograph pages for the end of the year.',
    price: '$4.99',
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
