import type {
  AppError,
  LimitOrderTimeValidity,
  PlaceLimitOrderInput,
  PlaceLimitOrderResult,
} from '@portfolio/domain';
import { parseTimeValidity, timeValidityError } from './place-order-cli';

const LIMIT_LADDER_USAGE =
  'Usage: place-live-limit-ladder --instrument <ticker> --side <buy|sell> --step <price> --tier <from>-<to>:<amount> [--tier ...] [--time-validity <day|gtc>] [--confirm]\nRun with --help for flag details and examples.';

/** Trading 212 accepts at most 3 decimal places on quantity. */
const QUANTITY_DECIMALS = 3;

/** Trading 212 caps pending orders at 50 per ticker, per account. */
const MAX_PENDING_ORDERS_PER_TICKER = 50;

/** Trading 212 allows one limit order request every 2 seconds. */
const SUBMIT_INTERVAL_MS = 2_100;

/** Shown in --help; a test keeps it a valid, 11-order ladder. */
const LIMIT_LADDER_EXAMPLE_ARGS = [
  '--instrument',
  'AMD',
  '--side',
  'buy',
  '--step',
  '2',
  '--tier',
  '150-140:20',
  '--tier',
  '138-130:40',
];

/** Shown in --help; a test keeps it a valid, 7-order ascending ladder. */
const LIMIT_LADDER_SELL_EXAMPLE_ARGS = [
  '--instrument',
  'AMD',
  '--side',
  'sell',
  '--step',
  '5',
  '--tier',
  '170-180:10',
  '--tier',
  '185-200:20',
];

const isLimitLadderHelpRequest = (args: string[]) =>
  args.length === 0 ||
  args.some((arg) => arg === '--help' || arg === '-h' || arg === 'help');

const LIMIT_LADDER_HELP = `place-live-limit-ladder: place one limit order per price level, each worth a set cash amount.

Usage:
  place-live-limit-ladder --instrument <ticker> --side <buy|sell> --step <price>
    --tier <from>-<to>:<amount> [--tier ...] [--time-validity <day|gtc>] [--confirm]

Flags:
  --instrument <ticker>         Instrument to trade, e.g. AMD or AMD_US_EQ. Must match one instrument.
  --side <buy|sell>             Side for every order in the ladder.
  --step <price>                Price gap between levels, in the instrument's currency.
  --tier <from>-<to>:<amount>   One order every --step from <from> to <to>, both included, each
                                worth up to <amount>. Repeat for more tiers; tiers must not
                                share a price. Run from high to low for buys, low to high for sells.
                                A sell level below the market price fills immediately.
  --time-validity <day|gtc>     day (default) expires unfilled orders at session end;
                                gtc keeps them open until filled or cancelled.
  --confirm                     Send the orders live. Without it this is a dry run: nothing
                                reaches the broker.
  --help                        Show this help.

Shares per order are <amount> / price, rounded down to ${QUANTITY_DECIMALS} decimals so no order exceeds
its amount. Trading 212 allows ${MAX_PENDING_ORDERS_PER_TICKER} pending orders per ticker; gtc orders
from earlier runs count toward it.

Examples:
  place-live-limit-ladder ${LIMIT_LADDER_EXAMPLE_ARGS.join(' ')}
  11 buys: $20 each at 150, 148, ... 140, then $40 each at 138, 136, ... 130.

  place-live-limit-ladder ${LIMIT_LADDER_SELL_EXAMPLE_ARGS.join(' ')}
  7 sells: $10 each at 170, 175, 180, then $20 each at 185, 190, ... 200.

Asking an agent:
  "AMD buy ladder, step $2: 150-140 at $20, 138-130 at $40."
  "AMD sell ladder, step $5: 170-180 at $10, 185-200 at $20."`;

type LadderTier = { from: number; to: number; amount: number };

type LimitLadderInput = {
  instrument: string;
  side: 'buy' | 'sell';
  step: number;
  tiers: LadderTier[];
  timeValidity: LimitOrderTimeValidity;
  confirm: boolean;
};

type LadderOrder = { limitPrice: number; amount: number; quantity: number };

type LadderOrderOutcome = LadderOrder & {
  result: PlaceLimitOrderResult | null;
  error: AppError | null;
};

type LadderRun = {
  ticker: string | null;
  outcomes: LadderOrderOutcome[];
  unplaced: LadderOrder[];
};

type ParseResult<T> = { ok: false; error: AppError } | { ok: true; value: T };

/** Structural slice of ResultAsync so the CLI need not depend on neverthrow. */
type PlaceLimitOrder = (input: PlaceLimitOrderInput) => {
  match<A>(
    ok: (value: PlaceLimitOrderResult) => A,
    err: (error: AppError) => A,
  ): Promise<A>;
};

const parseLimitLadderArgs = (args: string[]): ParseResult<LimitLadderInput> => {
  let instrument: string | undefined;
  let side: string | undefined;
  let step: number | undefined;
  let timeValidity: LimitOrderTimeValidity = 'DAY';
  let confirm = false;
  const tiers: LadderTier[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg) {
      continue;
    }

    if (arg === '--confirm') {
      confirm = true;
      continue;
    }

    const nextValue = args[index + 1];

    if (!nextValue) {
      return { ok: false, error: validationError(`Missing value for ${arg}.`) };
    }

    index += 1;

    if (arg === '--instrument') {
      instrument = nextValue;
    } else if (arg === '--side') {
      side = nextValue;
    } else if (arg === '--step') {
      step = Number(nextValue);
    } else if (arg === '--tier') {
      const tier = parseTier(nextValue);
      if (!tier) {
        return {
          ok: false,
          error: validationError(
            `Invalid --tier "${nextValue}". Expected <from>-<to>:<amount>, e.g. 800-750:5.`,
          ),
        };
      }
      tiers.push(tier);
    } else if (arg === '--time-validity') {
      const parsed = parseTimeValidity(nextValue);
      if (!parsed) {
        return { ok: false, error: timeValidityError() };
      }
      timeValidity = parsed;
    } else {
      return { ok: false, error: validationError(`Unknown flag: ${arg}.`) };
    }
  }

  if (!instrument?.trim()) {
    return {
      ok: false,
      error: validationError('The --instrument flag is required.'),
    };
  }

  if (side !== 'buy' && side !== 'sell') {
    return {
      ok: false,
      error: validationError('The --side flag must be either "buy" or "sell".'),
    };
  }

  if (step === undefined || !Number.isFinite(step) || step <= 0) {
    return {
      ok: false,
      error: validationError('The --step flag must be a positive number.'),
    };
  }

  if (tiers.length === 0) {
    return {
      ok: false,
      error: validationError('At least one --tier is required.'),
    };
  }

  return {
    ok: true,
    value: { instrument, side, step, tiers, timeValidity, confirm },
  };
};

/**
 * Expands tiers into one order per price level, `from` to `to` inclusive.
 * Quantity is amount ÷ price rounded down, so no order exceeds its amount.
 * Prices are stepped in integer cents to avoid float drift across levels.
 */
const planLimitLadder = (
  input: Pick<LimitLadderInput, 'step' | 'tiers'>,
): ParseResult<LadderOrder[]> => {
  const stepCents = toCents(input.step);
  const orders: LadderOrder[] = [];
  const seenCents = new Set<number>();

  for (const tier of input.tiers) {
    const fromCents = toCents(tier.from);
    const toCentsValue = toCents(tier.to);
    const span = Math.abs(fromCents - toCentsValue);

    if (span % stepCents !== 0) {
      return {
        ok: false,
        error: validationError(
          `Tier ${tier.from}-${tier.to} is not a whole number of ${input.step} steps.`,
        ),
      };
    }

    const direction = toCentsValue < fromCents ? -1 : 1;

    for (let offset = 0; offset <= span; offset += stepCents) {
      const priceCents = fromCents + direction * offset;

      if (seenCents.has(priceCents)) {
        return {
          ok: false,
          error: validationError(
            `Price ${priceCents / 100} appears in more than one tier.`,
          ),
        };
      }
      seenCents.add(priceCents);

      const limitPrice = priceCents / 100;
      const quantity = floorQuantity(tier.amount / limitPrice);

      if (quantity <= 0) {
        return {
          ok: false,
          error: validationError(
            `Amount ${tier.amount} rounds to 0 shares at ${limitPrice}.`,
          ),
        };
      }

      orders.push({ limitPrice, amount: tier.amount, quantity });
    }
  }

  if (orders.length > MAX_PENDING_ORDERS_PER_TICKER) {
    return {
      ok: false,
      error: validationError(
        `Ladder has ${orders.length} orders; Trading 212 allows ${MAX_PENDING_ORDERS_PER_TICKER} pending orders per ticker.`,
      ),
    };
  }

  return { ok: true, value: orders };
};

/**
 * Places (or dry-runs) each order in sequence and stops at the first failure,
 * so a rejected order never leaves later levels half-submitted. The ticker
 * resolved by the first order is reused for the rest to skip fuzzy matching.
 */
const runLimitLadder = async ({
  input,
  orders,
  placeLimitOrder,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: {
  input: LimitLadderInput;
  orders: LadderOrder[];
  placeLimitOrder: PlaceLimitOrder;
  wait?: (ms: number) => Promise<void>;
}): Promise<LadderRun> => {
  const outcomes: LadderOrderOutcome[] = [];
  let ticker: string | null = null;

  for (const [index, order] of orders.entries()) {
    if (input.confirm && index > 0) {
      await wait(SUBMIT_INTERVAL_MS);
    }

    const outcome: LadderOrderOutcome = await placeLimitOrder({
      instrument: ticker ?? input.instrument,
      side: input.side,
      quantity: order.quantity,
      limitPrice: order.limitPrice,
      timeValidity: input.timeValidity,
      confirm: input.confirm,
    }).match(
      (result): LadderOrderOutcome => ({ ...order, result, error: null }),
      (error): LadderOrderOutcome => ({ ...order, result: null, error }),
    );

    outcomes.push(outcome);

    if (outcome.error) {
      return { ticker, outcomes, unplaced: orders.slice(index + 1) };
    }

    ticker ??= outcome.result?.resolvedInstrument.ticker ?? null;
  }

  return { ticker, outcomes, unplaced: [] };
};

const formatLimitLadderRun = (input: LimitLadderInput, run: LadderRun) => {
  const instrument =
    run.outcomes.find((outcome) => outcome.result)?.result?.resolvedInstrument;
  const header = ['#', 'SIDE', 'LIMIT', 'AMOUNT', 'QTY', 'COST', 'RESULT'];
  const rows = [...run.outcomes, ...run.unplaced].map((order, index) => [
    String(index + 1),
    input.side,
    order.limitPrice.toFixed(2),
    order.amount.toFixed(2),
    order.quantity.toFixed(QUANTITY_DECIMALS),
    (order.quantity * order.limitPrice).toFixed(2),
    describeResult(order),
  ]);
  const succeeded = run.outcomes.filter((outcome) => !outcome.error);
  const totalQuantity = sum(succeeded.map((o) => o.quantity));
  const totalCost = sum(succeeded.map((o) => o.quantity * o.limitPrice));

  return [
    `instrument: ${instrument ? `${instrument.name} (${instrument.ticker})` : input.instrument}`,
    `mode: ${input.confirm ? 'submitted' : 'dry_run'}`,
    `timeValidity: ${input.timeValidity}`,
    '',
    formatTable([header, ...rows]),
    '',
    `total: ${totalQuantity.toFixed(QUANTITY_DECIMALS)} shares, ${totalCost.toFixed(2)} across ${succeeded.length} order(s)`,
  ].join('\n');
};

const describeResult = (order: LadderOrder | LadderOrderOutcome) => {
  if (!('result' in order)) {
    return 'not sent';
  }

  if (order.error) {
    return `FAILED: ${order.error.message}`;
  }

  const brokerOrder = order.result?.brokerOrder;
  return brokerOrder ? `${brokerOrder.id} ${brokerOrder.status}` : 'dry run ok';
};

const parseTier = (value: string): LadderTier | null => {
  const match = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(value);

  if (!match) {
    return null;
  }

  const [from, to, amount] = match.slice(1).map(Number) as [
    number,
    number,
    number,
  ];

  return from > 0 && to > 0 && amount > 0 ? { from, to, amount } : null;
};

const floorQuantity = (raw: number) => {
  const factor = 10 ** QUANTITY_DECIMALS;
  // The epsilon keeps exact divisions such as 7 / 700 from flooring to 0.009.
  return Math.floor(raw * factor + 1e-9) / factor;
};

const toCents = (value: number) => Math.round(value * 100);

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);

const formatTable = (rows: string[][]) => {
  const widths = rows[0]?.map((_, column) =>
    Math.max(...rows.map((row) => row[column]?.length ?? 0)),
  ) ?? [];

  return rows
    .map((row) =>
      row
        .map((value, column) => value.padEnd(widths[column] ?? 0))
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
};

const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

export {
  formatLimitLadderRun,
  isLimitLadderHelpRequest,
  LIMIT_LADDER_EXAMPLE_ARGS,
  LIMIT_LADDER_HELP,
  LIMIT_LADDER_SELL_EXAMPLE_ARGS,
  LIMIT_LADDER_USAGE,
  parseLimitLadderArgs,
  planLimitLadder,
  runLimitLadder,
};
export type { LadderOrder, LimitLadderInput };
