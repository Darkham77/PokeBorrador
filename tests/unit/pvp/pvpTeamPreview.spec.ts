import { describe, it, expect } from 'vitest';
import { validateAndResolveTeamPreviewPick } from '@/logic/pvp/pvpTeamPreviewHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';

function createMockPokemon(uid: string, name: string): Pokemon {
  return {
    uid,
    id: name.toLowerCase() as any,
    name,
    level: 50,
    hp: 100,
    maxHp: 100,
    moves: [],
    stats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    type: 'normal' as any,
    status: ''
  } as unknown as Pokemon;
}

describe('pvpTeamPreviewHelper', () => {
  const mockTeam: Pokemon[] = [
    createMockPokemon('p-1', 'Charizard'),
    createMockPokemon('p-2', 'Blastoise'),
    createMockPokemon('p-3', 'Venusaur'),
    createMockPokemon('p-4', 'Pikachu'),
    createMockPokemon('p-5', 'Gengar'),
    createMockPokemon('p-6', 'Snorlax')
  ];

  describe('validateAndResolveTeamPreviewPick', () => {
    it('resolves valid 3v3 selections in order', () => {
      const selectedUids = ['p-3', 'p-1', 'p-6'];
      const resolved = validateAndResolveTeamPreviewPick(mockTeam, selectedUids, '3v3');
      expect(resolved.map(p => p.uid)).toEqual(['p-3', 'p-1', 'p-6']);
    });

    it('auto-fills remaining slots up to 3 if fewer were selected in 3v3', () => {
      const selectedUids = ['p-2'];
      const resolved = validateAndResolveTeamPreviewPick(mockTeam, selectedUids, '3v3');
      expect(resolved).toHaveLength(3);
      expect(resolved[0]?.uid).toBe('p-2');
      // Should auto-fill from remaining members
      expect(resolved[1]?.uid).toBe('p-1');
      expect(resolved[2]?.uid).toBe('p-3');
    });

    it('resolves 6v6 lead selection and places lead first', () => {
      const selectedUids = ['p-5'];
      const resolved = validateAndResolveTeamPreviewPick(mockTeam, selectedUids, '6v6');
      expect(resolved).toHaveLength(6);
      expect(resolved[0]?.uid).toBe('p-5'); // Lead is first
      // Remaining 5 follow
      const otherUids = resolved.slice(1).map(p => p.uid);
      expect(otherUids).toContain('p-1');
      expect(otherUids).toContain('p-2');
      expect(otherUids).toContain('p-3');
      expect(otherUids).toContain('p-4');
      expect(otherUids).toContain('p-6');
    });
  });
});
