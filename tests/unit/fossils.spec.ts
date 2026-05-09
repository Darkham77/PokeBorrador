
/**
 * tests/unit/fossils.spec.js
 * Unit tests for Fossil Restoration logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { restoreFossil } from '@/logic/items/fossilEngine';

describe('Fossil Engine', () => {
  beforeEach(() => {
    // Mock localStorage
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(key => storage[key] || null),
      setItem: vi.fn((key, val) => { storage[key] = val.toString(); }),
      clear: vi.fn(() => { for (const k in storage) delete storage[k]; })
    });
    
    setActivePinia(createPinia());
  });
  it('should restore a fossil and add it to the team if there is space', () => {
    const state = {
      team: [],
      box: [],
      pokedex: [],
      seenPokedex: []
    };

    const result = restoreFossil('omanyte', state as unknown as Parameters<typeof restoreFossil>[1]);
    
    expect(result.pokemon.id).toBe('omanyte');
    expect(result.pokemon.level).toBe(1);
    expect(result.sentTo).toBe('team');
    expect(state.team.length).toBe(1);
    expect(state.pokedex).toContain('omanyte');
  });

  it('should send restored pokemon to box if team is full', () => {
    const state = {
      team: [{}, {}, {}, {}, {}, {}], // Full team
      box: [],
      pokedex: [],
      seenPokedex: []
    };

    const result = restoreFossil('aerodactyl', state as unknown as Parameters<typeof restoreFossil>[1]);
    
    expect(result.sentTo).toBe('box');
    expect(state.box.length).toBe(1);
    expect(state.team.length).toBe(6);
  });
});
