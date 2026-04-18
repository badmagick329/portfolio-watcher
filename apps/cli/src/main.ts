import { createCliServices } from '@portfolio/composition';
import type {
  AppError,
  CategorizedInstrument,
  SyncStepResult,
} from '@portfolio/domain';
import { CATEGORIES_USAGE, parseCategoriesArgs } from './categories-cli';
import {
  PLACE_LIMIT_ORDER_USAGE,
  PLACE_ORDER_USAGE,
  parsePlaceLimitOrderArgs,
  parsePlaceOrderArgs,
} from './place-order-cli';
import { RISK_SYMBOLS_USAGE, parseRiskSymbolsArgs } from './risk-symbols-cli';

const main = async () => {
  const services = createCliServices();
  const [command, ...args] = process.argv.slice(2);

  await services.match(
    async (ops) => {
      if (!command || command === 'sync') {
        await ops.syncHistoricalOrders().match(
          (step: SyncStepResult) => console.log(step, 'done'),
          (e: AppError) => console.error(e),
        );

        await ops.syncInstrumentPrices().match(
          (summary) => console.log('instrument_prices', summary),
          (e: AppError) => console.error(e),
        );

        return;
      }

      if (command === 'place-live-order') {
        const parsed = parsePlaceOrderArgs(args);

        if (!parsed.ok) {
          console.error(parsed.error.message);
          console.log(PLACE_ORDER_USAGE);
          return;
        }

        await ops.placeLiveMarketOrder(parsed.value).match(
          (result) => {
            console.log('environment:', result.environment);
            console.log('mode:', result.executionMode);
            console.log(
              'instrument:',
              `${result.resolvedInstrument.name} (${result.resolvedInstrument.ticker})`,
            );
            console.log('side:', parsed.value.side);
            console.log('requestedMode:', result.requestedMode);
            console.log('requestedQuantity:', result.requestedQuantity);
            console.log('requestedValue:', result.requestedValue);
            console.log('derivedQuantity:', result.derivedQuantity);
            console.log('referencePrice:', result.referencePrice);
            console.log('extendedHours:', result.extendedHours);
            if (result.brokerOrder) {
              console.log('orderId:', result.brokerOrder.id);
              console.log('createdAt:', result.brokerOrder.createdAt);
              console.log('status:', result.brokerOrder.status);
            }
          },
          (e: AppError) => console.error(e.message),
        );

        return;
      }

      if (command === 'place-live-limit-order') {
        const parsed = parsePlaceLimitOrderArgs(args);

        if (!parsed.ok) {
          console.error(parsed.error.message);
          console.log(PLACE_LIMIT_ORDER_USAGE);
          return;
        }

        await ops.placeLiveLimitOrder(parsed.value).match(
          (result) => {
            console.log('environment:', result.environment);
            console.log('mode:', result.executionMode);
            console.log(
              'instrument:',
              `${result.resolvedInstrument.name} (${result.resolvedInstrument.ticker})`,
            );
            console.log('side:', parsed.value.side);
            console.log('requestedMode:', result.requestedMode);
            console.log('requestedQuantity:', result.requestedQuantity);
            console.log('derivedQuantity:', result.derivedQuantity);
            console.log('limitPrice:', result.limitPrice);
            console.log('timeValidity:', result.timeValidity);
            if (result.brokerOrder) {
              console.log('orderId:', result.brokerOrder.id);
              console.log('createdAt:', result.brokerOrder.createdAt);
              console.log('status:', result.brokerOrder.status);
            }
          },
          (e: AppError) => console.error(e.message),
        );

        return;
      }

      if (command === 'sync-instruments') {
        await ops.syncT212InstrumentCatalog().match(
          (count) => console.log('t212_instrument_catalog', { saved: count }),
          (e: AppError) => console.error(e),
        );

        return;
      }

      if (command === 'sync-risk-metrics') {
        await ops.syncInstrumentRiskMetrics().match(
          (summary) => console.log('instrument_risk_metrics', summary),
          (e: AppError) => console.error(e.message),
        );

        return;
      }

      if (command === 'risk-symbols') {
        const parsed = parseRiskSymbolsArgs(args);

        if (!parsed.ok) {
          console.error(parsed.error.message);
          console.log(RISK_SYMBOLS_USAGE);
          return;
        }

        if (parsed.value.action === 'set') {
          await ops.setInstrumentProviderSymbol(parsed.value.value).match(
            (result) => {
              console.log(
                'instrument:',
                `${result.instrument.name} (${result.instrument.ticker})`,
              );
              console.log('provider:', result.provider);
              console.log('symbol:', result.providerSymbol);
            },
            (e: AppError) => console.error(e.message),
          );
          return;
        }

        if (parsed.value.action === 'unset') {
          await ops.unsetInstrumentProviderSymbol(parsed.value.value).match(
            (result) => {
              console.log(
                'instrument:',
                `${result.instrument.name} (${result.instrument.ticker})`,
              );
              console.log('provider:', result.provider);
              console.log('symbol:', '-');
            },
            (e: AppError) => console.error(e.message),
          );
          return;
        }

        await ops.listInstrumentProviderSymbols(parsed.value.value.provider).match(
          (items) => console.log(formatInstrumentProviderSymbols(items)),
          (e: AppError) => console.error(e.message),
        );

        return;
      }

      if (command === 'categories') {
        const parsed = parseCategoriesArgs(args);

        if (!parsed.ok) {
          console.error(parsed.error.message);
          console.log(CATEGORIES_USAGE);
          return;
        }

        if (parsed.value.action === 'set') {
          await ops.setInstrumentCategory(parsed.value.value).match(
            (result) => {
              console.log(
                'instrument:',
                `${result.instrument.name} (${result.instrument.ticker})`,
              );
              console.log('category:', result.category);
            },
            (e: AppError) => console.error(e.message),
          );
          return;
        }

        if (parsed.value.action === 'unset') {
          await ops.unsetInstrumentCategory(parsed.value.value).match(
            (result) => {
              console.log(
                'instrument:',
                `${result.instrument.name} (${result.instrument.ticker})`,
              );
              console.log('category:', '-');
            },
            (e: AppError) => console.error(e.message),
          );
          return;
        }

        await ops.listCategorizedInstruments(parsed.value.value).match(
          (instruments) => console.log(formatCategorizedInstruments(instruments)),
          (e: AppError) => console.error(e.message),
        );

        return;
      }

      console.error(`Unknown command: ${command}`);
    },
    (e: AppError) => {
      console.error(e);
      return Promise.resolve();
    },
  );
};

main();

function formatCategorizedInstruments(items: CategorizedInstrument[]) {
  const rows = [
    ['CATEGORY', 'TICKER', 'NAME', 'ISIN'],
    ...items.map((item) => [
      item.category ?? '-',
      item.ticker,
      item.name,
      item.isin,
    ]),
  ];
  const widths = rows[0]?.map((_, columnIndex) =>
    Math.max(...rows.map((row) => row[columnIndex]?.length ?? 0)),
  ) ?? [0, 0, 0, 0];

  return rows
    .map((row) =>
      row
        .map((value, columnIndex) => value.padEnd(widths[columnIndex] ?? 0))
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
}

function formatInstrumentProviderSymbols(
  items: Array<{
    isin: string;
    provider: string;
    providerSymbol: string;
    updatedAt: string;
  }>,
) {
  const rows = [
    ['PROVIDER', 'SYMBOL', 'ISIN', 'UPDATED'],
    ...items.map((item) => [
      item.provider,
      item.providerSymbol,
      item.isin,
      item.updatedAt,
    ]),
  ];
  const widths = rows[0]?.map((_, columnIndex) =>
    Math.max(...rows.map((row) => row[columnIndex]?.length ?? 0)),
  ) ?? [0, 0, 0, 0];

  return rows
    .map((row) =>
      row
        .map((value, columnIndex) => value.padEnd(widths[columnIndex] ?? 0))
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
}
