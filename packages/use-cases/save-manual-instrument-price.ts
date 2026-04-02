import type { BrokerDataManager, InstrumentPriceSnapshot } from '@portfolio/domain';
import { okAsync } from 'neverthrow';

type Params = {
  dataManager: BrokerDataManager;
  now?: () => Date;
};

const createSaveManualInstrumentPrice = ({
  dataManager,
  now = () => new Date(),
}: Params) => {
  return ({
    isin,
    price,
    currency,
  }: {
    isin: string;
    price: number;
    currency: string;
  }) => {
    const nowIso = now().toISOString();
    const snapshot: InstrumentPriceSnapshot = {
      isin,
      provider: 'manual',
      providerSymbol: 'MANUAL',
      currency,
      price,
      priceType: 'manual',
      asOf: nowIso,
      fetchedAt: nowIso,
    };

    return dataManager.saveInstrumentPriceSnapshot(snapshot).andThen(() =>
      okAsync(snapshot),
    );
  };
};

export { createSaveManualInstrumentPrice };
