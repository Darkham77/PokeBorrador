import { describe, it, expect } from 'vitest';
import {
  isPokemonFaintedOrActive,
  resolveExplicitChoiceHelper,
  resolveForceSwitchFallback,
  resolveReplayerCandidate
} from '@/logic/battle/engine/showdownChoiceResolver';
import type { Pokemon as SimPokemon } from '@pkmn/sim';

describe('showdownChoiceResolver', () => {
  it('correctly identifies fainted and active pokemons', () => {
    const activePoke = { active: true, fainted: false };
    const faintedPoke = { active: false, fainted: true };
    const benchPoke = { active: false, fainted: false };

    expect(isPokemonFaintedOrActive(activePoke, [activePoke])).toEqual({ isFnt: false, isAct: true });
    expect(isPokemonFaintedOrActive(faintedPoke, [])).toEqual({ isFnt: true, isAct: false });
    expect(isPokemonFaintedOrActive(benchPoke, [])).toEqual({ isFnt: false, isAct: false });
  });

  it('resolves valid explicit switch choice when target is healthy and on bench', () => {
    const simPokemons = [
      { id: 'charizard', fainted: false, active: true, hp: 100 },
      { id: 'blastoise', fainted: false, active: false, hp: 100 }
    ];
    const activeList = [simPokemons[0]];

    const res = resolveExplicitChoiceHelper('switch 2', true, simPokemons, [], activeList, null);
    expect(res).toBe('switch 2');
  });

  it('resolves force switch fallback to first available living bench slot', () => {
    const simPokemons = [
      { id: 'charizard', fainted: true, active: false, hp: 0 },
      { id: 'blastoise', fainted: false, active: false, hp: 100 }
    ] as unknown as SimPokemon[];

    const res = resolveForceSwitchFallback('force-switch', simPokemons, [], []);
    expect(res).toBe('switch 2');
  });

  it('resolves pass when no living pokemon are available', () => {
    const simPokemons = [
      { id: 'charizard', fainted: true, active: false, hp: 0 }
    ] as unknown as SimPokemon[];

    const res = resolveForceSwitchFallback('force-switch', simPokemons, [], []);
    expect(res).toBe('pass');
  });

  it('resolves replayer candidate properly for move choice', () => {
    const res = resolveReplayerCandidate('move 1', 'move', null, [], [], []);
    expect(res).toBe('move 1');
  });
});
