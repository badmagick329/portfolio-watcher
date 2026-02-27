import { createDiskCache } from "@/infra/disk-cache";
import { createTrading212ClientWithCache } from "@/infra/trading212-client";

const main = async () => {
  createDiskCache("./data/cache.json")
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
