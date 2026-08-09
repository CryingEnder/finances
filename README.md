# Finance Manager

Personal finance tracker for portfolios spanning stocks, ETFs, fund units, term deposits, dividends, and trades — with a summary view for overall performance.

Built with **Next.js**, **MongoDB**, and **TypeScript**. Auth is JWT-based; UI is bilingual (EN/RO). Multi-currency positions use BNR exchange rates for RON conversion.

## Features

- **Stock portfolio** — positions with purchase vs. current value and profit/loss
- **Stock trades** — buy/sell history with fees, commissions, and tax withheld
- **ETFs & fund units** — track holdings, status history, and unrealized/realized profit
- **Term deposits** — banks, rates, maturity, and earned interest
- **Dividends** — income by instrument
- **Summary** — cross-asset overview and allocation charts
- **Companies catalog** — shared issuer / ISIN / instrument data for stocks

More features are planned (imports, richer reporting, and UX polish).

## Stack

- Next.js (App Router) + React 19
- MongoDB
- TanStack Query, Zod, Recharts
- next-intl, Tailwind CSS
- Sentry for error monitoring

## Setup

1. Copy `.env.example` to `.env.local` and fill in `JWT_SECRET`, `MONGODB_URI`, and `MONGODB_DB_NAME` (optional Sentry vars).
2. `npm install`
3. Create a user: `npm run create-user`
4. `npm run dev`
