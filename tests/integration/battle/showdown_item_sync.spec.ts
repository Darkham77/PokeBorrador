import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { Battle } from '@pkmn/sim';
import type { ID } from '@pkmn/sim';
import { mapToShowdownSet, getShowdownFormatId } from '@/logic/battle/showdownAdapter';
import type { Pokemon, PokemonStatus } from '@/types/pokemon/pokemon';

describe('Showdown Consumable Items Synchronization Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const createTestTeams = () => {
    const p1Poke = {
      uid: 'p1-mew',
      id: 'mew',
      name: 'P-Mew',
      level: 100,
      hp: 341,
      maxHp: 341,
      ability: 'noability',
      nature: 'serious',
      moves: [{ id: 'tackle', name: 'Tackle', pp: 20, maxPP: 20 }]
    } as unknown as Pokemon;

    const ePokeActive = {
      uid: 'e-active',
      id: 'mew',
      name: 'E-Active',
      level: 100,
      hp: 341,
      maxHp: 341,
      ability: 'noability',
      nature: 'serious',
      moves: [{ id: 'tackle', name: 'Tackle', pp: 20, maxPP: 20 }]
    } as unknown as Pokemon;

    const ePokeBenched = {
      uid: 'e-benched',
      id: 'mew',
      name: 'E-Benched',
      level: 100,
      hp: 341,
      maxHp: 341,
      ability: 'noability',
      nature: 'serious',
      moves: [{ id: 'tackle', name: 'Tackle', pp: 20, maxPP: 20 }]
    } as unknown as Pokemon;

    return { p1Poke, ePokeActive, ePokeBenched };
  };

  const setupItemSyncBattle = (p1Poke: Pokemon, ePokeActive: Pokemon, ePokeBenched: Pokemon) => {
    const playerTeam = [mapToShowdownSet(p1Poke)];
    const enemyTeamList = [ePokeActive, ePokeBenched];
    const enemyTeam = enemyTeamList.map(p => mapToShowdownSet(p));

    const simBattle = new Battle({ formatid: getShowdownFormatId() });
    simBattle.setPlayer('p1', { name: 'Player', team: playerTeam });
    simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: enemyTeam });

    simBattle.choose('p1', 'move tackle');
    simBattle.choose('p2', 'move tackle');

    return { simBattle, enemyTeamList };
  };

  it('debería sincronizar la salud correctamente en el simulador después de usar un Revivir en un aliado debilitado', async () => {
    const { p1Poke, ePokeActive, ePokeBenched } = createTestTeams();
    ePokeBenched.hp = 0; // Debilitado

    const { simBattle, enemyTeamList } = setupItemSyncBattle(p1Poke, ePokeActive, ePokeBenched);

    const p2Side = simBattle.p2;
    if (p2Side && p2Side.pokemon) {
      const mon0 = p2Side.pokemon[0];
      const mon1 = p2Side.pokemon[1];
      if (mon0 && mon1) {
        // Sincronizar estado debilitado
        mon0.hp = 341;
        mon1.hp = 0;
        mon1.fainted = true;
        mon1.status = 'fnt' as ID;
      }
    }

    // Simular uso de Revivir (revive al 50% HP)
    ePokeBenched.hp = 170;
    ePokeBenched.status = '';

    const p2Hps = enemyTeamList.map(p => p.hp);
    p2Hps.forEach((hp, idx) => {
      const simMon = p2Side?.pokemon?.[idx];
      if (simMon) {
        simMon.hp = hp;
        if (hp <= 0) {
          simMon.fainted = true;
          simMon.status = 'fnt' as ID;
        } else {
          simMon.fainted = false;
          if (simMon.status === 'fnt') simMon.status = '' as ID;
        }
      }
    });

    expect(p2Side?.pokemon?.[1]?.fainted).toBe(false);
    expect(p2Side?.pokemon?.[1]?.hp).toBe(170);

    p2Side?.active?.[0]?.addVolatile('flinch');
    simBattle.choose('p1', 'move tackle');
    const res = simBattle.choose('p2', 'default');
    expect(res).toBe(true);
  });

  it('debería sincronizar estados alterados después de usar Cura Total / Restaurar Todo o curas específicas', async () => {
    const statusesToTest: Array<{ status: PokemonStatus; item: string }> = [
      { status: 'psn', item: 'antidote' },
      { status: 'brn', item: 'burnheal' },
      { status: 'par', item: 'paralyzeheal' },
      { status: 'slp', item: 'awakening' },
      { status: 'frz', item: 'iceheal' }
    ];

    for (const testCase of statusesToTest) {
      const { p1Poke, ePokeActive, ePokeBenched } = createTestTeams();
      ePokeActive.status = testCase.status;

      const { simBattle, enemyTeamList } = setupItemSyncBattle(p1Poke, ePokeActive, ePokeBenched);

      const p2Side = simBattle.p2;
      const firstMon = p2Side?.pokemon?.[0];
      if (firstMon) {
        // Sincronizar el estado en Showdown
        firstMon.status = testCase.status as ID;
      }

      // Simular uso de objeto curativo (cura estado)
      ePokeActive.status = '';

      // Sincronizar estados en Showdown
      const p2Statuses = enemyTeamList.map(p => p.status || '');
      p2Statuses.forEach((status, idx) => {
        const simMon = p2Side?.pokemon?.[idx];
        if (simMon && !simMon.fainted) {
          simMon.status = status ? (status.toLowerCase() as ID) : ('' as ID);
        }
      });

      expect(firstMon?.status).toBe('');

      p2Side?.active?.[0]?.addVolatile('flinch');
      simBattle.choose('p1', 'move tackle');
      const res = simBattle.choose('p2', 'default');
      expect(res).toBe(true);
    }
  });

  it('debería sincronizar los HP después de usar Pociones (Poción, Súper Poción, Hiper Poción, Poción Máxima)', async () => {
    const potionsToTest = [
      { startHp: 50, healAmount: 20, item: 'potion', expectedHp: 70 },
      { startHp: 50, healAmount: 50, item: 'superpotion', expectedHp: 100 },
      { startHp: 50, healAmount: 120, item: 'hyperpotion', expectedHp: 170 },
      { startHp: 50, healAmount: 291, item: 'maxpotion', expectedHp: 341 }
    ];

    for (const testCase of potionsToTest) {
      const { p1Poke, ePokeActive, ePokeBenched } = createTestTeams();
      ePokeActive.hp = testCase.startHp;

      const { simBattle, enemyTeamList } = setupItemSyncBattle(p1Poke, ePokeActive, ePokeBenched);

      const p2Side = simBattle.p2;
      const firstMon = p2Side?.pokemon?.[0];
      if (firstMon) {
        firstMon.hp = testCase.startHp;
      }

      // Simular uso de poción
      ePokeActive.hp = testCase.expectedHp;

      // Sincronizar HP
      const p2Hps = enemyTeamList.map(p => p.hp);
      p2Hps.forEach((hp, idx) => {
        const simMon = p2Side?.pokemon?.[idx];
        if (simMon) simMon.hp = hp;
      });

      expect(firstMon?.hp).toBe(testCase.expectedHp);

      p2Side?.active?.[0]?.addVolatile('flinch');
      simBattle.choose('p1', 'move tackle');
      const res = simBattle.choose('p2', 'default');
      expect(res).toBe(true);
    }
  });
});
