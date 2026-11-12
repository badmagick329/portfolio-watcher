import type {
  AppError,
  PlaceLimitOrderInput,
  PlaceLimitOrderResult,
} from '@portfolio/domain';
import { describe, expect, test } from 'vitest';
import {
  formatLimitLadderRun,
  isLimitLadderHelpRequest,
  LIMIT_LADDER_EXAMPLE_ARGS,
  LIMIT_LADDER_HELP,
  LIMIT_LADDER_SELL_EXAMPLE_ARGS,
  parseLimitLadderArgs,
  planLimitLadder,
  runLimitLadder,
  type LimitLadderInput,
} from '../limit-ladder-cli';

const muLadderArgs = [
  '--instrument',
  'MU',
  '--side',
  'buy',
  '--step',
  '5',
  '--tier',
  '800-750:5',
  '--tier',
  '745-700:10',
];

const parse = (args: string[]) => {
  const result = parseLimitLadderArgs(args);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
};

const plan = (input: Pick<LimitLadderInput, 'step' | 'tiers'>) => {
  const result = planLimitLadder(input);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
};

const fakeResult = (
  input: PlaceLimitOrderInput,
  id: number,
): PlaceLimitOrderResult => ({
  environment: 'live',
  executionMode: input.confirm ? 'submitted' : 'dry_run',
  resolvedInstrument: {
    ticker: 'MU_US_EQ',
    isin: 'US5951121038',
    name: 'Micron Technology',
  } as PlaceLimitOrderResult['resolvedInstrument'],
  requestedMode: 'quantity',
  requestedQuantity: input.quantity,
  requestedValue: null,
  derivedQuantity: input.quantity,
  referencePrice: null,
  extendedHours: false,
  limitPrice: input.limitPrice,
  timeValidity: input.timeValidity ?? 'DAY',
  brokerOrder: input.confirm
    ? ({ id, status: 'NEW' } as PlaceLimitOrderResult['brokerOrder'])
    : null,
  auditWarning: null,
});

const fakeBroker = (
  failAtCall?: number,
  failWith: AppError = { code: 'VALIDATION', message: 'rejected' },
) => {
  const calls: PlaceLimitOrderInput[] = [];
  const placeLimitOrder = (input: PlaceLimitOrderInput) => {
    calls.push(input);
    const callNumber = calls.length;
    return {
      match: <A>(
        ok: (value: PlaceLimitOrderResult) => A,
        err: (error: AppError) => A,
      ) =>
        Promise.resolve(
          callNumber === failAtCall
            ? err(failWith)
            : ok(fakeResult(input, 1000 + callNumber)),
        ),
    };
  };
  return { calls, placeLimitOrder };
};

describe('help', () => {
  test('shows for no flags or a help flag only', () => {
    expect(isLimitLadderHelpRequest([])).toBe(true);
    expect(isLimitLadderHelpRequest(['--help'])).toBe(true);
    expect(isLimitLadderHelpRequest(['-h'])).toBe(true);
    expect(isLimitLadderHelpRequest(['help'])).toBe(true);
    expect(isLimitLadderHelpRequest(muLadderArgs)).toBe(false);
  });

  test('documents every flag the parser accepts', () => {
    for (const flag of [
      '--instrument',
      '--side',
      '--step',
      '--tier',
      '--time-validity',
      '--confirm',
    ]) {
      expect(LIMIT_LADDER_HELP).toContain(flag);
    }
  });

  test('example is a valid 11-order ladder', () => {
    expect(LIMIT_LADDER_HELP).toContain(LIMIT_LADDER_EXAMPLE_ARGS.join(' '));
    expect(plan(parse(LIMIT_LADDER_EXAMPLE_ARGS))).toHaveLength(11);
  });

  test('sell example is a valid 7-order ladder with ascending prices', () => {
    expect(LIMIT_LADDER_HELP).toContain(
      LIMIT_LADDER_SELL_EXAMPLE_ARGS.join(' '),
    );

    const input = parse(LIMIT_LADDER_SELL_EXAMPLE_ARGS);
    const prices = plan(input).map((order) => order.limitPrice);

    expect(input.side).toBe('sell');
    expect(prices).toHaveLength(7);
    expect(prices.slice(1).every((price, i) => price > prices[i]!)).toBe(true);
  });
});

describe('parseLimitLadderArgs', () => {
  test('parses a two-tier ladder as a DAY dry run by default', () => {
    expect(parse(muLadderArgs)).toEqual({
      instrument: 'MU',
      side: 'buy',
      step: 5,
      tiers: [
        { from: 800, to: 750, amount: 5 },
        { from: 745, to: 700, amount: 10 },
      ],
      timeValidity: 'DAY',
      confirm: false,
    });
  });

  test('accepts gtc as GOOD_TILL_CANCEL', () => {
    expect(
      parse([...muLadderArgs, '--time-validity', 'gtc']).timeValidity,
    ).toBe('GOOD_TILL_CANCEL');
  });

  test('rejects a malformed tier', () => {
    const result = parseLimitLadderArgs([
      '--instrument',
      'MU',
      '--side',
      'buy',
      '--step',
      '5',
      '--tier',
      '800:750:5',
    ]);

    expect(result.ok).toBe(false);
  });

  test('requires at least one tier', () => {
    const result = parseLimitLadderArgs([
      '--instrument',
      'MU',
      '--side',
      'buy',
      '--step',
      '5',
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('At least one --tier is required.');
    }
  });
});

describe('planLimitLadder', () => {
  test('expands the MU ladder into 21 orders with floored quantities', () => {
    const orders = plan(parse(muLadderArgs));

    expect(orders).toHaveLength(21);
    expect(orders[0]).toEqual({ limitPrice: 800, amount: 5, quantity: 0.006 });
    expect(orders[10]).toEqual({ limitPrice: 750, amount: 5, quantity: 0.006 });
    expect(orders[11]).toEqual({
      limitPrice: 745,
      amount: 10,
      quantity: 0.013,
    });
    expect(orders[20]).toEqual({
      limitPrice: 700,
      amount: 10,
      quantity: 0.014,
    });
  });

  test('steps upward when the tier runs from low to high', () => {
    const orders = plan({ step: 2.5, tiers: [{ from: 10, to: 15, amount: 7 }] });

    expect(orders.map((order) => order.limitPrice)).toEqual([10, 12.5, 15]);
  });

  test('plans a two-tier sell ladder upward with each tier amount', () => {
    const orders = plan({
      step: 5,
      tiers: [
        { from: 500, to: 510, amount: 10 },
        { from: 515, to: 530, amount: 20 },
      ],
    });

    expect(
      orders.map(({ limitPrice, amount }) => [limitPrice, amount]),
    ).toEqual([
      [500, 10],
      [505, 10],
      [510, 10],
      [515, 20],
      [520, 20],
      [525, 20],
      [530, 20],
    ]);
  });

  test('does not floor exact divisions down a step', () => {
    const orders = plan({ step: 5, tiers: [{ from: 700, to: 700, amount: 7 }] });

    expect(orders[0]?.quantity).toBe(0.01);
  });

  test('rejects tiers that share a price', () => {
    const result = planLimitLadder({
      step: 5,
      tiers: [
        { from: 800, to: 750, amount: 5 },
        { from: 750, to: 700, amount: 10 },
      ],
    });

    expect(result.ok).toBe(false);
  });

  test('rejects a tier that is not a whole number of steps', () => {
    const result = planLimitLadder({
      step: 5,
      tiers: [{ from: 800, to: 748, amount: 5 }],
    });

    expect(result.ok).toBe(false);
  });

  test('rejects an amount that buys zero shares', () => {
    const result = planLimitLadder({
      step: 5,
      tiers: [{ from: 800, to: 800, amount: 0.5 }],
    });

    expect(result.ok).toBe(false);
  });

  test('rejects more orders than the per-ticker pending cap', () => {
    const result = planLimitLadder({
      step: 1,
      tiers: [{ from: 100, to: 50, amount: 100 }],
    });

    expect(result.ok).toBe(false);
  });
});

describe('runLimitLadder', () => {
  test('sends the requested time validity on every order', async () => {
    const day = parse(muLadderArgs);
    const gtc = parse([...muLadderArgs, '--time-validity', 'gtc']);
    const dayBroker = fakeBroker();
    const gtcBroker = fakeBroker();

    await runLimitLadder({
      input: day,
      orders: plan(day).slice(0, 2),
      placeLimitOrder: dayBroker.placeLimitOrder,
    });
    await runLimitLadder({
      input: gtc,
      orders: plan(gtc).slice(0, 2),
      placeLimitOrder: gtcBroker.placeLimitOrder,
    });

    expect(dayBroker.calls.map((call) => call.timeValidity)).toEqual([
      'DAY',
      'DAY',
    ]);
    expect(gtcBroker.calls.map((call) => call.timeValidity)).toEqual([
      'GOOD_TILL_CANCEL',
      'GOOD_TILL_CANCEL',
    ]);
  });

  test('sends side sell on every order of a sell ladder', async () => {
    const input = parse(LIMIT_LADDER_SELL_EXAMPLE_ARGS);
    const broker = fakeBroker();

    await runLimitLadder({
      input,
      orders: plan(input),
      placeLimitOrder: broker.placeLimitOrder,
    });

    expect(broker.calls).toHaveLength(7);
    expect(broker.calls.every((call) => call.side === 'sell')).toBe(true);
  });

  test('reuses the first resolved ticker for later orders', async () => {
    const input = parse(muLadderArgs);
    const broker = fakeBroker();

    await runLimitLadder({
      input,
      orders: plan(input).slice(0, 3),
      placeLimitOrder: broker.placeLimitOrder,
    });

    expect(broker.calls.map((call) => call.instrument)).toEqual([
      'MU',
      'MU_US_EQ',
      'MU_US_EQ',
    ]);
  });

  test('stops at the first failure and lists the rest as unplaced', async () => {
    const input = parse([...muLadderArgs, '--confirm']);
    const broker = fakeBroker(2);

    const run = await runLimitLadder({
      input,
      orders: plan(input).slice(0, 4),
      placeLimitOrder: broker.placeLimitOrder,
      wait: () => Promise.resolve(),
    });

    expect(broker.calls).toHaveLength(2);
    expect(run.outcomes[1]?.error?.message).toBe('rejected');
    expect(run.unplaced.map((order) => order.limitPrice)).toEqual([790, 785]);
    expect(formatLimitLadderRun(input, run)).toContain('not sent');
  });

  test('marks an uncertain level and lists only the levels to resubmit', async () => {
    const input = parse([...muLadderArgs, '--confirm']);
    const broker = fakeBroker(3, {
      code: 'ORDER_OUTCOME_UNKNOWN',
      message: 'Trading 212 may have placed this order.',
    });

    const run = await runLimitLadder({
      input,
      orders: plan(input).slice(0, 5),
      placeLimitOrder: broker.placeLimitOrder,
      wait: () => Promise.resolve(),
    });
    const lines = formatLimitLadderRun(input, run).split('\n');

    expect(broker.calls).toHaveLength(3);
    expect(lines.find((line) => line.startsWith('3 '))).toContain('UNCERTAIN');
    expect(lines).toContain(
      'UNCERTAIN #3 at 790.00: Trading 212 may have placed this order.',
    );
    expect(lines).toContain(
      'placed: #1 at 800.00, #2 at 795.00. Do not resubmit these; re-running this ladder places them again.',
    );
    expect(lines).toContain(
      'resubmit only: #4 at 785.00, #5 at 780.00, #3 at 790.00 only if Trading 212 shows no order for it.',
    );
  });

  test('lists a rejected level for resubmission without calling it uncertain', async () => {
    const input = parse([...muLadderArgs, '--confirm']);
    const run = await runLimitLadder({
      input,
      orders: plan(input).slice(0, 3),
      placeLimitOrder: fakeBroker(2).placeLimitOrder,
      wait: () => Promise.resolve(),
    });
    const output = formatLimitLadderRun(input, run);

    expect(output).toContain('FAILED: rejected');
    expect(output).not.toContain('UNCERTAIN');
    expect(output).toContain('resubmit only: #2 at 795.00, #3 at 790.00.');
  });

  test('spaces live submissions but not dry runs', async () => {
    const waits: number[] = [];
    const wait = (ms: number) => {
      waits.push(ms);
      return Promise.resolve();
    };
    const dryRun = parse(muLadderArgs);
    const live = parse([...muLadderArgs, '--confirm']);

    await runLimitLadder({
      input: dryRun,
      orders: plan(dryRun).slice(0, 3),
      placeLimitOrder: fakeBroker().placeLimitOrder,
      wait,
    });
    expect(waits).toEqual([]);

    await runLimitLadder({
      input: live,
      orders: plan(live).slice(0, 3),
      placeLimitOrder: fakeBroker().placeLimitOrder,
      wait,
    });
    expect(waits).toHaveLength(2);
  });
});
