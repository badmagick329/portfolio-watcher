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

type AccountCash = z.infer<typeof accountCashSchema>;

export type { AccountCash };
export { accountCashSchema };
