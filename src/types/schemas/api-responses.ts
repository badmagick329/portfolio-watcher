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

const historicalOrdersItemSchema = z.object({
  order: z.object({
    id: z.number(),
    strategy: z.string(),
    type: z.string(),
    ticker: z.string(),
    quantity: z.number().optional(),
    filledQuantity: z.number().optional(),
    limitPrice: z.number().optional(),
    value: z.number().optional(),
    filledValue: z.number().optional(),
    status: z.string(),
    currency: z.string(),
    extendedHours: z.boolean(),
    initiatedFrom: z.string(),
    side: z.string(),
    createdAt: z.string(),
    instrument: z.object({
      ticker: z.string(),
      name: z.string(),
      isin: z.string(),
      currency: z.string(),
    }),
  }),
  fill: z
    .object({
      id: z.number(),
      quantity: z.number(),
      price: z.number(),
      type: z.string(),
      tradingMethod: z.string(),
      filledAt: z.string(),
      walletImpact: z.object({
        currency: z.string(),
        netValue: z.number(),
        fxRate: z.number(),
        taxes: z.array(
          z.object({
            name: z.string(),
            quantity: z.number(),
            currency: z.string(),
            chargedAt: z.string(),
          }),
        ),
      }),
    })
    .optional(),
});

const historicalOrdersItemsSchema = z.array(historicalOrdersItemSchema);

const historicalOrdersSchema = z.object({
  items: historicalOrdersItemsSchema,
  nextPagePath: z.string().nullable(),
});

type AccountCash = z.infer<typeof accountCashSchema>;
type AccountSummary = z.infer<typeof accountSummarySchema>;
type HistoricalOrdersItem = z.infer<typeof historicalOrdersItemSchema>;
type HistoricalOrdersItems = z.infer<typeof historicalOrdersItemsSchema>;
type HistoricalOrders = z.infer<typeof historicalOrdersSchema>;

export type {
  AccountCash,
  AccountSummary,
  HistoricalOrders,
  HistoricalOrdersItem,
  HistoricalOrdersItems,
};
export {
  accountCashSchema,
  accountSummarySchema,
  historicalOrdersSchema,
  historicalOrdersItemSchema,
  historicalOrdersItemsSchema,
};
