# Creator workflow + public hosting (teach4texas.com)

## How you (the creator) make more games to sell

Teachers **never** create games. Only you do, then you sell each game on TPT with an access code.

### Pipeline

```
Create board → Review → Mark ready → Mint access code
    → Put code in TPT PDF → Publish TPT listing
    → Teacher redeems on play.teach4texas.com → hosts class
```

### Three ways to create a board

Open **`/admin`** (operator secret from `OPERATOR_SECRET`).

| Method | When to use |
|--------|-------------|
| **A. Clone** | Start from sample or another game, then edit |
| **B. AI draft** | Operator-only Grok draft (`XAI_API_KEY`); always review |
| **C. Import JSON** | Author offline / from your Python pipeline |

#### Local steps

```bash
cd apps/live-game
cp .env.example .env.local
# set OPERATOR_SECRET=... and optionally XAI_API_KEY=...
npm run dev
# open http://localhost:3000/admin
```

1. Sign in with `OPERATOR_SECRET`
2. Create board (clone / AI / import)
3. **Download JSON** → edit questions if needed → **Import** again
4. **Mark ready**
5. **Mint TPT code** → copy into the product’s teacher guide PDF  
6. Sell that listing on [Teachers Pay Teachers](https://www.teacherspayteachers.com/store/teach4texas)

Each code unlocks **only that board**. Mint one code per sale, or one multi-use code per product (your choice).

### Offline / existing Python inventory

You can keep using `generators/` + game-show JSON, convert to live MC schema (25 cells, 4 choices each), then **Import JSON** in admin. Offline free-response files are not auto-imported.

---

## Public hosting on teach4texas.com (Vercel)

Your marketing site is Astro at **https://teach4texas.com** (`site/`).  
Live games are **Next.js** (`apps/live-game`) — deploy as a **second Vercel project** on a subdomain (recommended):

| App | Path | Vercel project root |
|-----|------|---------------------|
| Marketing (Astro) | `teach4texas.com` | `site/` |
| Live games (Next) | **`play.teach4texas.com`** | `apps/live-game/` |

### Why a subdomain?

Astro is static; live games need API routes, cookies, and server state. One Vercel project can only run one framework cleanly. Subdomain keeps marketing and play separate, same brand.

### Deploy play.teach4texas.com

1. [Vercel](https://vercel.com) → **Add New Project** → import this GitHub repo  
2. **Root Directory:** `apps/live-game`  
3. Framework: Next.js (auto)  
4. Environment variables:

```
OPERATOR_SECRET=          # long random secret (creator admin)
XAI_API_KEY=              # optional, for AI drafts in /admin
XAI_MODEL=grok-4.3
AI_GENERATION_ENABLED=true
NEXT_PUBLIC_APP_URL=https://play.teach4texas.com
```

5. Deploy  
6. Project → **Domains** → add `play.teach4texas.com`  
7. At your DNS (wherever teach4texas.com is managed), add the CNAME Vercel shows (usually `cname.vercel-dns.com`)

Marketing site already links to `https://play.teach4texas.com` for redeem / join.

### Important production limit (today)

- **Boards + access codes** persist in `data/store.json` on local disk.  
- On Vercel **serverless**, that file is **ephemeral** and not shared across instances.

**Before selling live traffic**, wire durable storage (Supabase / Postgres / Upstash). Until then:

- Use play site for demos after a single warm instance, or  
- Run creator tooling **locally**, export codes into TPT PDFs, and plan a Supabase migration next.

Live **rooms** are also in-memory (same limit multi-instance). Fine for a demo class; production multiplayer should move to PartyKit or Redis (see design doc).

### Checklist before first paid TPT live product

- [ ] `play.teach4texas.com` deploys and HTTPS works  
- [ ] `/admin` locked with strong `OPERATOR_SECRET`  
- [ ] Durable store for boards + codes (not only local JSON)  
- [ ] Test: mint code → redeem on prod → host → student join  
- [ ] TPT listing includes access code + link to `https://play.teach4texas.com/redeem`

---

## Teacher-facing URLs (put in TPT)

- Redeem: `https://play.teach4texas.com/redeem`  
- Students join: `https://play.teach4texas.com/join`  
- Your store: existing TPT storefront  

Do **not** send teachers to `/admin` or any generate URL.
