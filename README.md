# Portfolio Watcher

Local-first Trading 212 portfolio tracker with:

- order sync
- current portfolio snapshots
- category management
- allocation views
- movers over a selected period
- optional live order placement from the CLI

## Web app

Current pages:

- `/` Orders
- `/categories` Categories
- `/allocation` Allocation
- `/movers` Movers

## Minimal setup

For a useful local setup, use:

1. Install dependencies

```bash
pnpm install
```

2. Create `.env` in the repo root

```env
SQLITE_DB=./sqlite/portfolio-watcher.db
API_KEY=your_trading212_api_key
API_SECRET=your_trading212_api_secret
```

3. Run migrations

```bash
pnpm db:migrate
```

4. Start the web app

```bash
pnpm dev:web
```

That gives you the web app plus Trading 212-backed portfolio data.

## First-time flow

After the app is running:

1. Open the Orders page
2. Use `Sync` to run:
   - `Sync orders`
   - `Sync instruments`
3. Leave the Orders page open briefly

Important:

- the Orders page also runs portfolio-state sync in the background
- that background sync is what populates current holdings, valuation, allocation, and movers
- if you only sync orders and catalog data, the app still may not have current portfolio state yet

## Main commands

Run the web app:

```bash
pnpm dev:web
```

Build and run production mode:

```bash
pnpm build:web
pnpm start:web
```

Run tests:

```bash
pnpm test
```

Database helpers:

```bash
pnpm db:migrate
pnpm db:generate
pnpm db:push
pnpm db:studio
```

## CLI

At the moment, live market and live limit orders are only available through the CLI.
The rest of the commands can be ignored as there are web equivalents for them.

Main sync:

```bash
pnpm main sync
```

This runs:

- historical order sync
- current portfolio-state sync

Instrument catalog sync:

```bash
pnpm main sync-instruments
```

Category management:

```bash
pnpm main categories set --instrument AMD --category satellite
pnpm main categories unset --instrument AMD
pnpm main categories list
```

Risk metric symbol mapping:

```bash
pnpm main risk-symbols set --instrument VOD --provider fmp --symbol VOD.L
pnpm main risk-symbols unset --instrument VOD --provider fmp
pnpm main risk-symbols list
```

Risk metric sync:

```bash
pnpm main sync-risk-metrics
```

Live order placement:

```bash
pnpm main place-live-order --instrument AMD --side buy --value 100 --confirm
pnpm main place-live-limit-order --instrument AMD --side buy --quantity 1 --limit-price 100 --confirm
```

## Current portfolio export

Create a fresh JSON snapshot of the current portfolio for analysis by an agent:

```bash
pnpm export:portfolio
```

This command uses Doppler, refreshes the Trading 212 instrument catalog and
current portfolio state, then writes `./exports/portfolio.json`. The export
fails without writing stale data if either live refresh fails.

Each holding includes its human-readable name, ISIN, instrument type, Trading
212 ticker, quantity, average unit cost, current price, value, cost, unrealized
profit or loss, currencies, and portfolio weight. Name and ISIN are the primary
identity fields; the Trading 212 ticker is included only for traceability.

To choose another output location while still using Doppler:

```bash
doppler run -- node --env-file=.env --import tsx ./apps/cli/src/main.ts export-portfolio --output ./path/to/portfolio.json
```

Portfolio exports contain sensitive financial information. The default
`exports/` directory is excluded from Git.

## Deprecated: risk metrics

There is partial support in the codebase for FMP-backed risk metrics, beta, alpha, and risk mappings.

That feature set can still be manually enabled, but it is currently deprecated because upstream API coverage is incomplete and can leave gaps in symbol and risk data.

If you revisit that work later, it uses `FMP_API_KEY`.
