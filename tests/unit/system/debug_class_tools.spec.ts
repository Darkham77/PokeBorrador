import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { useDebugStore } from '@/stores/debug';
import type { PlayerClassId } from '@/data/player/playerClasses';

describe('Debug Stats Tools - setPlayerClass', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sets valid player class and resets cleanly when set to "none"', () => {
    const game = useGameStore();
    const debug = useDebugStore();

    const tool = debug.tools.find(c => c.command === 'setPlayerClass');
    expect(tool).toBeDefined();

    const setClassAction = tool?.action as ((c: string) => void);

    // Set valid class
    setClassAction('rocket');
    expect(game.state.playerClass).toBe('rocket' as PlayerClassId);

    // Reset class with 'none'
    expect(() => setClassAction('none')).not.toThrow();
    expect(game.state.playerClass).toBeNull();
    expect(game.state.classLevel).toBe(1);
    expect(game.state.classXP).toBe(0);

    // Set another valid class
    setClassAction('criador');
    expect(game.state.playerClass).toBe('criador' as PlayerClassId);

    // Reset with 'null'
    expect(() => setClassAction('null')).not.toThrow();
    expect(game.state.playerClass).toBeNull();
  });
});
