import { endPoints } from '@/infra/trading212-client/end-points';
import { fetchRequest } from '@/infra/trading212-client/utils';
import {
  accountCashSchema,
  accountSummarySchema,
} from '@/types/schemas/api-responses';

const createFetchAccountCash = (creds: string) => {
  const fetchAccountCash = () =>
    fetchRequest({
      endPoint: endPoints.accountCash,
      schema: accountCashSchema,
      creds,
    });

  return { fetchAccountCash };
};

export { createFetchAccountCash };
