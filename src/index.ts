import { createLoggerFactory } from "@/infra/console-logger";
import { createDiskCache } from "@/infra/disk-cache";
import { createTrading212ClientWithCache } from "@/infra/trading212-client";

const main = async () => {
  const loggerCreator = createLoggerFactory("info");

  createDiskCache("./data/cache.json", loggerCreator)
    .map((cache) => createTrading212ClientWithCache(cache))
    .asyncAndThen((client) => client.fetchAccountCash())
    .match(
      (json) => {
        console.log(json);
      },
      (e) => console.error(e),
    );
};

main();
