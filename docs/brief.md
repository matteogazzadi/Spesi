# Spesi — Addendum v2 (build brief)

This document **extends** the original brief ("Spesi — Claude Code build brief"). It does not replace it: everything not mentioned here (tech stack, Banca Sella parsing, `.` treated as zero, exclusion of the balance row, etc.) remains valid as-is.

The three changes below non-trivially change the data model: we move from "monthly totals only" to "monthly totals + persisted underlying transactions." This is a deliberate change from the original brief (which explicitly said not to persist transactions) — confirmed with the user.

---

## 1. Excluding expense items via reusable rules

### Behavior
- The user can create reusable **exclusion rules**, e.g.: "exclude everything containing 'Affitto Mario' in the description."
- Rules apply automatically to **every future import** and can be re-applied retroactively to already-imported data (recalculating monthly totals).
- Matching is on **Description** (free-text contains/equals, case-insensitive) as the primary field. Banca Sella does not provide a structured "payee" field distinct from Description in this export — so "by payee" is implemented as a substring match on Description (e.g. "Mario Rossi" will appear inside the transaction's Description).
- Supported match types: `contains` (default) and `exact`. No regex needed for now — keep it simple.
- A transaction excluded by a rule **does not count toward the monthly total** but remains visible/inspectable (for transparency — it's not "deleted").

### Data model (new tables)

```
transactions
- id (uuid)
- user_id (fk)
- monthly_total_id (fk) -- or derivable from date, see below
- date (date)            -- from Data operazione, parsed DD/MM/YYYY
- description (text)     -- from Descrizione
- amount (numeric)        -- absolute value of Debito (always positive, expenses only)
- excluded (boolean, default false)  -- computed based on rules active at calculation time
- excluded_by_rule_id (uuid, nullable, fk -> exclusion_rules)
- created_at

exclusion_rules
- id (uuid)
- user_id (fk)
- pattern (text)          -- e.g. "Affitto Mario"
- match_type (enum: 'contains' | 'exact')
- active (boolean, default true)
- created_at
```

`monthly_totals.total_spent` is now calculated as `sum(amount) where excluded = false`, for that month.

### Logic
1. On import: parse all expense transactions (Debito ≠ `.`) and save them in `transactions`, including the excluded ones — excluded only via a flag, not by dropping the row.
2. For each transaction, evaluate active rules: if any rule matches, set `excluded = true` and store `excluded_by_rule_id`.
3. When the user creates/edits/disables a rule: lazy or on-demand recalculation of `excluded` across all of that user's existing transactions, then recalculation of the affected `monthly_totals`.
4. UI: an "Exclusion rules" page/section — list existing rules, add/remove/enable-disable. From here the user should also be able to see, for a given rule, how many transactions and how much total amount it's currently excluding (useful to gauge impact before activating it).

---

## 2. Budgeting calculation mode: all-time vs rolling window

### Behavior
- **A single global setting** (not per-month, not a runtime toggle in the dashboard): the user picks it once on a settings page and it applies to all forecast/allocation calculations until changed again.
- Two modes:
  - **All-time** (original behavior): the historical average for month M uses *all* available historical data for that calendar month (every past occurrence of that month).
  - **Rolling window (last 12 months of data)**: the historical average for month M only uses occurrences of that calendar month falling within the last 12 months relative to today. If the 12-month window contains zero or only one occurrence of that calendar month, the existing fallback rule still applies (fallback to the overall average, but computed only over the 12-month window, not the full history).

### Data model
```
user_settings
- user_id (fk, pk)
- budgeting_mode (enum: 'all_time' | 'rolling_12mo', default 'all_time')
```

### Logic
- The pure forecast function (already planned in the original brief, step 3 of the build order) takes `budgeting_mode` as an explicit parameter, in addition to historical data. It must not read settings on its own — it stays testable in isolation by passing both modes as test inputs.
- Changing the setting recalculates the forecasts shown in the dashboard (no need to persist historical forecasts, they're recomputed on the fly from existing `monthly_totals`).

### UI
- A minimal "Settings" page/section with a selector (radio or select) between the two modes. No side-by-side comparison required — this isn't an experimental toggle, it's a fixed preference.

---

## 3. View of loaded months, with edit/re-upload

### Behavior
- A view listing **every month for which data has been loaded**, not just the last 12 (those already live in the dashboard's history strip — this is a separate management view, like "my imports").
- For each month in the list: month (YYYY-MM), computed total spend, number of transactions, date of the last import for that month.
- Actions per row:
  - **Edit**: view/correct the individual transactions for that month (now possible since transactions are persisted — see point 1). Manual edits to a transaction's amount/description, or deletion of a single transaction, must trigger a recalculation of that month's `monthly_total`.
  - **Re-upload**: allows re-uploading the Excel file for that specific month. The new import **fully overwrites** existing transactions for that month (no merge/duplication) — ask for confirmation before overwriting.

### Data model
No new table beyond `transactions` already introduced in point 1. Just need:
- a way to associate transactions with their "month" (either derived from `date`, or — preferably for query simplicity — an explicit FK to `monthly_totals` to avoid recomputing the month from a date every time).
- `monthly_totals` must track `last_imported_at` to display it in the list.

### UI
- New "Loaded months" view (list/table), separate from the main dashboard.
- Clicking a month → detail view with that month's transactions (simple table: date, description, amount, excluded yes/no and by which rule), editable inline or via a minimal form.
- A "Re-upload file" button per month, with explicit confirmation before overwriting.

---

## Impact on the original build order

Step 1 of the original build order ("Supabase schema + Auth") now also includes `transactions`, `exclusion_rules`, `user_settings` in addition to `monthly_totals`.
Step 2 ("Excel import → parse → compute monthly total → save") now also saves individual transactions and applies active exclusion rules.
Step 3 ("Forecast calculation logic") now takes `budgeting_mode` as a parameter.
Add a step 4b: UI for exclusion rules, budgeting mode settings, and the loaded-months view with editing — before or alongside step 4 (dashboard).

## Still out of scope (unchanged from the original brief)
- Expense categories, per-category breakdowns, pie charts, merchant analysis: **still out of scope**. Exclusion rules only exist to strip noise from the total, not to categorize spending.
- Income tracking (`Credito`): still ignored, unchanged.

---

## 4. Development workflow: PRs, CI, auto-merge, tests, DB migrations

### Expected agent behavior (Claude Code)
- Every unit of work (feature, fix) goes on a **dedicated branch**, never direct commits to `main`.
- The agent opens a **Pull Request** for each branch, with a description of what changes and why.
- The agent **merges the PR only if all GitHub Actions pass** (green CI). If an action fails, the agent fixes it and re-pushes to the same branch, rather than forcing the merge.
- No "best effort" or timed auto-merge: the check is binary, pass/fail against the configured actions.

### Required GitHub Actions

**CI workflow (`.github/workflows/ci.yml`)** — triggers on PRs to `main`:
1. Install dependencies (frontend)
2. Lint
3. **Unit tests** (see below) — must pass before merging
4. Build the frontend (verify the Vite build doesn't break)

**DB migration workflow (`.github/workflows/db-migrate.yml`)** — triggers on merge/push to `main` when files under `supabase/migrations/` change:
1. Automatically applies pending migrations to the Supabase project (via the Supabase CLI: `supabase db push`, or `supabase migration up` against the remote project), using project credentials stored as GitHub Secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` or equivalent).
2. No migration is ever applied manually from a local terminal as the "real" step — the migration file is committed to the repo (`supabase/migrations/<timestamp>_<name>.sql`) and the only way it reaches the production DB is through this action, keeping schema and code always in sync and tracked in git.
3. If the migration fails, the action fails visibly (no swallowing errors) — no silent merge of a broken schema.

Practical consequence: any time a feature requires a schema change (e.g. the new `transactions`, `exclusion_rules`, `user_settings` tables from points 1-3 of this document), the agent writes the SQL migration as a versioned file in `supabase/migrations/`, rather than applying it by hand from the Supabase dashboard.

### Required unit tests
Minimum expected coverage, not exhaustive:
- **Excel parsing**: handling `.` as zero, exclusion of the "Saldo al..." row, parsing `DD/MM/YYYY` dates, summing `Debito` per month.
- **Forecast logic** (pure function, point 2): both modes (`all_time`, `rolling_12mo`), the case with fewer than 2 historical data points (fallback), the case with zero data points within the 12-month window.
- **Exclusion rules**: `contains` and `exact` matching, case-insensitivity, recalculation of `excluded` when a rule is created/disabled.
- **Allocation calculation**: forecast − current spend, floored at 0.

Tests must run in CI (step 3 of the CI workflow above) and must block the merge if they fail — they are not optional or "nice to have, do later."

### Impact on the build order
Add a step 0 (before even the Supabase schema): repo setup, branch protection on `main` (requiring a PR + green CI to merge), and scaffolding of the two GitHub Actions workflows described above. The initial schema and every subsequent change to it (including points 1-3 of this document) go through a versioned migration + PR + CI, never direct changes.
