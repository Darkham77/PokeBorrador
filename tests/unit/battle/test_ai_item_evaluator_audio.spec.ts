import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { evaluateAndUseItem } from '@/logic/battle/ai/heuristic/aiItemEvaluator';
import { useAudioStore } from '@/stores/audio';
import { ref } from 'vue';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';

function createMockPokemon(name: string, hp = 20, maxHp = 100): Pokemon {
  return {
    uid: 'enemy-dragonite-1',
    id: name.toLowerCase(),
    name,
    level: 44,
    hp,
    maxHp,
    types: ['dragon', 'flying'],
    moves: [],
    status: '',
    fainted: false,
    stats: { hp: maxHp, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    baseStats: { hp: maxHp, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    gender: 'M',
    nature: 'hardy',
    friendship: 70,
    exp: 0,
    nextLevelExp: 100,
    vigor: 100,
    maxVigor: 100
  } as unknown as Pokemon;
}

describe('AI Item Evaluator - Single Audio Playback Parity', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('triggers visual handleHealRequest exactly once and avoids duplicate audioStore.play call for active Pokemon', async () => {
    const audioStore = useAudioStore();
    const playSpy = vi.spyOn(audioStore, 'play');

    const dragonite = createMockPokemon('Dragonite', 20, 100);
    const battleState = {
      isTrainer: true,
      trainerName: 'Marnie',
      enemyInventory: {
        hyperpotion: 1
      },
      enemyTeam: [dragonite],
      playerTeam: [],
      enemy: dragonite
    };

    let handleHealRequestCalls = 0;
    const ctx = {
      activeBattle: ref(battleState),
      animations: {
        handleHealRequest: async (_detail: { side?: string }) => {
          handleHealRequestCalls++;
        }
      },
      addLog: () => {}
    } as unknown as BattleContext;

    const used = await evaluateAndUseItem(ctx, dragonite);
    expect(used).toBe(true);
    expect(handleHealRequestCalls).toBe(1);
    // audioStore.play should NOT have been called directly because handleHealRequest handles sound emission
    expect(playSpy).not.toHaveBeenCalledWith('heal');
  });

  it('triggers audioStore.play directly only when reviving benched Pokemon without active handleHealRequest', async () => {
    const audioStore = useAudioStore();
    const playSpy = vi.spyOn(audioStore, 'play');

    const faintedMon = createMockPokemon('Lapras', 0, 100);
    const activeMon = createMockPokemon('Dragonite', 90, 100);

    const battleState = {
      isTrainer: true,
      trainerName: 'Marnie',
      enemyInventory: {
        revive: 1
      },
      enemyTeam: [activeMon, faintedMon],
      playerTeam: [],
      enemy: activeMon
    };

    let handleHealRequestCalls = 0;
    const ctx = {
      activeBattle: ref(battleState),
      animations: {
        handleHealRequest: async (_detail: { side?: string }) => {
          handleHealRequestCalls++;
        }
      },
      addLog: () => {}
    } as unknown as BattleContext;

    const used = await evaluateAndUseItem(ctx, activeMon);
    expect(used).toBe(true);
    expect(handleHealRequestCalls).toBe(0);
    expect(playSpy).toHaveBeenCalledWith('heal');
  });
});
