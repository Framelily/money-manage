# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal finance management web app (Thai language) for tracking income, expenses, installment debts (KTC/UOB/Shopee), and personal debts from April to December 2569 (Buddhist Era). Built with React + TypeScript + Vite.

## How to Run

```bash
npm install     # first time only
npm run dev     # development server
npm run build   # production build
```

## Architecture

- **React + Vite + TypeScript** — SPA with React Router v6
- **Ant Design** — UI components (forms, tables, modals, layout)
- **Styled Components** — custom styling
- **Tailwind CSS v4** — utility classes only (flex, gap, grid, etc.)
- **Recharts** — charts (ComposedChart, PieChart)
- **dayjs** — date utilities + Buddhist Era conversion

### Project Structure

```
src/
├── types/           # TypeScript interfaces (common, installment, budget, debt)
├── data/            # Mock data (installments, budget, debts)
├── services/        # Service layer (Promise-based, swappable to API)
├── hooks/           # Custom hooks (useInstallments, useBudget, useDebts)
├── pages/           # Route pages (Dashboard, Installments, Budget, Debts)
├── components/      # UI components organized by feature
│   ├── layout/      # AppLayout, Sidebar
│   ├── dashboard/   # SummaryCards, IncomeExpenseChart, DebtStatusChart
│   ├── installments/# ProviderGroup, InstallmentCard/Table/Form
│   ├── budget/      # BudgetTable (editable), BudgetItemForm, BudgetChart
│   └── debts/       # DebtCard, DebtForm, PaymentHistory
├── utils/           # format.ts, date.ts, calculations.ts
└── styles/          # GlobalStyle, theme
docs/                # Original static index.html + CSV reference data
```

### Service Layer Pattern

All services return `Promise<T>` with simulated 300ms delay from in-memory arrays. To connect a real backend, replace implementations inside service files — hooks and components stay unchanged.

## Routes

| Path | Page |
|------|------|
| `/` | Dashboard (summary cards + charts) |
| `/installments` | Installment debts (KTC/UOB/Shopee) — CRUD + toggle paid |
| `/budget` | Monthly budget table (editable cells) — CRUD |
| `/debts` | People debts — CRUD + record payments |

## Conventions

- All UI text is in Thai
- Currency is Thai Baht (฿), formatted via `formatBaht()`/`formatNumber()` using `th-TH` locale
- Dates use Buddhist Era (พ.ศ.) — add 543 to Gregorian year
- Path aliases: `@/` → `src/`
