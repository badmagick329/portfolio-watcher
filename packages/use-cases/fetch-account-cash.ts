import type { BrokerClient } from '@portfolio/domain';

const createFetchAccountCash = (client: BrokerClient) => client.fetchAccountCash;

export { createFetchAccountCash };
