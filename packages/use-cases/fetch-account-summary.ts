import { endPoints } from '@/infra/trading212-client/end-points';
import { fetchRequest } from '@/infra/trading212-client/utils';
import { accountSummarySchema } from '@/types/schemas/api-responses';

const createFetchAccountSummary = (creds: string) => {
  const fetchAccountSummary = () =>
    fetchRequest({
      endPoint: endPoints.accountSummary,
      schema: accountSummarySchema,
      creds,
    });

  return { fetchAccountSummary };
};

export { createFetchAccountSummary };
