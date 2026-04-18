import type { AppError, InstrumentRiskProvider } from '@portfolio/domain';

type ParseRiskSymbolsResult =
  | {
      ok: true;
      value:
        | {
            action: 'set';
            value: {
              instrument: string;
              provider: InstrumentRiskProvider;
              symbol: string;
            };
          }
        | {
            action: 'unset';
            value: {
              instrument: string;
              provider: InstrumentRiskProvider;
            };
          }
        | {
            action: 'list';
            value: {
              provider: InstrumentRiskProvider;
            };
          };
    }
  | { ok: false; error: AppError };

const RISK_SYMBOLS_USAGE =
  'Usage: pnpm cli -- risk-symbols <set|unset|list> [--instrument <value>] [--provider fmp] [--symbol <value>]';

const parseRiskSymbolsArgs = (args: string[]): ParseRiskSymbolsResult => {
  const [action, ...rest] = args;

  if (action !== 'set' && action !== 'unset' && action !== 'list') {
    return {
      ok: false,
      error: validationError('The risk-symbols command must be set, unset, or list.'),
    };
  }

  const flags = parseFlags(rest);
  const provider = parseProvider(flags.provider ?? 'fmp');

  if (!provider) {
    return {
      ok: false,
      error: validationError('Only --provider fmp is supported.'),
    };
  }

  if (action === 'list') {
    return {
      ok: true,
      value: {
        action,
        value: { provider },
      },
    };
  }

  const instrument = flags.instrument?.trim() ?? '';

  if (!instrument) {
    return {
      ok: false,
      error: validationError('The --instrument flag is required.'),
    };
  }

  if (action === 'unset') {
    return {
      ok: true,
      value: {
        action,
        value: { instrument, provider },
      },
    };
  }

  const symbol = flags.symbol?.trim() ?? '';

  if (!symbol) {
    return {
      ok: false,
      error: validationError('The --symbol flag is required.'),
    };
  }

  return {
    ok: true,
    value: {
      action,
      value: { instrument, provider, symbol },
    },
  };
};

const parseProvider = (value: string): InstrumentRiskProvider | null =>
  value === 'fmp' ? value : null;

const parseFlags = (args: string[]) => {
  const flags: Record<string, string | undefined> = {};

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];

    if (!flag?.startsWith('--')) {
      continue;
    }

    flags[flag.slice(2)] = args[index + 1];
    index += 1;
  }

  return flags;
};

const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

export { RISK_SYMBOLS_USAGE, parseRiskSymbolsArgs };
