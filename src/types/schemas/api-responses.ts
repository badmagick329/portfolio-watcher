import { z } from 'zod';

const accountCashSchema = z.object({
  free: z.number(),
  total: z.number(),
  ppl: z.number(),
  result: z.number(),
  invested: z.number(),
  pieCash: z.number(),
  blocked: z.number(),
});

const accountSummarySchema = z.object({
  cash: z.object({
    availableToTrade: z.number(),
    inPies: z.number(),
    reservedForOrders: z.number(),
  }),
  currency: z.string(),
  id: z.number(),
  investments: z.object({
    currentValue: z.number(),
    realizedProfitLoss: z.number(),
    totalCost: z.number(),
    unrealizedProfitLoss: z.number(),
  }),
  totalValue: z.number(),
});

type AccountCash = z.infer<typeof accountCashSchema>;
type AccountSummary = z.infer<typeof accountSummarySchema>;

export type { AccountCash, AccountSummary };
export { accountCashSchema, accountSummarySchema };
