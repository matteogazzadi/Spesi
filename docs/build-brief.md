# Claude Code build brief — Spesi

## What this app does (one sentence)
Upload monthly bank statement Excel files → app sums total spending per month → app tells you how much to set aside this month based on historical totals for that same calendar month.

## What this app does NOT do
- No expense categories. No "groceries vs rent vs entertainment" breakdowns.
- No per-transaction tagging, notes, or categorization UI.
- No pie charts, category charts, or merchant analysis.
- Just totals: one number per month (spent), compared against a historical average (forecast), producing one suggestion (allocate this much).

If you find yourself building a categorization feature, category picker, or transaction-level editing UI — stop, that's out of scope.

## Core data model
Two things only:
- **Monthly total**: { month (YYYY-MM), total_spent (number) }
- That's it. No transaction-level detail needs to persist long-term (it can be parsed transiently from the Excel just to compute the monthly sum, then discarded — or kept if trivial, but never exposed as a feature).

## Core logic
1. Historical average for month M = average of total_spent across all past years for calendar month M (e.g. average of June 2024, June 2025 → forecast for June 2026)
2. If fewer than 2 historical data points exist for that month, fall back to overall monthly average across all months
3. Current month progress = actual total so far vs (historical average × % of month elapsed)
4. Allocation suggestion = historical average for that month − amount already spent this month (floor at 0)

## Tech stack (already decided, don't deviate)
- Frontend: React (Vite), deployed to Vercel
- Backend/DB: Supabase (Postgres) — use Supabase client SDK directly from frontend, no separate backend server needed unless something specifically requires it
- Auth: Supabase Auth with email/password + TOTP MFA enrollment
- Excel parsing: client-side, using a JS library (e.g. SheetJS/xlsx) — parse in-browser, only send the computed monthly total to Supabase
- Row Level Security on all tables: each user only ever sees their own rows

## Input file format — CONFIRMED, do not re-derive

Banca Sella export, `.xls` file, single sheet named `ExportExcel`. Header row + data rows, columns in this exact order:

| Column | Content | Notes |
|---|---|---|
| Codice identificativo | transaction ID | numeric, not needed |
| Data operazione | date, format `DD/MM/YYYY`, stored as string | use this for month bucketing |
| Data valuta | value date | usually same as above, not needed |
| Descrizione | free text description | not needed (no categorization) |
| Divisa | "EUR" | not needed |
| Debito | **negative number, or literal string `.` if not an outgoing transaction** | this is the column to sum for monthly total spent |
| Credito | positive number, or literal string `.` if not an incoming transaction | not needed — this app ignores income entirely, only tracks outgoings |
| Categoria | Sella's own category | **ignore — not used, no categorization in this app** |
| Sottocategoria | Sella's own subcategory | **ignore** |
| Etichette | tags | **ignore** |
| Note | almost always empty | **ignore** |

### Critical parsing rules
1. **The `.` character is a placeholder for "no value", not the number zero or a literal dot.** Treat any cell containing `.` as 0 when summing.
2. **The file always ends with a trailing blank row followed by a summary row** containing `Saldo al DD/MM/YYYY HH:MM:SS` in the Descrizione column and the account balance (a positive float) in the Divisa column position. **This row must be excluded from import** — it is not a transaction.
3. Monthly total spent = sum of the `Debito` column (already negative; take absolute value) for all transaction rows in that calendar month, excluding the balance row.
4. Income (`Credito` column) is parsed but **not used** for any calculation — this app only forecasts/allocates against spending, not net cash flow.
5. Parse dates from `Data operazione` using `DD/MM/YYYY` format.

## UI / Dashboard requirements
- Current month: forecast total, actual total so far, and the allocation suggestion, prominently displayed
- Simple progress indicator comparing actual vs expected-by-this-point-in-month
- 12-month history strip: one bar per month, forecast vs actual, flag months that went over
- Upload zone for the monthly Excel file
- That's the whole UI. Keep it simple — this is a personal tool, not a SaaS product with onboarding flows, settings pages, multiple views, etc. (yet — productization is a later decision, not now)

## Build order suggestion
1. Supabase schema (single `monthly_totals` table + RLS) + Auth setup with MFA
2. Excel import → parse → compute monthly total → save
3. Forecast calculation logic (pure function, testable in isolation)
4. Dashboard UI wired to real data
5. Deploy to Vercel

## Reference design
A visual mock already exists (warm paper/ledger aesthetic — cream background, ink-blue text, terracotta for over-budget, sage green for under-budget, serif numbers). Ask for it if you want to match the look; functionality matters more than matching it exactly.
