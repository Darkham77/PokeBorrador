import { describe, it, expect } from 'vitest';
import { isVolatileStatusKey, requireVolatileStatusKey } from '@/types/pokemon/pokemon';

describe('Volatile Status Keys Governance Unit Test', () => {
  it('should recognize valid volatile status keys including tarshot', () => {
    expect(isVolatileStatusKey('tarshot')).toBe(true);
    expect(requireVolatileStatusKey('tarshot')).toBe('tarshot');
  });

  it('should strip prefixes like move: before validating volatile status keys', () => {
    const rawEffect = 'move: Taunt';
    const cleanId = rawEffect.startsWith('move:') ? rawEffect.replace(/^move:\s*/, '').toLowerCase().replace(/[^a-z0-9]/g, '') : rawEffect;
    expect(isVolatileStatusKey(cleanId)).toBe(true);
    expect(requireVolatileStatusKey(cleanId)).toBe('taunt');
  });
});
