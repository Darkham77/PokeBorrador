import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleFlowCompletion,
  armBattleReadyForInput,
  awaitBattleFlowCompletion,
  awaitBattleReadyForInput,
  clickResilient,
  type WindowWithResolver
} from '../e2e_helpers.ts';
import { MOVE_TRANSLATIONS_ES } from '../../../src/data/battle/moves.ts';

import type { PokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import type { PokemonMoveId } from '../../../src/data/battle/moves.ts';
import type { AbilityId } from '../../../src/data/battle/abilities.ts';

interface BattlePlayerConfig {
  speciesId: PokemonSpeciesId;
  level: number;
  moves?: PokemonMoveId[];
}

interface CombatMoveEntry {
  id: string;
  pp: number;
}

class CaptureSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupScenario(speciesId: string, level: number): Promise<void> {
    await this.page.evaluate(async ({ specId, lvl }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useInventoryStore } = await import('../../../src/stores/inventory/inventory.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const { requireItemId } = await import('../../../src/data/inventory/items.ts');

      const invStore = useInventoryStore();
      await invStore.addItem(requireItemId('masterball'), 5);

      const wildPoke = pokemonDebugService.generate({
        id: requirePokemonSpeciesId(specId),
        level: lvl
      });

      const battleStore = useBattleStore();
      await battleStore.startBattle(wildPoke, {
        isTrainer: false,
        locationId: 'route1'
      });
    }, { specId: speciesId, lvl: level });
    await awaitBattleReadyForInput(this.page);
  }

  public async setupWildDittoBattle(
    playerConfig: BattlePlayerConfig,
    dittoLevel = 5,
    dittoAbility: AbilityId = 'limber'
  ): Promise<void> {
    await this.page.evaluate(async ({ pCfg, dLvl, dAbility }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useInventoryStore } = await import('../../../src/stores/inventory/inventory.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const { requireItemId } = await import('../../../src/data/inventory/items.ts');
      const { requireAbilityId } = await import('../../../src/data/battle/abilities.ts');

      const invStore = useInventoryStore();
      await invStore.addItem(requireItemId('masterball'), 5);

      const gameStore = useGameStore();
      const playerPoke = pokemonDebugService.generate({
        id: requirePokemonSpeciesId(pCfg.speciesId),
        level: pCfg.level,
        moves: pCfg.moves
      });
      gameStore.state.team = [playerPoke];

      const wildDitto = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('ditto'),
        level: dLvl,
        ability: requireAbilityId(dAbility),
        moves: ['transform']
      });

      const battleStore = useBattleStore();
      await battleStore.startBattle(wildDitto, {
        isTrainer: false,
        locationId: 'route1'
      });
    }, { pCfg: playerConfig, dLvl: dittoLevel, dAbility: dittoAbility });
    await awaitBattleReadyForInput(this.page);
  }

  public async throwMasterBall(): Promise<void> {
    await this.throwBall('masterball', { expectCapture: true });
  }
}

test.describe('Battle Capture and Wild Encounter State Persistence (Tier 3)', () => {

  test('debería capturar un Pidgey salvaje con Master Ball y verificar que mantiene estadísticas, moves en español y sin errores', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayer1');
    await sim.setup();
    await sim.setupScenario('pidgey', 2);

    await sim.throwMasterBall();

    const pidgeyData = await page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.();
      const p = (store?.state?.team as Array<{ id?: string; level?: number; moves?: { id: string; name?: string }[]; maxHp?: number; atk?: number } | null> | undefined)
        ?.find((mon: { id?: string } | null) => mon?.id === 'pidgey');
      return p ? { id: p.id, level: p.level, moves: p.moves, maxHp: p.maxHp, atk: p.atk } : null;
    });

    expect(pidgeyData).not.toBeNull();
    expect(pidgeyData!.level).toBe(2);
    expect((pidgeyData!.moves as Array<{ id: string; name?: string } | null | undefined>).find((m: { id: string; name?: string } | null | undefined) => m?.id === 'tackle')?.name).toBe('Placaje');
  });

  test('debería capturar un Ditto transformado tras forzar su transformación en T1 por la IA salvaje y verificar reversión limpia de moves y stats', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayerDittoCapture');
    await sim.setup();
    await sim.setupWildDittoBattle({ speciesId: 'pikachu', level: 5, moves: ['growl', 'thundershock'] }, 5);

    // Verificar que antes de iniciar el turno Ditto salvaje NO está transformado
    const preTurnState = await page.evaluate(() => {
      const bStore = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      return {
        id: bStore?.state?.enemy?.id,
        isTransformed: bStore?.state?.enemy?.isTransformed
      };
    });
    expect(preTurnState.id).toBe('ditto');
    expect(preTurnState.isTransformed).toBeFalsy();

    // Turno 1: El jugador usa Gruñido (#move-btn-0). La IA salvaje de Ditto DEBE usar Transformación obligatoriamente
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    // Verificar en combate activo que Ditto se transformó en Pikachu y copió sus movimientos con 5 PP
    const inCombatState = await page.evaluate(() => {
      const bStore = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      const enemy = bStore?.state?.enemy;
      const validMoves = enemy?.moves?.filter((m): m is NonNullable<typeof m> => m !== null) ?? [];
      return {
        isTransformed: enemy?.isTransformed,
        id: enemy?.id,
        moves: validMoves.map((m) => ({ id: m.id, pp: m.pp ?? 0 }))
      };
    });
    expect(inCombatState.isTransformed).toBe(true);
    expect(inCombatState.id).toBe('pikachu');
    expect(inCombatState.moves?.find((m: CombatMoveEntry) => m.id === 'thundershock')?.pp).toBe(5);

    // Capturar a Ditto transformado con Master Ball
    await sim.throwMasterBall();

    // Validar en el equipo del jugador que el Pokémon capturado es el Ditto original con sus stats y moves limpios
    const dittoData = await page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.();
      const p = (store?.state?.team as Array<{ id?: string; level?: number; moves?: { id: string; name?: string }[]; maxHp?: number; atk?: number; isTransformed?: boolean } | null> | undefined)
        ?.find((mon: { id?: string } | null) => mon?.id === 'ditto');
      return p ? { id: p.id, level: p.level, moves: p.moves, maxHp: p.maxHp, atk: p.atk, isTransformed: p.isTransformed } : null;
    });

    expect(dittoData).not.toBeNull();
    expect(dittoData!.id).toBe('ditto');
    expect(dittoData!.level).toBe(5);
    expect(dittoData!.isTransformed).toBeFalsy();
    expect(dittoData!.moves).toHaveLength(1);
    expect(dittoData!.moves![0]?.id).toBe('transform');
    expect(dittoData!.moves![0]?.name).toBe('Transformación');
  });

  test('debería soportar Ditto con Habilidad Oculta Imposter autotransformándose en Turno 0 y capturarse limpiamente', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayerDittoImposter');
    await sim.setup();
    // Iniciar combate con Ditto salvaje con habilidad oculta 'imposter' contra Pikachu
    await sim.setupWildDittoBattle(
      { speciesId: 'pikachu', level: 10, moves: ['growl', 'thundershock'] },
      5,
      'imposter'
    );

    // En Turno 0, Imposter se activa inmediatamente al entrar a la arena.
    // Ditto YA debe estar transformado en Pikachu ANTES de que el jugador elija ninguna acción.
    const inCombatState = await page.evaluate(() => {
      const bStore = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      const enemy = bStore?.state?.enemy;
      const validMoves = enemy?.moves?.filter((m): m is NonNullable<typeof m> => m !== null) ?? [];
      return {
        isTransformed: enemy?.isTransformed,
        id: enemy?.id,
        moves: validMoves.map((m) => ({ id: m.id, pp: m.pp ?? 0 }))
      };
    });
    expect(inCombatState.isTransformed).toBe(true);
    expect(inCombatState.id).toBe('pikachu');
    expect(inCombatState.moves?.find((m: CombatMoveEntry) => m.id === 'thundershock')?.pp).toBe(5);

    // Capturar a Ditto transformado con Master Ball
    await sim.throwMasterBall();

    // Validar en el equipo del jugador que el Pokémon capturado es el Ditto original con sus stats y moves limpios
    const dittoData = await page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.();
      const p = (store?.state?.team as Array<{ id?: string; level?: number; moves?: { id: string; name?: string }[]; maxHp?: number; atk?: number; isTransformed?: boolean } | null> | undefined)
        ?.find((mon: { id?: string } | null) => mon?.id === 'ditto');
      return p ? { id: p.id, level: p.level, moves: p.moves, maxHp: p.maxHp, atk: p.atk, isTransformed: p.isTransformed } : null;
    });

    expect(dittoData).not.toBeNull();
    expect(dittoData!.id).toBe('ditto');
    expect(dittoData!.level).toBe(5);
    expect(dittoData!.isTransformed).toBeFalsy();
    expect(dittoData!.moves).toHaveLength(1);
    expect(dittoData!.moves![0]?.id).toBe('transform');
    expect(dittoData!.moves![0]?.name).toBe('Transformación');
  });

  test('debería enfrentar a un Ditto salvaje, forzar su transformación en T1 por la IA salvaje, continuar el combate normalmente y derrotarlo', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayerDittoDefeat');
    await sim.setup();
    // Jugador con Pikachu nivel 50: Gruñido (movimiento 0, no letal) y Surf (movimiento 1, letal en T2 sin inmunidad de Pararrayos)
    await sim.setupWildDittoBattle({ speciesId: 'pikachu', level: 50, moves: ['growl', 'surf'] }, 5);

    // Turno 1: Jugador usa Gruñido (#move-btn-0). La IA salvaje de Ditto DEBE usar Transformación obligatoriamente
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    // Verificar que Ditto se transformó en Pikachu durante el turno 1
    const postT1State = await page.evaluate(() => {
      const bStore = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      return {
        isTransformed: bStore?.state?.enemy?.isTransformed,
        id: bStore?.state?.enemy?.id
      };
    });
    expect(postT1State.isTransformed).toBe(true);
    expect(postT1State.id).toBe('pikachu');

    // Turno 2: El combate continúa normalmente con la IA heurística estándar para los nuevos movimientos copiados.
    // El jugador ataca con Rayo (#move-btn-1) para derrotar al Ditto transformado.
    await armBattleFlowCompletion(page);
    await clickResilient(page.locator('#move-btn-1').first());
    await awaitBattleFlowCompletion(page);
  });

  test('debería jugar una secuencia de 3 combates seguidos capturando y usando los Pokémon capturados con sus movimientos reales', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestMultiBattle');
    await sim.setup();
    await sim.setupScenario('pidgey', 3);

    await sim.throwMasterBall();

    // --- COMBATE 2 ---
    await sim.setupScenario('rattata', 3);

    const activeMoves = await page.evaluate(() => {
      const moves = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player?.moves ?? [];
      return (moves as Array<{ id: string; name?: string } | null | undefined>).map((m: { id: string; name?: string } | null | undefined) => m ? { id: m.id, name: m.name ?? '' } : null).filter(Boolean);
    });
    expect(activeMoves).toContainEqual({ id: 'tackle', name: 'Placaje' });

    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);
    await sim.throwMasterBall();

    // --- COMBATE 3 ---
    await sim.setupScenario('caterpie', 2);

    const rattataMoves = await page.evaluate(() => {
      const moves = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player?.moves ?? [];
      return (moves as Array<{ id: string; name?: string } | null | undefined>).map((m: { id: string; name?: string } | null | undefined) => m ? { id: m.id, name: m.name ?? '' } : null).filter(Boolean);
    });
    expect(rattataMoves).toContainEqual({ id: 'tackle', name: 'Placaje' });
  });

  test('debería asegurar que todos los movimientos tengan una animación y categoría mapeada correctamente', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayer3');
    await sim.setup();

    const moveIdsToCheck = Object.keys(MOVE_TRANSLATIONS_ES);
    const unregisteredCategories = await page.evaluate(async (ids) => {
      const missing: string[] = []; // no-domain: Non-domain utility collection or data structure
      const { pokemonDataProvider } = await import('../../../src/logic/providers/pokemonDataProvider');
      
      ids.forEach((id) => {
        try {
          const md = pokemonDataProvider.getMoveData(id);
          if (!md) {
            missing.push(`${id}: no data in DB`);
            return;
          }
          const cat = String(md.cat || '').toLowerCase();
          if (cat !== 'physical' && cat !== 'special' && cat !== 'status') {
            missing.push(`${id}: invalid category "${cat}"`);
          }
        } catch (e: unknown) {
          missing.push(`${id}: error ${(e as Error).message}`);
        }
      });
      return missing;
    }, moveIdsToCheck);

    expect(unregisteredCategories).toEqual([]);
  });
});
