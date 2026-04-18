import { describe, expect, test } from 'vitest';
import { parseRiskSymbolsArgs } from '../risk-symbols-cli';

describe('parseRiskSymbolsArgs', () => {
  test('accepts set command', () => {
    const result = parseRiskSymbolsArgs([
      'set',
      '--instrument',
      'VOD',
      '--provider',
      'fmp',
      '--symbol',
      'VOD.L',
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        action: 'set',
        value: {
          instrument: 'VOD',
          provider: 'fmp',
          symbol: 'VOD.L',
        },
      });
    }
  });

  test('accepts unset command', () => {
    const result = parseRiskSymbolsArgs([
      'unset',
      '--instrument',
      'VOD',
      '--provider',
      'fmp',
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        action: 'unset',
        value: {
          instrument: 'VOD',
          provider: 'fmp',
        },
      });
    }
  });

  test('accepts list command with default provider', () => {
    const result = parseRiskSymbolsArgs(['list']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        action: 'list',
        value: {
          provider: 'fmp',
        },
      });
    }
  });

  test('rejects unsupported provider', () => {
    const result = parseRiskSymbolsArgs([
      'set',
      '--instrument',
      'VOD',
      '--provider',
      'other',
      '--symbol',
      'VOD.L',
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Only --provider fmp is supported.');
    }
  });
});
