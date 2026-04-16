import type {
  AppError,
  InstrumentCategoryFilter,
  SetInstrumentCategoryInput,
  UnsetInstrumentCategoryInput,
} from '@portfolio/domain';

const CATEGORIES_USAGE =
  'Usage: pnpm cli -- categories <set|unset|list> [--instrument <value>] [--category <value>] [--include <a,b>] [--exclude <x,y>]';

type CategoriesCommand =
  | { action: 'set'; value: SetInstrumentCategoryInput }
  | { action: 'unset'; value: UnsetInstrumentCategoryInput }
  | { action: 'list'; value: InstrumentCategoryFilter };

const parseCategoriesArgs = (
  args: string[],
):
  | {
      ok: false;
      error: AppError;
    }
  | {
      ok: true;
      value: CategoriesCommand;
    } => {
  const [action, ...flags] = args;

  if (action !== 'set' && action !== 'unset' && action !== 'list') {
    return {
      ok: false,
      error: validationError('The categories command must be set, unset, or list.'),
    };
  }

  const parsed: {
    instrument?: string;
    category?: string;
    includeCategories?: string[];
    excludeCategories?: string[];
  } = {};

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    const nextValue = flags[index + 1];

    if (!flag) {
      continue;
    }

    if (!nextValue) {
      return { ok: false, error: validationError(`Missing value for ${flag}.`) };
    }

    if (flag === '--instrument') {
      parsed.instrument = nextValue;
      index += 1;
      continue;
    }

    if (flag === '--category') {
      parsed.category = normalizeCategory(nextValue);
      index += 1;
      continue;
    }

    if (flag === '--include') {
      parsed.includeCategories = parseCategoryList(nextValue);
      index += 1;
      continue;
    }

    if (flag === '--exclude') {
      parsed.excludeCategories = parseCategoryList(nextValue);
      index += 1;
      continue;
    }

    return { ok: false, error: validationError(`Unknown flag: ${flag}.`) };
  }

  if (action === 'set') {
    if (!parsed.instrument?.trim()) {
      return {
        ok: false,
        error: validationError('The --instrument flag is required.'),
      };
    }

    if (!parsed.category) {
      return {
        ok: false,
        error: validationError('The --category flag is required.'),
      };
    }

    return {
      ok: true,
      value: {
        action,
        value: {
          instrument: parsed.instrument,
          category: parsed.category,
        },
      },
    };
  }

  if (action === 'unset') {
    if (!parsed.instrument?.trim()) {
      return {
        ok: false,
        error: validationError('The --instrument flag is required.'),
      };
    }

    return {
      ok: true,
      value: {
        action,
        value: {
          instrument: parsed.instrument,
        },
      },
    };
  }

  const includeCategories = parsed.includeCategories ?? [];
  const excludeCategories = parsed.excludeCategories ?? [];
  const excluded = new Set(excludeCategories);
  const overlap = includeCategories.find((category) => excluded.has(category));

  if (overlap) {
    return {
      ok: false,
      error: validationError(
        `Category "${overlap}" cannot be both included and excluded.`,
      ),
    };
  }

  return {
    ok: true,
    value: {
      action,
      value: {
        includeCategories,
        excludeCategories,
      },
    },
  };
};

const parseCategoryList = (value: string) =>
  [...new Set(value.split(',').map(normalizeCategory).filter(Boolean))];

const normalizeCategory = (category: string) => category.trim().toLowerCase();

const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

export { CATEGORIES_USAGE, parseCategoriesArgs };
