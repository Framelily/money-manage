# money-manage

Personal finance app for tracking income, expenses, installment debts, and
person-to-person debts. Thai UI, Buddhist Era dates, Thai Baht.

## Structure

- `apps/web` — React + TypeScript + Vite SPA
- `apps/api` — Go + Gin REST API, also serves the built SPA

## Quick start

```bash
cd apps/web && npm install && npm run dev
cd apps/api && go run .
```

See `CLAUDE.md` for details and `apps/*/README.md` for each app.
