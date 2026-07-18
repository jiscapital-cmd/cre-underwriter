# CRE Underwriter

Automated commercial real estate underwriting: upload an OM, rent roll, and
T-12, and Claude extracts the deal terms into a live proforma with IRR,
equity multiple, cash-on-cash, and a sensitivity grid.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

### Required accounts

1. **Anthropic API key** — https://console.anthropic.com/ → `ANTHROPIC_API_KEY`.
   Used server-side only (in `app/api/extract/route.ts`) to read uploaded PDFs/CSVs.
2. **Supabase project** — https://supabase.com/ → new project → Settings > API.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for the save/list deal API routes)
   - Run `supabase/schema.sql` in the Supabase SQL editor once, to create the `deals` table.

Without these env vars, the calculator itself (Inputs → Proforma → Returns →
Sensitivity) still works fully client-side; only "Upload documents" and
"Save Deal" require the keys.

## Deploy to Netlify

1. Push this folder to a GitHub repo.
2. In Netlify: New site from Git → select the repo.
3. Add the same env vars from `.env.example` in Site settings > Environment variables.
4. Netlify auto-detects `netlify.toml` and the Next.js plugin.

## Architecture

- `lib/underwriting.ts` — pure calculation engine (debt sizing, 10-yr proforma,
  levered/unlevered IRR via bisection, 5x5 exit-cap × rent-growth sensitivity grid).
- `app/api/extract/route.ts` — sends uploaded PDF/CSV to Claude with a strict
  JSON extraction schema for OM/rent roll/T-12 data.
- `app/api/deals/**` — Supabase-backed save/list/load for underwritten deals.
- `app/page.tsx` — single-page workspace: upload → auto-filled inputs → live results.
