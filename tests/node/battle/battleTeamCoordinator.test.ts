import { describe, it, expect } from 'vitest';
import {
  resolveGameBattleMode,
  resolveBattleFormat,
  resolveStartingTeamForMode,
  getActiveCombatTeam,
  getHealthyBenchCombatants,
  canSwitchInCombat,
  isNaturalWeatherAllowedInLocation,
  resolveEffectiveCycleForLocation,
  isBagAllowedInBattle,
  isStealingAllowedInBattle,
  shouldPersistPlayerState,
  shouldPersistHpToAdventure
} from '@/logic/battle/battleTeamCoordinator';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import { ref } from 'vue';

function createMockPokemon(uid: string, name: string, overrides: Partial<Pokemon> = {}): Pokemon {
  const speciesId = requirePokemonSpeciesId(name.toLowerCase());
  return {
    uid,
    id: speciesId,
    species: speciesId,
    name,
    level: 50,
    hp: 100,
    maxHp: 100,
    atk: 100,
    def: 100,
    spa: 100,
    spd: 100,
    spe: 100,
    type: 'normal',
    moves: [],
    status: '',
    sleepTurns: 0,
    friendship: 100,
    vigor: 100,
    maxVigor: 100,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: 'hardy',
    ability: 'runaway',
    gender: 'm',
    tags: [],
    obtainedAt: Date.now(),
    obtainedMethod: 'wild',
    isShiny: false,
    catchRate: 100,
    exp: 0,
    expNeeded: 1000,
    ...overrides
  };
}

describe('BattleTeamCoordinator - Unit Tests', () => {
  it('resolves the correct GameBattleMode and BattleFormat', () => {
    expect(resolveGameBattleMode(null)).toBe('adventure');
    expect(resolveGameBattleMode({ isReplay: true } as any)).toBe('replay');
    expect(resolveGameBattleMode({ isSpectator: true } as any)).toBe('spectator');
    expect(resolveGameBattleMode({ isFactionWar: true } as any)).toBe('faction_war');
    expect(resolveGameBattleMode({ isPvP: true, isRanked: true } as any)).toBe('pvp_ranked');
    expect(resolveGameBattleMode({ isPvP: true, isRanked: false } as any)).toBe('pvp_casual');

    expect(resolveBattleFormat('pvp_ranked')).toBe('3v3');
    expect(resolveBattleFormat('pvp_casual', { format: '6v6' } as any)).toBe('6v6');
    expect(resolveBattleFormat('pvp_casual', { format: '3v3' } as any)).toBe('3v3');
    expect(resolveBattleFormat('adventure')).toBe('6v6');
  });

  it('resolves starting team for 3v3 PvP with deep cloning and competitive sanitization', () => {
    const dirtyP1 = createMockPokemon('uid-1', 'Alakazam', {
      hp: 12,
      maxHp: 130,
      status: 'psn',
      statusTurns: 3,
      cursed: true,
      confused: 2,
      flinched: true,
      isGuardian: true,
      volatileCounters: { curse: 1, flinch: 1 }
    });
    const dirtyP2 = createMockPokemon('uid-2', 'Gengar', { hp: 0, fainted: true, isGuardian: true });
    const dirtyP3 = createMockPokemon('uid-3', 'Machamp', { hp: 50, maxHp: 150 });
    const p4 = createMockPokemon('uid-4', 'Marowak');

    const saveData = {
      team: [dirtyP1, dirtyP2, dirtyP3, p4],
      pvpTeam: ['uid-1', 'uid-2', 'uid-3']
    };

    const competitiveTeam = resolveStartingTeamForMode('pvp_ranked', '3v3', saveData);
    expect(competitiveTeam).toHaveLength(3);

    // Assert 100% sanitized
    expect(competitiveTeam[0]!.name).toBe('Alakazam');
    expect(competitiveTeam[0]!.hp).toBe(130);
    expect(competitiveTeam[0]!.status).toBe('');
    expect(competitiveTeam[0]!.cursed).toBe(false);
    expect(competitiveTeam[0]!.confused).toBe(0);
    expect(competitiveTeam[0]!.isGuardian).toBe(false);
    expect(competitiveTeam[0]!.volatileCounters).toEqual({});

    expect(competitiveTeam[1]!.name).toBe('Gengar');
    expect(competitiveTeam[1]!.hp).toBe(100);
    expect(competitiveTeam[1]!.fainted).toBe(false);
    expect(competitiveTeam[1]!.isGuardian).toBe(false);

    // Assert original adventure party is NOT mutated (deep clone verified)
    expect(dirtyP1.hp).toBe(12);
    expect(dirtyP1.status).toBe('psn');
    expect(dirtyP1.cursed).toBe(true);
    expect(dirtyP1.isGuardian).toBe(true);
  });

  it('governs active combat team and healthy bench accurately', () => {
    const p1 = createMockPokemon('uid-1', 'Alakazam', { hp: 100 });
    const p2 = createMockPokemon('uid-2', 'Gengar', { hp: 0 });
    const p3 = createMockPokemon('uid-3', 'Machamp', { hp: 80 });

    const ctx = {
      activeBattle: ref({
        player: p1,
        playerTeam: [p1, p2, p3]
      }),
      gs: { state: { team: [] } }
    } as unknown as BattleContext;

    const combatTeam = getActiveCombatTeam(ctx);
    expect(combatTeam).toHaveLength(3);

    const healthyBench = getHealthyBenchCombatants(ctx);
    expect(healthyBench).toHaveLength(1);
    expect(healthyBench[0]!.uid).toBe('uid-3');

    expect(canSwitchInCombat(ctx)).toBe(true);

    // If Machamp also faints:
    p3.hp = 0;
    expect(getHealthyBenchCombatants(ctx)).toHaveLength(0);
    expect(canSwitchInCombat(ctx)).toBe(false);
  });

  it('enforces natural weather rules by physical scenario', () => {
    // Gyms forbid natural weather
    expect(isNaturalWeatherAllowedInLocation('gym', null, null, null)).toBe(false);
    expect(isNaturalWeatherAllowedInLocation('route1', null, { isGym: true }, null)).toBe(false);
    expect(isNaturalWeatherAllowedInLocation('route1', { isGym: true }, null, null)).toBe(false);
    expect(isNaturalWeatherAllowedInLocation('route1', null, null, { isGym: true } as any)).toBe(false);

    // Caves and indoors forbid natural weather
    expect(isNaturalWeatherAllowedInLocation('route1', { isCave: true }, null, null)).toBe(false);
    expect(isNaturalWeatherAllowedInLocation('route1', { isIndoors: true }, null, null)).toBe(false);
    expect(isNaturalWeatherAllowedInLocation('route1', { isCrystalCave: true }, null, null)).toBe(false);
    expect(isNaturalWeatherAllowedInLocation('route1', null, null, { isCave: true } as any)).toBe(false);
    expect(isNaturalWeatherAllowedInLocation('route1', { weatherEnabled: false }, null, null)).toBe(false);

    // Outdoor routes allow natural weather
    expect(isNaturalWeatherAllowedInLocation('route1', { isIndoors: false, weatherEnabled: true }, null, null)).toBe(true);
  });

  it('resolves effective lighting cycle based on physical scenario', () => {
    // Explicit fixed cycle has highest priority
    expect(resolveEffectiveCycleForLocation('route1', null, null, { fixedCycle: 'dusk' } as any, 'day')).toBe('dusk');
    expect(resolveEffectiveCycleForLocation('route1', null, { fixedCycle: 'night' } as any, null, 'day')).toBe('night');

    // Gyms and Indoors have fixed daytime lighting
    expect(resolveEffectiveCycleForLocation('gym', null, null, null, 'night')).toBe('day');
    expect(resolveEffectiveCycleForLocation('power_plant', { isIndoors: true }, null, null, 'night')).toBe('day');

    // Caves without cycle sprites have fixed dark/night lighting
    expect(resolveEffectiveCycleForLocation('diglett_cave', { isCave: true }, null, null, 'day')).toBe('night');
    expect(resolveEffectiveCycleForLocation('cerulean_cave', null, null, { isCave: true } as any, 'day')).toBe('night');

    // Outdoor routes use the real-time map cycle
    expect(resolveEffectiveCycleForLocation('route1', null, null, null, 'dusk')).toBe('dusk');
    expect(resolveEffectiveCycleForLocation('route1', null, null, null, 'night')).toBe('night');
  });

  it('governs bag, stealing, and persistence isolation', () => {
    const pveWildCtx = {
      activeBattle: ref({ isPvP: false, cannotEscape: false })
    } as unknown as BattleContext;
    expect(isBagAllowedInBattle(pveWildCtx)).toBe(true);
    expect(shouldPersistPlayerState(pveWildCtx)).toBe(true);
    expect(shouldPersistHpToAdventure(pveWildCtx)).toBe(true);

    const pvpCtx = {
      activeBattle: ref({ isPvP: true })
    } as unknown as BattleContext;
    expect(isBagAllowedInBattle(pvpCtx)).toBe(false);
    expect(shouldPersistPlayerState(pvpCtx)).toBe(true);
    expect(shouldPersistHpToAdventure(pvpCtx)).toBe(false);

    const replayCtx = {
      activeBattle: ref({ isReplay: true })
    } as unknown as BattleContext;
    expect(isBagAllowedInBattle(replayCtx)).toBe(false);
    expect(shouldPersistPlayerState(replayCtx)).toBe(false);
    expect(shouldPersistHpToAdventure(replayCtx)).toBe(false);

    const spectatorCtx = {
      activeBattle: ref({ isSpectator: true })
    } as unknown as BattleContext;
    expect(isBagAllowedInBattle(spectatorCtx)).toBe(false);
    expect(shouldPersistPlayerState(spectatorCtx)).toBe(false);
    expect(shouldPersistHpToAdventure(spectatorCtx)).toBe(false);

    const rocketCtx = {
      activeBattle: ref({ isPvP: false, isGym: false, trainerArchetype: 'rocket' })
    } as unknown as BattleContext;
    expect(isStealingAllowedInBattle(rocketCtx)).toBe(true);
  });
});
