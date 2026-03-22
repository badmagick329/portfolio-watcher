import type { BrokerClient } from '@portfolio/domain';

const createFetchAccountSummary = (client: BrokerClient) =>
  client.fetchAccountSummary;

export { createFetchAccountSummary };
