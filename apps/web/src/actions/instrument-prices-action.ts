'use server';

import { saveManualInstrumentPrice } from '@/lib/server/composition';

export async function saveManualInstrumentPriceAction(params: {
  isin: string;
  price: number;
  currency: string;
}) {
  if (!Number.isFinite(params.price) || params.price <= 0) {
    throw new Error('Price must be a positive number.');
  }

  const result = await saveManualInstrumentPrice(params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
