# Spesi

A personal budgeting app that learns from spending history to tell you how much to set aside each month. That's the entire purpose — **not** an expense tracker, not a categorization tool, no charts about where money goes. Just: "based on past months, here's what you should allocate this month."

The idea: if you typically spend around €1,800 in June, the app tells you **before** the month starts, and shows you in real time whether you're spending in line with, above, or below your historical average. The more months you upload, the more accurate the estimate becomes.

## Explicitly out of scope

To keep this simple and focused, the following are **intentionally not features**:
- Expense categories (groceries, rent, entertainment, etc.)
- Per-category breakdowns or charts
- Transaction-level tagging or notes
- Budgets per category

Only two numbers matter per month: **total spent** and **total to set aside**.

## Features

- 📊 **Forecast vs actual dashboard** — for the current month, compare your historical average total spending with your real, updated total spending
- 📈 **12+ month history** — at-a-glance view of monthly totals, with months over/under the historical average highlighted
- 💰 **Allocation suggestion** — the core feature: automatic calculation of how much to set aside this month, based on the historical pattern for that specific calendar month
- 📥 **Direct import from Sella Excel files** — upload the .xlsx file, the app sums total outgoings for the month automatically (no categorization needed)
- 🔐 **Protected access** — login with username/password and MFA (two-factor authentication)
- ☁️ **Accessible from anywhere** — hosted online, usable from PC, tablet, or phone

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React | Hosted for free on Vercel |
| Database | Supabase (PostgreSQL) | Free tier, 500MB |
| Authentication | Supabase Auth | Username/password + MFA (TOTP) |
| File processing | Client-side JS | Excel files are read directly in the browser, no raw file upload to a server |

All services used are on free tiers. No sensitive banking data (IBAN, account number) is stored — only transaction date and amount.

## How it works

1. **Initial historical upload**: import Excel files covering the last 2 years (all at once, if you like). The app reads each file and sums total outgoings per month — no categorization, just one number per month.
2. **Pattern calculation**: the app calculates the historical average total for each calendar month (e.g. average of all past Junes)
3. **Monthly update**: each month you upload the new statement, the app adds the new total to the history and refines the forecast for that month going forward
4. **Allocation suggestion**: for the current month, the app compares the expected total (historical average) vs the actual total so far, and suggests how much to set aside to stay covered through the rest of the month

## Local setup (development)

```bash
git clone https://github.com/<your-username>/spesi.git
cd spesi
npm install
```

Create a `.env.local` file in the project root with your Supabase project keys:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Run locally:

```bash
npm run dev
```

## Deployment

The project is set up for automatic deployment on **Vercel**, connected to the GitHub repo: every push to the main branch automatically updates the live version.

## Privacy and data security

- Login required with MFA to access data
- Database protected by Supabase Row Level Security (each user only sees their own data)
- No sensitive banking data beyond transaction date and amount
- HTTPS connection across all services

## Roadmap

- [ ] Banca Sella Excel importer
- [ ] Monthly historical average calculation
- [ ] Forecast vs actual dashboard
- [ ] Login + MFA
- [ ] Deploy to Vercel
- [ ] (Optional) Google Sheets sync

## Project status

🚧 In development — initial version.
