import type { AppError, SyncStepResult } from '@portfolio/domain';
import { createCliServices } from '@portfolio/composition';

const main = async () => {
  const services = createCliServices();

  await services.match(
    (ops) =>
      ops.syncHistoricalOrders().match(
        (step: SyncStepResult) => console.log(step, 'done'),
        (e: AppError) => console.error(e),
      ),
    (e: AppError) => {
      console.error(e);
      return Promise.resolve();
    },
  );
};

main();
