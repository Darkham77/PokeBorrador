/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { generateEncounter } from '@/logic/encounters/encounters';
import { buildTrainerEncounter } from '@/logic/battle/trainerSpawner';
import { terminateBattle } from '@/logic/battle/resolution';
import { useGameStore } from '@/stores/game';
import { useBoxStore } from '@/stores/box';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState } from '@/types/battle/battle';
import { requireMapRouteId } from '@/data/world/map-assets';

vi.mock('gsap', () => ({
  default: {
    delayedCall: vi.fn((_delay, cb) => { if (cb) cb(); return {}; }),
    fromTo: vi.fn(() => ({ progress: vi.fn() })),
    to: vi.fn(() => ({ progress: vi.fn() })),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), progress: vi.fn() })),
    set: vi.fn(),
    context: vi.fn((fn) => { fn(); return { revert: vi.fn() }; })
  },
  gsap: {
    delayedCall: vi.fn((_delay, cb) => { if (cb) cb(); return {}; }),
    fromTo: vi.fn(() => ({ progress: vi.fn() })),
    to: vi.fn(() => ({ progress: vi.fn() })),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), progress: vi.fn() })),
    set: vi.fn(),
    context: vi.fn((fn) => { fn(); return { revert: vi.fn() }; })
  }
}));

describe('Police Encounter and Difficulty Scaling Integration Test (Tier 2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('debe simular ventas en el mercado negro para cubrir todos los rangos de criminalidad de la tabla y validar niveles y equipos policiales', async () => {
    const gameStore = useGameStore();
    const boxStore = useBoxStore();

    gameStore.state.playerClass = 'rocket';
    gameStore.state.classLevel = 10;
    gameStore.state.money = 500000;
    gameStore.state.starterChosen = true;

    // Matriz completa de pruebas basada en ventas del Mercado Negro:
    // (Cada venta agrega +10% de criminalidad)
    const testCases = [
      { sales: 0, expectedCrim: 0, isPolice: false, expectedBonusLv: 0, minTeam: 1, maxTeam: 3, route: 'route1', baseLv: 2, expectedLv: 4 },
      { sales: 5, expectedCrim: 50, isPolice: false, expectedBonusLv: 0, minTeam: 1, maxTeam: 3, route: 'route1', baseLv: 2, expectedLv: 4 },
      { sales: 10, expectedCrim: 100, isPolice: true, expectedBonusLv: 0, minTeam: 3, maxTeam: 4, route: 'route1', baseLv: 2, expectedLv: 7 }, // 2 + 5 + 0
      { sales: 12, expectedCrim: 120, isPolice: true, expectedBonusLv: 2, minTeam: 3, maxTeam: 4, route: 'route1', baseLv: 2, expectedLv: 9 }, // 2 + 5 + 2
      { sales: 15, expectedCrim: 150, isPolice: true, expectedBonusLv: 5, minTeam: 4, maxTeam: 5, route: 'route1', baseLv: 2, expectedLv: 12 }, // 2 + 5 + 5
      { sales: 20, expectedCrim: 200, isPolice: true, expectedBonusLv: 10, minTeam: 6, maxTeam: 6, route: 'route1', baseLv: 2, expectedLv: 17 }, // 2 + 5 + 10 (SWAT 6)
      { sales: 30, expectedCrim: 300, isPolice: true, expectedBonusLv: 20, minTeam: 6, maxTeam: 6, route: 'route1', baseLv: 2, expectedLv: 27 }, // 2 + 5 + 20 (SWAT 6)
      { sales: 100, expectedCrim: 1000, isPolice: true, expectedBonusLv: 90, minTeam: 6, maxTeam: 6, route: 'cerulean_cave', baseLv: 55, expectedLv: 100 }, // 55 + 5 + 90 = 150 -> CLAMP a 100
    ];

    for (const tc of testCases) {
      // 1. Resetear criminalidad y llenar la caja PC con Pokémon para vender
      gameStore.state.classData.criminality = 0;
      gameStore.state.box = [];

      if (tc.sales > 0) {
        for (let i = 0; i < tc.sales; i++) {
          const p = makePokemon('rattata', 5)!;
          gameStore.state.box.push(p);
        }
        // Vender al mercado negro los N pokémon
        boxStore.boxRocketSelected = Array.from({ length: tc.sales }, (_, i) => i);
        boxStore.doBoxRocketSell();
      }

      // 2. Verificar que la criminalidad coincide exactamente con la esperada
      expect(gameStore.state.classData.criminality).toBe(tc.expectedCrim);

      // 3. Generar el encuentro con entrenador en la ruta especificada
      const encounter = await buildTrainerEncounter(
        {
          playerClass: gameStore.state.playerClass,
          classData: gameStore.state.classData,
          trainerChance: 5
        },
        requireMapRouteId(tc.route)
      );

      if (tc.isPolice) {
        expect(encounter.archetype).toBe('policeman');
        expect(encounter.name).toContain('Oficial de Policía');
        expect(encounter.enemyTeam.length).toBeGreaterThanOrEqual(tc.minTeam);
        expect(encounter.enemyTeam.length).toBeLessThanOrEqual(tc.maxTeam);
        expect(encounter.enemyTeam[0]?.level).toBe(tc.expectedLv);
      } else {
        expect(encounter.archetype).not.toBe('policeman');
      }
    }
  });

  it('debe generar encuentros de policía y escalar nivel y tamaño de equipo según el exceso de criminalidad', async () => {
    const gameStore = useGameStore();
    gameStore.state.playerClass = 'rocket';
    gameStore.state.classLevel = 10;
    gameStore.state.classData.criminality = 150;
    gameStore.state.team = [makePokemon('pikachu', 30)!];
    gameStore.state.starterChosen = true;

    // 1. Probar que generateEncounter genera encuentro con entrenador (policía)
    const encounter = await generateEncounter('route1', {
      team: gameStore.state.team,
      playerClass: 'rocket',
      classData: gameStore.state.classData,
      trainerChance: 5,
      faction: null
    }, { forceEncounter: false });
    expect(encounter).toBeDefined();

    // 2. Probar escalado en Ruta 1 (baseLv = 2):
    // Con 150% de criminalidad (exceso 50 -> +5 LV): nivel del policía = 2 + 5 + 5 = 12
    const policeEncounter150 = await buildTrainerEncounter(
      {
        playerClass: 'rocket',
        classData: gameStore.state.classData,
        trainerChance: 5
      },
      requireMapRouteId('route1')
    );

    expect(policeEncounter150.archetype).toBe('policeman');
    expect(policeEncounter150.name).toContain('Oficial de Policía');
    expect(policeEncounter150.enemyTeam.length).toBeGreaterThanOrEqual(4);
    expect(policeEncounter150.enemyTeam.length).toBeLessThanOrEqual(5);
    expect(policeEncounter150.enemyTeam[0]?.level).toBe(12);

    // 3. Probar escalado a 250% en Ruta 1 (exceso 150 -> +15 LV): nivel del policía = 2 + 5 + 15 = 22, equipo SWAT = 6
    gameStore.state.classData.criminality = 250;
    const policeEncounter250 = await buildTrainerEncounter(
      {
        playerClass: 'rocket',
        classData: gameStore.state.classData,
        trainerChance: 5
      },
      requireMapRouteId('route1')
    );

    expect(policeEncounter250.archetype).toBe('policeman');
    expect(policeEncounter250.enemyTeam.length).toBe(6);
    expect(policeEncounter250.enemyTeam[0]?.level).toBe(22);
  });

  it('debe clampear estrictamente el nivel máximo a 100 en rutas de nivel alto con criminalidad extrema', async () => {
    const gameStore = useGameStore();
    gameStore.state.playerClass = 'rocket';
    gameStore.state.classData.criminality = 1000;

    const policeExtreme = await buildTrainerEncounter(
      {
        playerClass: 'rocket',
        classData: gameStore.state.classData,
        trainerChance: 5
      },
      requireMapRouteId('cerulean_cave')
    );

    expect(policeExtreme.archetype).toBe('policeman');
    expect(policeExtreme.enemyTeam.length).toBe(6);
    for (const p of policeExtreme.enemyTeam) {
      expect(p.level).toBeLessThanOrEqual(100);
      expect(p.level).toBeGreaterThanOrEqual(1);
    }
  });

  it('debe ejecutar el ciclo de combate y persistir la criminalidad en 0 y descontar fianza en el GameStore', async () => {
    const gameStore = useGameStore();
    gameStore.state.playerClass = 'rocket';
    gameStore.state.classLevel = 10;
    gameStore.state.classData.criminality = 150;
    gameStore.state.money = 100000;
    gameStore.state.team = [makePokemon('pikachu', 30)!];
    gameStore.state.starterChosen = true;

    const policeEncounter = await buildTrainerEncounter(
      {
        playerClass: 'rocket',
        classData: gameStore.state.classData,
        trainerChance: 5
      },
      requireMapRouteId('route1')
    );

    const mockCtx = {
      gs: gameStore,
      fsm: {
        currentState: { value: BATTLE_STATES.ACTIVE_BATTLE },
        currentSubState: { value: BATTLE_SUBSTATES.CHECK_OUTCOME },
        transition: vi.fn()
      },
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      audio: {
        defeat: vi.fn(),
        victoryTrainer: vi.fn(),
        play: vi.fn()
      },
      activeBattle: {
        value: {
          trainerName: policeEncounter.name,
          trainerArchetype: policeEncounter.archetype,
          trainerSprite: policeEncounter.sprite,
          enemyTeam: policeEncounter.enemyTeam,
          enemy: policeEncounter.enemyTeam[0],
          persistenceMode: 'PERSISTENT',
          over: false,
          locationId: 'route1',
          classData: gameStore.state.classData
        } as unknown as BattleState
      },
      faintedSides: { value: new Set<string>(), clear: vi.fn(), add: vi.fn() },
      enemyStages: { value: {} },
      animations: {},
      addLog: vi.fn(),
      waitForLogs: vi.fn().mockResolvedValue(true),
      completeBattleFlow: vi.fn()
    } as unknown as BattleContext;

    // Ejecutar derrota contra el policía
    // Fianza esperada: classLevel 10, criminality 150 -> 10^2 * 80 * 1.5 = 12,000
    await terminateBattle(mockCtx, false, false);

    expect(gameStore.state.money).toBe(88000); // 100,000 - 12,000
    expect(gameStore.state.classData.criminality).toBe(0); // Reseteo garantizado a 0
  });
});
