'use server';

import {
  getHistoricalOrdersForWeb,
  getLatestCurrentPositionSnapshot,
  listCategorizedInstruments,
  setInstrumentCategories,
  unsetInstrumentCategories,
} from '@/lib/server/composition';
import type { WebHistoricalOrder } from '@portfolio/domain';

export async function getInstrumentCategoriesAction() {
  const [categoriesResult, ordersResult] = await Promise.all([
    listCategorizedInstruments(),
    getHistoricalOrdersForWeb(),
  ]);

  if (categoriesResult.isErr()) {
    throw new Error(categoriesResult.error.message);
  }

  if (ordersResult.isErr()) {
    throw new Error(ordersResult.error.message);
  }

  const quantitiesByIsin = getCurrentQuantitiesByIsin(ordersResult.value.items);

  return Promise.all(
    categoriesResult.value.map(async (instrument) => {
      const currentQuantity = quantitiesByIsin.get(instrument.isin) ?? 0;
      const snapshotResult = await getLatestCurrentPositionSnapshot(instrument.isin);

      if (snapshotResult.isErr()) {
        throw new Error(snapshotResult.error.message);
      }

      const currentPositionSnapshot = snapshotResult.value ?? null;

      return {
        ...instrument,
        currentQuantity,
        currentlyHeld: currentQuantity > 0,
        currentPositionSnapshot,
      };
    }),
  );
}

export async function setInstrumentCategoriesAction(params: {
  isins: string[];
  category: string;
}) {
  if (params.isins.length === 0) {
    throw new Error('Select at least one instrument.');
  }

  if (params.category.trim().length === 0) {
    throw new Error('Category is required.');
  }

  const result = await setInstrumentCategories(params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function unsetInstrumentCategoriesAction(params: { isins: string[] }) {
  if (params.isins.length === 0) {
    throw new Error('Select at least one instrument.');
  }

  const result = await unsetInstrumentCategories(params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

const getCurrentQuantitiesByIsin = (orders: WebHistoricalOrder[]) => {
  const quantitiesByIsin = new Map<string, number>();

  orders.forEach((order) => {
    const quantity = getFilledQuantity(order);

    if (quantity === 0) {
      return;
    }

    const previousQuantity = quantitiesByIsin.get(order.instrument.isin) ?? 0;
    const signedQuantity = order.side === 'SELL' ? -quantity : quantity;
    quantitiesByIsin.set(
      order.instrument.isin,
      roundQuantity(previousQuantity + signedQuantity),
    );
  });

  return quantitiesByIsin;
};

const getFilledQuantity = (order: WebHistoricalOrder) => {
  if (order.fills.length > 0) {
    return order.fills.reduce(
      (sum, fill) => sum + Math.abs(fill.quantity),
      0,
    );
  }

  const quantity = order.filledQuantity ?? order.quantity;
  return quantity === null ? 0 : Math.abs(quantity);
};

const roundQuantity = (quantity: number) => {
  const rounded = Math.round(quantity * 1e10) / 1e10;
  return Math.abs(rounded) < 1e-10 ? 0 : rounded;
};
