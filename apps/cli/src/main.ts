import { createCliServices } from '@portfolio/composition';

const main = async () => {
  const services = createCliServices();

  await services.match(
    (ops) =>
      ops.syncHistoricalOrders().match(
        (step) => console.log(step, 'done'),
        (e) => console.error(e),
      ),
    (e) => {
      console.error(e);
      return Promise.resolve();
    },
  );
};

main();
