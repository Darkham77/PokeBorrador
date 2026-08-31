import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality';
import { auditAndRepairSaveData } from '../../../scripts/maintenance/repair_account_legality.ts';
import type { SaveDataDto } from '@/logic/validation/schemas';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Disabled Species & Eggs Sanitization Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('identifies unreleased / disabled species as illegal in checkPokemonLegality unless allowUnreleased is true', () => {
    const sunflora = {
      uid: 'sunflora-1',
      id: 'sunflora',
      name: 'Sunflora',
      level: 25,
      moves: [{ id: 'absorb', name: 'Absorber' }]
    } as unknown as Pokemon;

    const report = checkPokemonLegality(sunflora);
    expect(report.isLegal).toBe(false);
    expect(report.issues.some(i => i.includes('whitelist global'))).toBe(true);

    const debugReport = checkPokemonLegality(sunflora, { allowUnreleased: true });
    expect(debugReport.isLegal).toBe(true);
  });

  it('purges disabled pokemon from box and daycareWarehouse, and purges disabled eggs', () => {
    const fakeSave = {
      trainer: 'TestTrainer',
      badges: 8,
      balls: 50,
      money: 10000,
      battleCoins: 100,
      trainerLevel: 25,
      trainerExp: 500,
      trainerExpNeeded: 1000,
      inventory: {},
      team: [
        {
          uid: 'pika-1',
          id: 'pikachu',
          name: 'Pikachu',
          level: 50,
          hp: 100,
          maxHp: 100,
          atk: 55,
          def: 40,
          spa: 50,
          spd: 50,
          spe: 90,
          type: 'electric',
          isShiny: false,
          exp: 1000,
          expNeeded: 2000,
          moves: [{ id: 'thunderbolt', name: 'Rayo' }]
        } as unknown as Pokemon
      ],
      box: [
        {
          uid: 'sunflora-box',
          id: 'sunflora',
          name: 'Sunflora',
          level: 20,
          moves: [{ id: 'absorb', name: 'Absorber' }]
        } as unknown as Pokemon,
        {
          uid: 'char-box',
          id: 'charmander',
          name: 'Charmander',
          level: 15,
          hp: 50,
          maxHp: 50,
          atk: 52,
          def: 43,
          spa: 60,
          spd: 50,
          spe: 65,
          type: 'fire',
          isShiny: false,
          exp: 500,
          expNeeded: 1000,
          moves: [{ id: 'scratch', name: 'Arañazo' }]
        } as unknown as Pokemon
      ],
      eggs: [
        {
          uid: 'egg-sunflora',
          id: 'sunflora',
          steps: 100,
          ready: false
        },
        {
          uid: 'egg-pichu',
          id: 'pichu',
          steps: 200,
          ready: false
        }
      ],
      pokedex: ['pikachu'],
      seenPokedex: ['pikachu'],
      defeatedGyms: [],
      starterChosen: true,
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 },
      rankedMaxElo: 1000,
      passiveTeamActive: false,
      daycare_mission_refreshes: 0,
      boxCount: 1,
      classLevel: 1,
      classXP: 0,
      classData: {
        captureStreak: 0,
        longestStreak: 0,
        reputation: 0,
        blackMarketSales: 0,
        criminality: 0
      },
      warCoins: 0,
      warCoinsSpent: 0,
      lastPokemonCenterHeal: 0,
      playtime: 100
    };

    const result = auditAndRepairSaveData(fakeSave as unknown as SaveDataDto, true);
    expect(result.modified).toBe(true);

    // Sunflora must be deleted from box
    expect(fakeSave.box.some(p => p?.id === 'sunflora')).toBe(false);
    expect(fakeSave.box.some(p => p?.id === 'charmander')).toBe(true);

    // Sunflora egg must be deleted from eggs
    expect(fakeSave.eggs?.some(e => e.id === 'sunflora')).toBe(false);
    expect(fakeSave.eggs?.some(e => e.id === 'pichu')).toBe(true);
  });

  it('preserves Save Shield: promotes a legal pokemon from box if all team members are illegal/disabled', () => {
    const fakeSave = {
      trainer: 'TestTrainer',
      badges: 1,
      balls: 10,
      money: 1000,
      battleCoins: 0,
      trainerLevel: 5,
      trainerExp: 0,
      trainerExpNeeded: 100,
      inventory: {},
      team: [
        {
          uid: 'sunflora-team',
          id: 'sunflora',
          name: 'Sunflora',
          level: 20,
          moves: [{ id: 'absorb', name: 'Absorber' }]
        } as unknown as Pokemon
      ],
      box: [
        {
          uid: 'squirtle-box',
          id: 'squirtle',
          name: 'Squirtle',
          level: 10,
          hp: 44,
          maxHp: 44,
          atk: 48,
          def: 65,
          spa: 50,
          spd: 64,
          spe: 43,
          type: 'water',
          isShiny: false,
          exp: 200,
          expNeeded: 500,
          moves: [{ id: 'watergun', name: 'Pistola Agua' }]
        } as unknown as Pokemon
      ],
      eggs: [],
      pokedex: [],
      seenPokedex: [],
      defeatedGyms: [],
      starterChosen: true,
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 },
      rankedMaxElo: 1000,
      passiveTeamActive: false,
      daycare_mission_refreshes: 0,
      boxCount: 1,
      classLevel: 1,
      classXP: 0,
      classData: {
        captureStreak: 0,
        longestStreak: 0,
        reputation: 0,
        blackMarketSales: 0,
        criminality: 0
      },
      warCoins: 0,
      warCoinsSpent: 0,
      lastPokemonCenterHeal: 0,
      playtime: 10
    };

    const result = auditAndRepairSaveData(fakeSave as unknown as SaveDataDto, true);
    expect(result.modified).toBe(true);

    // Squirtle must be promoted to team to prevent empty team
    expect(fakeSave.team.length).toBe(1);
    expect(fakeSave.team[0]?.id).toBe('squirtle');
    expect(fakeSave.box.length).toBe(0);
  });

  it('preserves Save Shield: creates a legal rescue starter if entire account had only disabled pokemon', () => {
    const fakeSave = {
      trainer: 'TestTrainer',
      badges: 1,
      balls: 10,
      money: 1000,
      battleCoins: 0,
      trainerLevel: 5,
      trainerExp: 0,
      trainerExpNeeded: 100,
      inventory: {},
      team: [
        {
          uid: 'sunflora-only',
          id: 'sunflora',
          name: 'Sunflora',
          level: 20,
          moves: [{ id: 'absorb', name: 'Absorber' }]
        } as unknown as Pokemon
      ],
      box: [],
      eggs: [],
      pokedex: [],
      seenPokedex: [],
      defeatedGyms: [],
      starterChosen: true,
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 },
      rankedMaxElo: 1000,
      passiveTeamActive: false,
      daycare_mission_refreshes: 0,
      boxCount: 1,
      classLevel: 1,
      classXP: 0,
      classData: {
        captureStreak: 0,
        longestStreak: 0,
        reputation: 0,
        blackMarketSales: 0,
        criminality: 0
      },
      warCoins: 0,
      warCoinsSpent: 0,
      lastPokemonCenterHeal: 0,
      playtime: 10
    };

    const result = auditAndRepairSaveData(fakeSave as unknown as SaveDataDto, true);
    expect(result.modified).toBe(true);

    // Team must have at least 1 legal Pokémon (Bulbasaur fallback)
    expect(fakeSave.team.length).toBe(1);
    expect(fakeSave.team[0]?.id).toBe('bulbasaur');
    expect(checkPokemonLegality(fakeSave.team[0] as unknown as Pokemon).isLegal).toBe(true);
  });
});
