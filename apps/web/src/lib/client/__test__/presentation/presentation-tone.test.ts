import { describe, expect, test } from 'vitest';

import {
  getSignedTone,
  getSignedToneTextClassName,
  getToneTextClassName,
} from '@/lib/client/presentation/presentation-tone';

describe('presentation-tone', () => {
  test('returns positive, negative, or neutral tone for signed values', () => {
    expect(getSignedTone(1)).toBe('positive');
    expect(getSignedTone(-1)).toBe('negative');
    expect(getSignedTone(0)).toBe('neutral');
    expect(getSignedTone(null)).toBe('neutral');
    expect(getSignedTone(undefined)).toBe('neutral');
  });

  test('returns semantic text classes for tones', () => {
    expect(getToneTextClassName('positive')).toBe('text-positive');
    expect(getToneTextClassName('negative')).toBe('text-negative');
    expect(getToneTextClassName('neutral')).toBe('');
  });

  test('returns semantic text classes for signed values', () => {
    expect(getSignedToneTextClassName(10)).toBe('text-positive');
    expect(getSignedToneTextClassName(-10)).toBe('text-negative');
    expect(getSignedToneTextClassName(0)).toBe('');
  });
});
