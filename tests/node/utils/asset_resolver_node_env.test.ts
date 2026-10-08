// test-fragmentation-ok: Isolated single-purpose regression test for asset resolver in Node environment
import { describe, it, expect } from 'vitest';
import { resolveAsset } from '../../../src/logic/utils/assetResolver.ts';


describe('Asset Resolver in Node.js environment', () => {
  it('should resolve assets without throwing when import.meta.env is undefined', () => {
    const originalEnv = import.meta.env;
    try {
      Reflect.set(import.meta, 'env', undefined);
      expect(() => resolveAsset('/sprites/pokemon/1.png')).not.toThrow();
      const result = resolveAsset('/sprites/pokemon/1.png');
      expect(result).toBe('/sprites/pokemon/1.png');
    } finally {
      Reflect.set(import.meta, 'env', originalEnv);
    }
  });

  it('should return empty string for empty input', () => {
    expect(resolveAsset('')).toBe('');
  });
});
