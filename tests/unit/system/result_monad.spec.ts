/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import {
  some,
  none,
  fromNullable,
  unwrapOr,
  ok,
  err,
  matchResult
} from '@/logic/utils/resultUtils';

describe('Option & Result Monads Unit Tests', () => {
  describe('Option Monad', () => {
    it('creates some and none options', () => {
      const s = some('potion');
      const n = none();

      expect(s.kind).toBe('some');
      if (s.kind === 'some') expect(s.value).toBe('potion');
      expect(n.kind).toBe('none');
    });

    it('converts nullable values with fromNullable', () => {
      expect(fromNullable('item').kind).toBe('some');
      expect(fromNullable(null).kind).toBe('none');
      expect(fromNullable(undefined).kind).toBe('none');
    });

    it('unwraps values with unwrapOr fallback', () => {
      expect(unwrapOr(some('pokeball'), 'potion')).toBe('pokeball');
      expect(unwrapOr(none<string>(), 'potion')).toBe('potion');
    });
  });

  describe('Result Monad', () => {
    it('creates ok and err results', () => {
      const resOk = ok<number, string>(42);
      const resErr = err<number, string>('Invalid input');

      expect(resOk.ok).toBe(true);
      if (resOk.ok) expect(resOk.value).toBe(42);

      expect(resErr.ok).toBe(false);
      if (!resErr.ok) expect(resErr.error).toBe('Invalid input');
    });

    it('matches over results with matchResult', () => {
      const success = matchResult(
        ok(10),
        v => v * 2,
        _e => 0
      );
      const failure = matchResult(
        err(new Error('Failed')),
        _v => '100',
        e => e.message
      );

      expect(success).toBe(20);
      expect(failure).toBe('Failed');
    });
  });
});
