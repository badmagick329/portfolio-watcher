# Portfolio Watcher

Small personal portfolio tracker for:

- syncing Trading 212 orders and current holdings
- viewing orders and category allocations in the web UI
- assigning categories to instruments
- optionally syncing beta/risk metrics from FMP

## Minimal setup

If you just want the app running locally, do this:

1. Install dependencies

```bash
pnpm install
```

2. Create a `.env` file in the repo root

You can copy `.env.sample` and keep only the DB path if you want the most minimal setup.

```env
SQLITE_DB=./sqlite/portfolio-watcher.db
```

3. Run database migrations

```bash
pnpm db:migrate
```

4. Start the web app

```bash
pnpm dev:web
```

That is enough to open the app locally.  
But in practice, you will usually also want Trading 212 API credentials, otherwise the app has no portfolio/order data to show.

## First-time flow

1. `pnpm install`
2. create `.env`
3. add:

```env
SQLITE_DB=./sqlite/portfolio-watcher.db
API_KEY=your_trading212_api_key
API_SECRET=your_trading212_api_secret
```

4. `pnpm db:migrate`
5. `pnpm dev:web`
6. open the local web app

Add `FMP_API_KEY` later only if you want beta/risk metrics.

## Environment variables

Put these in `.env` at the repo root.

Required:

```env
SQLITE_DB=./sqlite/portfolio-watcher.db
```

Usually needed:

```env
API_KEY=your_trading212_api_key
API_SECRET=your_trading212_api_secret
```

Optional:

```env
FMP_API_KEY=your_fmp_api_key
```

Notes:

- `API_KEY` + `API_SECRET` are what make the app useful for most people. They enable Trading 212 order sync and portfolio sync.
- live order placement depends on what your Trading 212 key is allowed to do; if it is read-only, the app should fail gracefully.
- `FMP_API_KEY` is only needed for syncing beta/risk metrics.

## Main commands

Start the web app in dev mode:

```bash
pnpm dev:web
```

Build and run production mode:

```bash
pnpm build:web
pnpm start:web
```

Run all tests:

```bash
pnpm test
```

Typecheck:

```bash
pnpm typecheck
```

## Trading 212 sync

If you added `API_KEY` and `API_SECRET`, these are the main sync commands:

Sync historical orders:

```bash
pnpm main sync
```

Sync full Trading 212 instrument catalog:

```bash
pnpm main sync-instruments
```

Notes:

- `pnpm main sync` currently runs the main historical order + price sync flow.
- if credentials are missing, sync commands will fail with a clear validation error.

## Categories

You can manage categories in the web UI, or via CLI.

Set a category:

```bash
pnpm main categories set --instrument AMD --category satellite
```

Unset a category:

```bash
pnpm main categories unset --instrument AMD
```

List categories:

```bash
pnpm main categories list
```

## Risk metrics / beta

This is optional.

To use beta features, add:

```env
FMP_API_KEY=your_fmp_api_key
```

Then you can:

1. map any instrument symbols FMP cannot infer
2. sync risk metrics

Set a manual FMP symbol mapping:

```bash
pnpm main risk-symbols set --instrument VOD --provider fmp --symbol VOD.L
```

Remove a mapping:

```bash
pnpm main risk-symbols unset --instrument VOD --provider fmp
```

List mappings:

```bash
pnpm main risk-symbols list
```

Sync beta/risk metrics:

```bash
pnpm main sync-risk-metrics
```

## Do I need to migrate?

Yes. Run this at least once after creating `.env`:

```bash
pnpm db:migrate
```

Run it again any time the schema changes.
