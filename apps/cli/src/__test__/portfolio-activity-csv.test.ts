import { describe, expect, test } from 'vitest';
import { parsePortfolioActivityCsv } from '../portfolio-activity-csv';

const header = [
  'Action',
  'Time (UTC)',
  'ISIN',
  'Ticker',
  'ID',
  'Notes',
  'Total',
  'Currency (Total)',
  'Withholding tax',
  'Currency (Withholding tax)',
  'Currency conversion fee',
  'Currency (Currency conversion fee)',
  'Stamp duty reserve tax',
  'Currency (Stamp duty reserve tax)',
  'French transaction tax',
  'Currency (French transaction tax)',
].join(',');

describe('Trading 212 activity CSV', () => {
  test('keeps cash movements and trade charges separate', () => {
    const csv = [
      header,
      'Deposit,2025-11-07 10:00:00+00:00,,,1,"transfer, bank",100,GBP,,,,,,,,',
      'Dividend (Dividend),2025-11-08 10:00:00+00:00,GB123,ABC,,"",3.50,GBP,0.50,GBP,,,,,,',
      'Interest on cash,2025-11-09 10:00:00+00:00,,,2,,0.12,GBP,,,,,,,,',
      'Market buy,2025-11-10 10:00:00+00:00,GB123,ABC,3,,10,GBP,,,0.02,GBP,0.05,GBP,,',
      'Withdrawal,2025-11-11 10:00:00+00:00,,,4,,-5,GBP,,,,,,,,',
    ].join('\r\n');

    const result = parsePortfolioActivityCsv(csv);

    expect(result.sourceRowCount).toBe(5);
    expect(result.cashMovements.map((event) => event.amount)).toEqual([
      100, 3.5, 0.12, -5,
    ]);
    expect(result.cashMovements[1]).toMatchObject({
      isin: 'GB123',
      withholdingTax: 0.5,
      withholdingTaxCurrency: 'GBP',
    });
    expect(result.tradeCharges).toEqual([
      expect.objectContaining({
        orderId: '3',
        charges: [
          { type: 'Currency conversion fee', amount: 0.02, currency: 'GBP' },
          { type: 'Stamp duty reserve tax', amount: 0.05, currency: 'GBP' },
        ],
      }),
    ]);
  });

  test('rejects unknown activity rather than silently dropping it', () => {
    expect(() =>
      parsePortfolioActivityCsv(
        `${header}\nCashback,2025-11-07 10:00:00+00:00,,,1,,1,GBP,,,,,,,,`,
      ),
    ).toThrow('Unrecognized action on CSV row 2: Cashback.');
  });
});
