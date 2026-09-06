import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('PvP Team Actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const gs = useGameStore();
    Object.assign(gs.state, {
      starterChosen: true,
      team: [],
      box: [],
      pvpTeam: [],
      pvpTeam6: []
    });
    gs.save = vi.fn().mockResolvedValue(undefined);
  });

  const createFakePoke = (id: string, name: string): Pokemon => {
    return {
      uid: id,
      name,
      level: 50,
      hp: 100,
      maxHp: 100,
      isIllegal: false
    } as unknown as Pokemon;
  };

  it('should auto-fill 6v6 PvP team up to 6 slots', () => {
    const gs = useGameStore();
    for (let i = 1; i <= 8; i++) {
      gs.addPokemon(createFakePoke(`pk-${i}`, `Poke-${i}`), { notify: false });
    }

    expect(gs.state.pvpTeam).toHaveLength(3);
    expect(gs.state.pvpTeam6).toHaveLength(6);
    expect(gs.state.pvpTeam6).toEqual(['pk-1', 'pk-2', 'pk-3', 'pk-4', 'pk-5', 'pk-6']);
  });

  it('should swap slots properly in 6v6 PvP team', () => {
    const gs = useGameStore();
    for (let i = 1; i <= 7; i++) {
      gs.addPokemon(createFakePoke(`pk-${i}`, `Poke-${i}`), { notify: false });
    }

    // Replace slot 2 ('pk-3') with 'pk-7'
    gs.swapPvp6Slot(2, 'pk-7');
    expect(gs.state.pvpTeam6[2]).toBe('pk-7');

    // Should not allow invalid slot index
    gs.swapPvp6Slot(10, 'pk-7');
    expect(gs.state.pvpTeam6.length).toBe(6);
  });

  it('should reorder 6v6 PvP team', () => {
    const gs = useGameStore();
    for (let i = 1; i <= 6; i++) {
      gs.addPokemon(createFakePoke(`pk-${i}`, `Poke-${i}`), { notify: false });
    }

    // Move slot 0 ('pk-1') to slot 3
    gs.reorderPvp6Team(0, 3);
    expect(gs.state.pvpTeam6).toEqual(['pk-2', 'pk-3', 'pk-4', 'pk-1', 'pk-5', 'pk-6']);
  });

  it('should remove slots from 3v3 and 6v6 PvP teams', () => {
    const gs = useGameStore();
    for (let i = 1; i <= 6; i++) {
      gs.addPokemon(createFakePoke(`pk-${i}`, `Poke-${i}`), { notify: false });
    }

    gs.removePvpSlot(1);
    expect(gs.state.pvpTeam).toEqual(['pk-1', 'pk-3']);

    gs.removePvp6Slot(0);
    expect(gs.state.pvpTeam6).toEqual(['pk-2', 'pk-3', 'pk-4', 'pk-5', 'pk-6']);
  });
});
