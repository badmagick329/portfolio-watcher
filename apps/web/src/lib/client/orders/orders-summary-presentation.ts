import type { EffectiveInstrumentPrice } from '../portfolio/instrument-price';

const getCurrentPriceSourceLabel = (
  source: EffectiveInstrumentPrice['source'] | null | undefined,
  provider?: EffectiveInstrumentPrice['provider'] | null,
) =>
  source === 'manual'
    ? 'Manual override'
    : source === 'stored'
      ? getStoredPriceProviderLabel(provider)
      : source === 'derived_from_fill'
        ? 'Derived from fill'
        : 'n/a';

const getStoredPriceProviderLabel = (
  provider?: EffectiveInstrumentPrice['provider'] | null,
) =>
  provider === 'manual'
    ? 'Manual (saved)'
    : provider === 't212'
      ? 'Trading 212'
      : provider === 'eodhd'
        ? 'EODHD'
        : provider === 'fmp'
          ? 'FMP'
          : 'Stored';

const formatDisplayDateTime = (value: string | null | undefined) => {
  if (!value) {
    return 'n/a';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'n/a';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(parsedDate);
};

const formatCompactDisplayDateTime = (value: string | null | undefined) => {
  if (!value) {
    return 'n/a';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'n/a';
  }

  const year = parsedDate.getFullYear();
  const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsedDate.getDate()}`.padStart(2, '0');
  const hours = `${parsedDate.getHours()}`.padStart(2, '0');
  const minutes = `${parsedDate.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const getCurrentTimeZoneAbbreviation = () => {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  }).formatToParts(new Date());
  const timeZoneNamePart = parts.find((part) => part.type === 'timeZoneName');

  return timeZoneNamePart?.value ?? 'Local';
};

const formatPriceAsOf = (value: string | null | undefined) =>
  formatDisplayDateTime(value);

export {
  formatCompactDisplayDateTime,
  formatDisplayDateTime,
  formatPriceAsOf,
  getCurrentPriceSourceLabel,
  getCurrentTimeZoneAbbreviation,
};
