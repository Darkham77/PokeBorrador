import { describe, it, expect } from 'vitest';
import { getMoveDescription } from '@/logic/pokemon/pokemonUtils';
import { ITEM_IDS } from '@/data/inventory/itemIds';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

describe('Move Relearner & Move Description Utility', () => {
  it('should resolve Spanish move names like "Mordisco" in getMoveDescription without throwing', () => {
    const descBite = getMoveDescription('bite');
    expect(descBite).toBeDefined();
    expect(descBite.length).toBeGreaterThan(0);

    const descMordisco = getMoveDescription('Mordisco');
    expect(descMordisco).toBe(descBite);
  });

  it('should confirm that "moverelearner" is the canonical ItemId in ITEM_IDS', () => {
    expect(ITEM_IDS.includes('moverelearner' as any)).toBe(true);
  });

  it('should resolve Spanish move name to Showdown ID via getMoveIdBySpanishName', () => {
    const resolvedId = pokemonDataProvider.getMoveIdBySpanishName('Mordisco');
    expect(resolvedId).toBe('bite');
  });
});
