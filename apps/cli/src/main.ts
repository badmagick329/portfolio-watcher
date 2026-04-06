import { createCliServices } from '@portfolio/composition';
import type {
  AppError,
  SyncStepResult,
} from '@portfolio/domain';
import { PLACE_ORDER_USAGE, parsePlaceOrderArgs } from './place-order-cli';

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

      if (command === 'place-order') {
        const parsed = parsePlaceOrderArgs(args);

        if (!parsed.ok) {
          console.error(parsed.error.message);
          console.log(PLACE_ORDER_USAGE);
          return;
        }

        await ops.placeDemoMarketOrder(parsed.value).match(
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

      if (command === 'sync-instruments') {
        await ops.syncT212InstrumentCatalog().match(
          (count) => console.log('t212_instrument_catalog', { saved: count }),
          (e: AppError) => console.error(e),
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
