import { createCliServices } from '@portfolio/composition';

const main = () => {
  createCliServices()
    .map((ops) => ops.syncHistoricalOrders)
    .match(
      () => console.log('done'),
      (e) => console.error(e),
    );
};

main();
