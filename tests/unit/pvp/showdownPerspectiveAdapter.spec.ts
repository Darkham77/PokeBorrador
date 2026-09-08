import { describe, it, expect } from 'vitest';
import { ShowdownPerspectiveAdapter } from '@/logic/battle/helpers/showdownPerspectiveAdapter';
import type { ShowdownPlayerRequest } from '@/types/battle/battle';

describe('ShowdownPerspectiveAdapter', () => {
  describe('invertStream', () => {
    it('inverts active seats between p1a and p2a in protocol lines', () => {
      const input = [
        '|switch|p1a: Charizard|Charizard, L50, M|100/100',
        '|move|p2a: Blastoise|Hydro Pump|p1a: Charizard',
        '|-damage|p1a: Charizard|20/100',
        '|win|p2'
      ];
      const expected = [
        '|switch|p2a: Charizard|Charizard, L50, M|100/100',
        '|move|p1a: Blastoise|Hydro Pump|p2a: Charizard',
        '|-damage|p2a: Charizard|20/100',
        '|win|p1'
      ];
      expect(ShowdownPerspectiveAdapter.invertStream(input)).toEqual(expected);
    });

    it('inverts doubles seats between p1b and p2b', () => {
      const line = '|move|p1b: Raichu|Thunderbolt|p2b: Gyarados';
      expect(ShowdownPerspectiveAdapter.invertLine(line)).toBe('|move|p2b: Raichu|Thunderbolt|p1b: Gyarados');
    });
  });

  describe('invertRequest', () => {
    it('inverts p2 ident prefixes to p1 in side pokemon list', () => {
      const p2Request: ShowdownPlayerRequest = {
        active: [
          {
            moves: [
              { id: 'thunderbolt' as any, move: 'Thunderbolt', pp: 15, maxpp: 15 },
              { id: 'voltswitch' as any, move: 'Volt Switch', pp: 20, maxpp: 20 }
            ],
            trapped: false
          }
        ],
        forceSwitch: [false],
        side: {
          pokemon: [
            { ident: 'p2: Raichu', details: 'Raichu, L50, M', condition: '100/100', active: true, uid: 'uid-1' },
            { ident: 'p2: Snorlax', details: 'Snorlax, L50, M', condition: '100/100', active: false, uid: 'uid-2' }
          ]
        }
      };

      const inverted = ShowdownPerspectiveAdapter.invertRequest(p2Request);
      expect(inverted).toBeDefined();
      expect(inverted?.side?.pokemon[0]?.ident).toBe('p1: Raichu');
      expect(inverted?.side?.pokemon[1]?.ident).toBe('p1: Snorlax');
      expect(inverted?.active?.[0]?.moves?.[0]?.move).toBe('Thunderbolt');
    });

    it('handles undefined or empty request gracefully', () => {
      expect(ShowdownPerspectiveAdapter.invertRequest(undefined)).toBeUndefined();
    });
  });
});
