import { getOrdersAction } from '@/actions/orders-action';
import { getDistinctInstrumentsAction } from '@/actions/instruments-action';
import { InstrumentPicker } from '@/app/_components/InstrumentPicker';
import { getLatestInstrumentPrice } from '@/lib/server/composition';
import type { InstrumentWithStoredPrice } from '@/lib/client/instrument-price';

export default async function OrdersExplorer() {
  const orders = await getOrdersAction();
  const instruments = await getDistinctInstrumentsAction();
  const instrumentsWithStoredPrices = await Promise.all(
    instruments.map(async (instrument) => {
      const latestStoredPriceResult = await getLatestInstrumentPrice(
        instrument.isin,
      );

      if (latestStoredPriceResult.isErr()) {
        throw new Error(latestStoredPriceResult.error.message);
      }

      return {
        ...instrument,
        latestStoredPrice: latestStoredPriceResult.value
          ? {
              provider: latestStoredPriceResult.value.provider,
              price: latestStoredPriceResult.value.price,
              currency: latestStoredPriceResult.value.currency,
              asOf: latestStoredPriceResult.value.asOf,
              priceType: latestStoredPriceResult.value.priceType,
            }
          : null,
      } satisfies InstrumentWithStoredPrice;
    }),
  );

  return (
    <div className='flex w-full grow flex-col items-stretch gap-12'>
      <InstrumentPicker
        instruments={instrumentsWithStoredPrices}
        orders={orders.items.toSorted(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
        )}
      />
    </div>
  );
}
