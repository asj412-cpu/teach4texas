# Teach4Texas Live Game Show

Live classroom game runtime: teachers redeem a **TPT product access code**, host a Jeopardy-style board on a projector, students join with a short **room code**.

Full design: [`../../DESIGN-LIVE-GAME-SHOW.md`](../../DESIGN-LIVE-GAME-SHOW.md)

## Stack (MVP)

| Layer | Choice |
|-------|--------|
| App | Next.js (App Router) + TypeScript + Tailwind |
| Realtime | PartyKit (later PRs) |
| Data | Supabase Postgres + product access codes (later PRs) |
| AI boards | xAI Grok — **operator inventory pipeline**, not teacher self-serve SaaS |

## Local dev

```bash
cd apps/live-game
cp .env.example .env.local   # set OPERATOR_SECRET
npm install
npm run dev
```

| URL | Who |
|-----|-----|
| http://localhost:3000 | Landing |
| http://localhost:3000/redeem | Teacher — TPT access code |
| http://localhost:3000/host | Teacher — start live session |
| http://localhost:3000/join | Students — room code |
| http://localhost:3000/admin | **You only** — mint codes (secret) |
| http://localhost:3000/api/health | Health |

### Classroom dry-run

1. Seed: `curl -X POST .../api/admin/seed-demo -H "x-operator-secret: change-me-in-production"`
2. Teacher: redeem `T4T-DEMO-MATH-G3-SAMPLE01` → **Start live class session**
3. Note the **6-char room code** on host
4. Student: `/join` with room code + name → answer when teacher opens a cell
5. Host: Open question → Lock → Reveal & score → Back to board

Default operator secret: `change-me-in-production` (set `OPERATOR_SECRET` in `.env.local`).

### Seed demo product + access code (TPT packaging test)

```bash
curl -s -X POST http://localhost:3000/api/admin/seed-demo \
  -H "x-operator-secret: change-me-in-production"
```

Use the returned `demo_access_code` at `/redeem`. It unlocks **only** the sample Grade 3 math game.

### Mint a new code for a board (put this in the TPT PDF)

```bash
curl -s -X POST http://localhost:3000/api/admin/mint-code \
  -H "x-operator-secret: change-me-in-production" \
  -H "Content-Type: application/json" \
  -d '{"board_id":"board_sample_math_g3","label":"TPT listing batch 1"}'
```

Copy `code` into the product download. Plaintext is shown once; only a hash is stored.

## Two code types (do not mix)

1. **Product access code** — from the TPT download; teacher redeems at `/redeem` to unlock **exactly one** game.  
2. **Room join code** — short code for one live multiplayer session; students enter at `/join` (later PR).

## Creator + hosting

See **[CREATOR-AND-HOSTING.md](./CREATOR-AND-HOSTING.md)** for:

- How you create more games (clone / AI / import JSON)
- Mint codes for TPT downloads
- Deploy to **`play.teach4texas.com`** on Vercel next to marketing **`teach4texas.com`**

## Isolation rules (TPT sales)

| Rule | Behavior |
|------|----------|
| One code → one `board_id` | Redeem never returns a catalog |
| Host session cookie | Bound to that board only for 12h |
| Cross-board request | `BOARD_ISOLATION_VIOLATION` (403) |
| Other products | Require their own TPT purchase + code |

## Monetization (hard rule)

- **Teachers do not generate games** in this app (no free AI builder, no create UI).
- **Teachers buy** discrete games on Teachers Pay Teachers.
- Each listing includes **access code(s)** that unlock **that one paid game** for hosting.
- **You (operator)** create inventory offline / via secret-gated admin APIs, then mint codes for TPT packaging.

Public stubs always reject create/generate:

- `POST /api/boards` → 403 `TEACHER_CREATE_DISABLED`
- `POST /api/boards/generate` → 403 `TEACHER_GENERATION_DISABLED`

## Env catalog

See [`.env.example`](./.env.example). Never commit `.env.local`.

## Isolation

This package is independent of the root Astro marketing site (`site/`) and the Python TPT generators (`generators/`). Do not wire those pipelines into the Vercel deploy of this app.

## PR roadmap

See **PR Plan** in `DESIGN-LIVE-GAME-SHOW.md`. Vertical slice playable in class after **PR 8.5**.
