import type {
  AppError,
  PlaceLimitOrderInput,
  PlaceMarketOrderInput,
} from '@portfolio/domain';

const PLACE_ORDER_USAGE =
  'Usage: pnpm cli -- place-live-order --instrument <value> --side <buy|sell> (--quantity <number> | --value <number>) [--extended-hours] [--confirm]';

const PLACE_LIMIT_ORDER_USAGE =
  'Usage: pnpm cli -- place-live-limit-order --instrument <value> --side <buy|sell> --quantity <number> --limit-price <number> [--confirm]';

const parsePlaceOrderArgs = (
  args: string[],
):
  | {
      ok: false;
      error: AppError;
    }
  | {
      ok: true;
      value: PlaceMarketOrderInput;
    } => {
  const parsed: Partial<PlaceMarketOrderInput> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg) {
      continue;
    }

    if (arg === '--extended-hours') {
      parsed.extendedHours = true;
      continue;
    }

    if (arg === '--confirm') {
      parsed.confirm = true;
      continue;
    }

    const nextValue = args[index + 1];

    if (!nextValue) {
      return { ok: false, error: validationError(`Missing value for ${arg}.`) };
    }

    if (arg === '--instrument') {
      parsed.instrument = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--side') {
      parsed.side = nextValue as PlaceMarketOrderInput['side'];
      index += 1;
      continue;
    }

    if (arg === '--quantity') {
      parsed.quantity = Number(nextValue);
      index += 1;
      continue;
    }

    if (arg === '--value') {
      parsed.value = Number(nextValue);
      index += 1;
      continue;
    }

    return { ok: false, error: validationError(`Unknown flag: ${arg}.`) };
  }

  if (!parsed.instrument?.trim()) {
    return {
      ok: false,
      error: validationError('The --instrument flag is required.'),
    };
  }

  if (parsed.side !== 'buy' && parsed.side !== 'sell') {
    return {
      ok: false,
      error: validationError('The --side flag must be either "buy" or "sell".'),
    };
  }

  const hasQuantity = parsed.quantity !== undefined;
  const hasValue = parsed.value !== undefined;
  const quantity = parsed.quantity;
  const value = parsed.value;

  if (hasQuantity === hasValue) {
    return {
      ok: false,
      error: validationError('Provide exactly one of --quantity or --value.'),
    };
  }

  if (hasQuantity && (!Number.isFinite(quantity ?? NaN) || (quantity ?? 0) <= 0)) {
    return {
      ok: false,
      error: validationError('The --quantity flag must be a positive number.'),
    };
  }

  if (hasValue && (!Number.isFinite(value ?? NaN) || (value ?? 0) <= 0)) {
    return {
      ok: false,
      error: validationError('The --value flag must be a positive number.'),
    };
  }

  return {
    ok: true,
    value: {
      instrument: parsed.instrument,
      side: parsed.side,
      quantity: parsed.quantity,
      value: parsed.value,
      extendedHours: parsed.extendedHours ?? false,
      confirm: parsed.confirm ?? false,
    },
  };
};

const parsePlaceLimitOrderArgs = (
  args: string[],
):
  | {
      ok: false;
      error: AppError;
    }
  | {
      ok: true;
      value: PlaceLimitOrderInput;
    } => {
  const parsed: Partial<PlaceLimitOrderInput> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg) {
      continue;
    }

    if (arg === '--confirm') {
      parsed.confirm = true;
      continue;
    }

    if (arg === '--extended-hours') {
      return {
        ok: false,
        error: validationError(
          'The --extended-hours flag is not supported for limit orders.',
        ),
      };
    }

    if (arg === '--value') {
      return {
        ok: false,
        error: validationError('The --value flag is not supported for limit orders.'),
      };
    }

    const nextValue = args[index + 1];

    if (!nextValue) {
      return { ok: false, error: validationError(`Missing value for ${arg}.`) };
    }

    if (arg === '--instrument') {
      parsed.instrument = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--side') {
      parsed.side = nextValue as PlaceLimitOrderInput['side'];
      index += 1;
      continue;
    }

    if (arg === '--quantity') {
      parsed.quantity = Number(nextValue);
      index += 1;
      continue;
    }

    if (arg === '--limit-price') {
      parsed.limitPrice = Number(nextValue);
      index += 1;
      continue;
    }

    return { ok: false, error: validationError(`Unknown flag: ${arg}.`) };
  }

  if (!parsed.instrument?.trim()) {
    return {
      ok: false,
      error: validationError('The --instrument flag is required.'),
    };
  }

  if (parsed.side !== 'buy' && parsed.side !== 'sell') {
    return {
      ok: false,
      error: validationError('The --side flag must be either "buy" or "sell".'),
    };
  }

  if (
    parsed.quantity === undefined ||
    !Number.isFinite(parsed.quantity) ||
    parsed.quantity <= 0
  ) {
    return {
      ok: false,
      error: validationError('The --quantity flag must be a positive number.'),
    };
  }

  if (
    parsed.limitPrice === undefined ||
    !Number.isFinite(parsed.limitPrice) ||
    parsed.limitPrice <= 0
  ) {
    return {
      ok: false,
      error: validationError('The --limit-price flag must be a positive number.'),
    };
  }

  return {
    ok: true,
    value: {
      instrument: parsed.instrument,
      side: parsed.side,
      quantity: parsed.quantity,
      limitPrice: parsed.limitPrice,
      confirm: parsed.confirm ?? false,
    },
  };
};

const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

export {
  parsePlaceLimitOrderArgs,
  parsePlaceOrderArgs,
  PLACE_LIMIT_ORDER_USAGE,
  PLACE_ORDER_USAGE,
};
