import { describe, it, expect } from 'vitest';
import type { ShowdownRequest } from '@/logic/battle/helpers/showdownTeamMapper';

describe('Audit Parity - Interface Duplication & Missing Request Flags', () => {
  it('should verify ShowdownRequest interface includes reviving and commanding optional flags from canonical Showdown side.ts', () => {
    const mockRequest: ShowdownRequest = {
      side: {
        pokemon: [
          {
            ident: 'p1: Pikachu',
            reviving: true,
            commanding: false
          }
        ]
      }
    };

    // Expect reviving property to be strongly typed without resorting to 'as any' unsafe casts
    // reviving is now defined in ShowdownRequestPokemon interface
    const poke = mockRequest.side?.pokemon[0];
    const isReviving = poke?.reviving;
    expect(isReviving).toBe(true);
  });
});
