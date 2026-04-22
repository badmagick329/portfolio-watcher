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

The SQLite parent folder is created automatically.

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

## Using the app

After starting the web app:

1. open the Orders page
2. use the `Sync` button to run:
   - `Sync orders`
   - `Sync instruments`
3. wait for your data to appear
4. use the Categories page to assign categories and view allocation

Notes:

- syncing beta data is still CLI-only

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

## Categories

Manage categories in the Categories page.

## Risk metrics / beta

This is optional.

To use beta features, add:

```env
FMP_API_KEY=your_fmp_api_key
```

Beta appears in the Categories allocation view after risk metrics have been synced.

At the moment, beta sync and manual symbol mapping are CLI-only.

## CLI (optional)

Most users can ignore this section.

Trading 212 sync:

```bash
pnpm main sync
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
