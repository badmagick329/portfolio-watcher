import type {
  AppError,
  BrokerClient,
  BrokerDataManager,
  T212InstrumentCatalogItem,
} from '@portfolio/domain';
import { type ResultAsync } from 'neverthrow';

type Params = {
  client: Pick<BrokerClient, 'fetchInstrumentsMetadata'>;
  dataManager: Pick<BrokerDataManager, 'saveT212InstrumentCatalogItems'>;
  now?: () => Date;
};

const createSyncT212InstrumentCatalog = ({
  client,
  dataManager,
  now = () => new Date(),
}: Params) => {
  const syncT212InstrumentCatalog = (): ResultAsync<number, AppError> => {
    const fetchedAt = now().toISOString();

    return client.fetchInstrumentsMetadata().andThen((items) =>
      dataManager.saveT212InstrumentCatalogItems(
        items.map(
          (item) =>
            ({
              ticker: item.ticker,
              isin: item.isin,
              name: item.name,
              shortName: item.shortName,
              instrumentType: item.type,
              currencyCode: item.currencyCode,
              extendedHours: item.extendedHours,
              maxOpenQuantity: item.maxOpenQuantity,
              addedOn: item.addedOn,
              fetchedAt,
            }) satisfies T212InstrumentCatalogItem,
        ),
      ),
    );
  };

  return syncT212InstrumentCatalog;
};

export { createSyncT212InstrumentCatalog };
