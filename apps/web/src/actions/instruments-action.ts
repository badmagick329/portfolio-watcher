'use server';

import { getDistinctInstruments } from '@/lib/composition';

export async function getDistinctInstrumentsAction() {
  const result = await getDistinctInstruments();

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
