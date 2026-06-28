# Spesi

A personal budgeting app that learns from your spending history to tell you how much to set aside each month. The entire purpose is one number: **what should my budget be this month?** — not an expense tracker, not a categorisation tool, no category breakdowns.

The idea: if you typically spend around €1,800 in June, the app tells you *before* June starts. Add past months, get a forecast. The more months you add, the more accurate it becomes.

## Explicitly out of scope

To stay focused:
- Expense categories (groceries, rent, entertainment…)
- Per-category breakdowns or charts
- Transaction-level tagging or notes
- Budgets per category

Only one number matters per month: **total spent**.

## Features

### Forecasting
- **Adaptive EWMA forecast** — exponentially weighted moving average with decay tuned automatically per user via leave-one-out cross-validation (grid search over 10 candidates), so the model adapts to whether your spending is stable or volatile
- **Outlier-robust Winsorisation** — extreme months are clipped at [Q1−1.5·IQR, Q3+1.5·IQR] before fitting, preventing a single anomalous month from skewing the forecast
- **Calibration correction** — leave-one-out bias factor tracks historical over- / under-forecasting and corrects future estimates
- **Confidence interval** — p10 (optimistic) and p90 (conservative) bounds derived from the LOO error distribution, shown as a green–red range below the main forecast
- **Seasonal adjustment** — forecast blends a global trend with a same-calendar-month average using shrinkage (0.6 → 0.8 → 1.0 as data accumulates)
- **Confidence level** — low / medium / high based on how many same-month observations are available

### Dashboard
- **Current month card** — forecast for the current month with confidence level, trend badge (↑/↓ vs 3-month average), and forecast range
- **Next month preview** — forecast for the upcoming month, updated live
- **Last month close** — actual vs forecast vs delta (€ and %) for the most recently completed month
- **Planned extras** — add upcoming one-off expenses with a configurable "unplanned %" (0–100%) that flows directly into the forecast budget
- **Annual progress** — year-to-date actual, full-year projection, target progress bar, and monthly budget allowance for remaining months
- **12-month history strip** — bar chart of actual vs forecast; bars coloured by over/under; scrollable on mobile
- **Year-over-year chart** — multi-line chart comparing the last 4 years month by month
- **Gamification** — 🥇🥈🥉 medals for your 3 cheapest months all-time, shown in the months list with a congratulatory note

### Data entry
- **Manual month entry** — type in the total for any month; works with any bank
- **Banca Sella Excel import** — upload `.xlsx` statement exports; outgoings are summed automatically in the browser (no file upload to server)
- **Month notes** — attach a free-text note to any month entry
- **Re-upload** — replace transactions for an existing month without losing the month record

### Rules
- **Exclusion rules** — filter salary credits, transfers, and recurring noise with contains / exact-match pattern rules applied automatically on import

### Settings
- **Annual spending target** — set a yearly ceiling; the dashboard tracks progress and shows monthly runway
- **Budgeting mode** — all-time (uses every past occurrence of the calendar month) or rolling 12 months
- **Appearance** — light / dark theme, preference saved to DB and localStorage (no flash on load)
- **Language** — 6 languages (English, Italiano, Español, Français, Deutsch, Português), auto-detected from the browser, overridable in Settings, persisted to DB

### Security
- Email/password login with mandatory TOTP two-factor authentication
- Postgres Row-Level Security — each user sees only their own data
- No sensitive banking data (IBAN, account number) stored — only transaction date and amount

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite 5 + TypeScript | Hosted on Vercel |
| Database | Supabase (PostgreSQL) | Free tier, 500 MB |
| Authentication | Supabase Auth | Email/password + mandatory MFA (TOTP) |
| File processing | Client-side JS (SheetJS) | Excel files parsed in the browser — no raw file upload |
| Styling | Plain CSS + CSS custom properties | Dark/light theme via `[data-theme]` attribute |
| i18n | Custom lightweight dictionary | No external deps; 6 languages, ~70 keys each |

All services are on free tiers.

## How it works

1. **Add past months** — upload Banca Sella Excel exports or type in the monthly total manually
2. **Adaptive fitting** — the algorithm finds the optimal EWMA decay for your data via leave-one-out CV, then applies Winsorisation, seasonal adjustment, and a calibration factor
3. **Dashboard** — forecast for the current and next month, confidence interval, trend, last month close, annual progress, and history chart
4. **Tune** — add planned extras to adjust the budget, set exclusion rules to filter noise, pick a budgeting mode and annual target

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
