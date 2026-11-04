---
name: place-limit-orders
description: Place live Trading 212 limit orders via this repo's CLI. Use when asked to place limit buy or sell orders, including a ladder of price levels or a cash amount per order.
---

# Place limit orders

Live orders spend real money. Every batch passes a dry run and the user's explicit yes before anything reaches the broker.

## Commands

Prefix both with `doppler run -- node --env-file=.env --import tsx ./apps/cli/src/main.ts`. The Trading 212 keys live in Doppler, not `.env`; `pnpm main` and `pnpm cli` lack them and fail with "Trading 212 API credentials are required."

- **Ladder** (several price levels at a fixed step, a cash amount per level):
  `place-live-limit-ladder --instrument <ticker> --side <buy|sell> --step <price> --tier <from>-<to>:<amount> [--tier ...] [--time-validity day|gtc] [--confirm]`
  Each tier covers `from` to `to` inclusive; tiers must not share a price, so the second tier starts one step past the first (`800-750:5 --tier 745-700:10`). The command computes quantities (amount ÷ price, floored to 3 decimals), reuses the resolved ticker, spaces live submissions for the API rate limit, stops at the first failure, and prints the table with totals. It exits 1 on any failure.
- **Single order** (a one-off level or an explicit share quantity):
  `place-live-limit-order --instrument <ticker> --side <buy|sell> --quantity <n> --limit-price <price> [--time-validity day|gtc] [--confirm]`
  Exits 0 even on errors: a placed order prints `orderId:` and `status:`.

Without `--confirm` both are dry runs: they resolve the instrument and log the attempt locally, sending nothing to the broker.

Time validity defaults to `day`, which expires unfilled orders at session end. Use `gtc` only when the user asks for orders that stay open. A `gtc` order stays open until filled or cancelled, and the CLI cannot cancel it: the user cancels in the Trading 212 app. Open `gtc` orders from earlier runs count toward the 50-pending-orders-per-ticker cap.

## Steps

1. **Map the request** onto ladder tiers or single orders. Amounts and limit prices are in the instrument's currency (USD for US stocks); if the user gives another currency, ask. When a boundary price could belong to either tier, say which tier you put it in.
2. **Dry-run** the whole batch. On "Multiple instruments matched", ask the user which ticker and rerun with it. Done when every order shows a clean dry run.
3. **Show the table** from the dry run: instrument, side, limit price, quantity, cost, and the batch total, plus the time validity (DAY expires at session end; GOOD_TILL_CANCEL stays open until filled or cancelled in the app). Then wait for the user's explicit yes. That yes covers exactly the orders in the table; any change means a fresh dry run and a fresh yes.
4. **Submit** the approved batch by rerunning the same command with `--confirm`. On a failure, stop and ask the user before sending anything further.
5. **Report** each placed order's ID and status, and list any orders left unplaced.
