import { describe, it, expect } from 'vitest';
import { injectUidsIntoRequest, setTestingBattle } from '@/logic/battle/showdown.worker';

describe('injectUidsIntoRequest unit tests', () => {
  it('debería inyectar UIDs correctamente a partir del ident corto (prefijo de UID)', () => {
    const mockBattle = {
      p1: {
        pokemon: [
          { name: 'efef7f8a', uid: 'efef7f8a-a014-4edf-a651-acee73b6123f' },
          { name: 'cf48779a', uid: 'cf48779a-9eae-4a3c-827e-4d91d0397ebe' }
        ]
      }
    };

    setTestingBattle(mockBattle as any);

    const request = {
      side: {
        pokemon: [
          { ident: 'p1a: efef7f8a', details: 'Blissey', condition: '100/100', active: true },
          { ident: 'p1: cf48779a', details: 'Blissey', condition: '100/100', active: false }
        ]
      }
    };

    const result = injectUidsIntoRequest('p1', request) as any;

    expect(result.side.pokemon[0].uid).toBe('efef7f8a-a014-4edf-a651-acee73b6123f');
    expect(result.side.pokemon[1].uid).toBe('cf48779a-9eae-4a3c-827e-4d91d0397ebe');

    setTestingBattle(null);
  });
});
