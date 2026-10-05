import type { PortfolioExportAccountActivity } from '@portfolio/domain';

const cashActions = new Set([
  'Deposit',
  'Withdrawal',
  'Dividend (Dividend)',
  'Dividend (Tax exempted)',
  'Interest on cash',
  'Result adjustment',
]);
const tradeActions = new Set([
  'Market buy',
  'Market sell',
  'Limit buy',
  'Limit sell',
  'Stop buy',
  'Stop sell',
  'Stop limit buy',
  'Stop limit sell',
]);
const chargeColumns = [
  ['Currency conversion fee', 'Currency (Currency conversion fee)'],
  ['Stamp duty reserve tax', 'Currency (Stamp duty reserve tax)'],
  ['French transaction tax', 'Currency (French transaction tax)'],
] as const;
const requiredColumns = [
  'Action',
  'Time (UTC)',
  'ID',
  'ISIN',
  'Ticker',
  'Total',
  'Currency (Total)',
  'Withholding tax',
  'Currency (Withholding tax)',
  ...chargeColumns.flat(),
];

// Keep the CSV's cash movements separate from trade charges: trade totals already include charges.
const parsePortfolioActivityCsv = (
  content: string,
): PortfolioExportAccountActivity => {
  const [header, ...rows] = parseCsv(content);
  if (!header) throw new Error('The activity CSV is empty.');

  const columns = new Map(header.map((name, index) => [name, index]));
  for (const name of requiredColumns) {
    if (!columns.has(name)) throw new Error(`Missing CSV column: ${name}.`);
  }

  const cashMovements: PortfolioExportAccountActivity['cashMovements'] = [];
  const tradeCharges: PortfolioExportAccountActivity['tradeCharges'] = [];
  let periodStart = '';
  let periodEnd = '';

  rows.forEach((row, index) => {
    const sourceRow = index + 2;
    if (row.length !== header.length) {
      throw new Error(
        `CSV row ${sourceRow} has ${row.length} columns; expected ${header.length}.`,
      );
    }
    const get = (name: string) => row[columns.get(name)!]!.trim();
    const action = get('Action');
    if (!cashActions.has(action) && !tradeActions.has(action)) {
      throw new Error(
        `Unrecognized action on CSV row ${sourceRow}: ${action}.`,
      );
    }
    const occurredAt = new Date(get('Time (UTC)')).toISOString();
    if (!periodStart || occurredAt < periodStart) periodStart = occurredAt;
    if (!periodEnd || occurredAt > periodEnd) periodEnd = occurredAt;

    if (cashActions.has(action)) {
      const withholdingTax = get('Withholding tax');
      cashMovements.push({
        sourceRow,
        id: get('ID') || null,
        action,
        occurredAt,
        amount: parseAmount(get('Total'), sourceRow, 'Total'),
        currency: requiredValue(
          get('Currency (Total)'),
          sourceRow,
          'Currency (Total)',
        ),
        isin: get('ISIN') || null,
        ticker: get('Ticker') || null,
        withholdingTax: withholdingTax
          ? parseAmount(withholdingTax, sourceRow, 'Withholding tax')
          : null,
        withholdingTaxCurrency: withholdingTax
          ? requiredValue(
              get('Currency (Withholding tax)'),
              sourceRow,
              'Currency (Withholding tax)',
            )
          : null,
      });
    } else {
      const charges = chargeColumns.flatMap(
        ([amountColumn, currencyColumn]) => {
          const value = get(amountColumn);
          return value
            ? [
                {
                  type: amountColumn,
                  amount: parseAmount(value, sourceRow, amountColumn),
                  currency: requiredValue(
                    get(currencyColumn),
                    sourceRow,
                    currencyColumn,
                  ),
                },
              ]
            : [];
        },
      );
      if (charges.length > 0) {
        tradeCharges.push({
          sourceRow,
          orderId: get('ID') || null,
          action,
          occurredAt,
          charges,
        });
      }
    }
  });

  return {
    periodStart,
    periodEnd,
    sourceRowCount: rows.length,
    cashMovements,
    tradeCharges,
  };
};

const requiredValue = (value: string, row: number, column: string) => {
  if (!value) throw new Error(`Missing ${column} on CSV row ${row}.`);
  return value;
};

const parseAmount = (value: string, row: number, column: string) => {
  const amount = Number(requiredValue(value, row, column));
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid ${column} on CSV row ${row}.`);
  }
  return amount;
};

// Trading 212 quotes CSV cells, so split only at commas outside quoted values.
const parseCsv = (content: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = content.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error('The activity CSV has an unclosed quoted value.');
  if (row.length > 0 || cell) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

export { parsePortfolioActivityCsv };
