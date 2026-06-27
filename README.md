# Spesi

A personal budgeting app that learns from your spending history. You upload your bank statements (Banca Sella, Excel format), and the app calculates how much you historically spend each month — so you know in advance how much to set aside.

The idea: if you typically spend around €1,800 in June, the app tells you **before** the month starts, and shows you in real time whether you're spending in line with, above, or below your historical average. The more months you upload, the more accurate the estimate becomes.

## Features

- 📊 **Forecast vs actual dashboard** — for the current month, compare your historical average spending with your real, updated spending
- 📈 **12+ month history** — at-a-glance view of trends, with months over/under budget highlighted
- 💰 **Savings suggestion** — automatic calculation of how much to set aside based on the historical pattern for that specific month
- 📥 **Direct import from Sella Excel files** — upload the .xlsx file, the app reads and processes it automatically
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

1. **Initial historical upload**: import Excel files covering the last 2 years (all at once, if you like)
2. **Pattern calculation**: the app groups expenses by month and calculates the historical average for each calendar month
3. **Monthly update**: each month you upload the new statement, the app adds it to the history and refines the forecast
4. **Suggestion**: for the current month, the app compares expected vs actual spending and suggests how much to set aside

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

