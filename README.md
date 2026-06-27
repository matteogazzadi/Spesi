# Spesi

A personal budgeting app that learns from your spending history to tell you how much to allocate each month. That's the entire purpose — **not** an expense tracker, not a categorization tool, no charts about where money goes. Just: "based on past months, here's what your budget should be."

The idea: if you typically spend around €1,800 in June, the app tells you **before** June starts and before next month too, so you know what to set aside. The more months you add, the more accurate the forecast becomes.

## Explicitly out of scope

To keep this simple and focused, the following are **intentionally not features**:
- Expense categories (groceries, rent, entertainment, etc.)
- Per-category breakdowns or charts
- Transaction-level tagging or notes
- Budgets per category

Only one number matters per month: **total spent**.

## Features

- **Budget forecast** — see your expected spending for the current month and next month, based on your historical average for that calendar month
- **12-month history** — bar chart of monthly totals with forecast overlay; months over/under highlighted
- **Manual month entry** — type in how much you spent for any past month — no bank export required, works with any bank
- **Banca Sella Excel import** — upload the `.xlsx` statement export and the app sums total outgoings automatically
- **Exclusion rules** — filter out salary credits, transfers, and recurring noise with contains/exact-match rules
- **Secure by default** — login with email/password and mandatory TOTP two-factor authentication; every row protected by Postgres Row-Level Security

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite | Hosted on Vercel |
| Database | Supabase (PostgreSQL) | Free tier, 500 MB |
| Authentication | Supabase Auth | Email/password + mandatory MFA (TOTP) |
| File processing | Client-side JS (SheetJS) | Excel files parsed in the browser — no raw file upload |

All services are on free tiers. No sensitive banking data (IBAN, account number) is stored — only transaction date and amount.

## How it works

1. **Add past months**: either upload Banca Sella Excel exports or type in the total manually for each month
2. **Pattern detection**: the app averages historical totals for each calendar month (e.g. average of all past Junes)
3. **Budget display**: the dashboard shows the forecast for the current month and next month
4. **History chart**: 12-month bar chart compares actual spend against the forecast for each past month

## Local setup

```bash
git clone https://github.com/matteogazzadi/Spesi.git
cd Spesi
npm install
```

Create a `.env.local` file:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

```bash
npm run dev
```

## Deployment

Connected to Vercel — every push to `main` deploys automatically to [spesi.vercel.app](https://spesi.vercel.app).

Database migrations are applied automatically via GitHub Actions (`db-migrate.yml`) on push to `main` when files under `supabase/migrations/` change. Requires three repository secrets: `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`.

## Privacy and data security

- Mandatory MFA (TOTP) for all accounts
- Postgres Row-Level Security — each user sees only their own data
- No sensitive banking data beyond transaction date and amount
- HTTPS across all services

## Project status

Active development.
