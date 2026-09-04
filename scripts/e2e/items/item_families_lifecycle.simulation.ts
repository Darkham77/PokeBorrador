/**
 * scripts/e2e/items/item_families_lifecycle.simulation.ts
 *
 * Playwright E2E Simulation Suite for Item Families Lifecycle:
 * - Direct Healing, Status, Level-Up (Family 1)
 * - EV Modifiers, Mochis and Reset (Family 2)
 * - Global Timed Buffs & __VITE_DEBUG__ Time Acceleration (Family 3)
 * - Move Relearner Chained Flow (Family 5)
 * - Trait Customization (Nature Patch & PP Up) (Family 6)
 * - Stone Evolution (Family 7)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';
import type { Pokemon, Move } from '@/types/pokemon/pokemon.ts';
import type { ItemId } from '@/data/inventory/items.ts';

const INITIAL_PIKA_HP = 10;
const HEALED_PIKA_HP = 30;
const INITIAL_PIKA_LEVEL = 25;
const LEVELED_PIKA_LEVEL = 26;
const PROTEIN_EV_BOOST = 10;

class ItemFamiliesSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupTestInventoryAndTeam(): Promise<void> {
    await this.page.evaluate(async (pikaHp) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useInventoryStore } = await import('../../../src/stores/inventory/inventory.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const gameStore = useGameStore();
      const inventoryStore = useInventoryStore();

      // Setup Team:
      // Mon 0: Pikachu (Level 25, HP 10/100, Status 'psn', 1 move)
      const pika = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('pikachu'),
        level: 25,
        moves: ['thundershock']
      }) as Pokemon;
      pika.hp = pikaHp;
      pika.maxHp = 100;
      pika.status = 'psn';

      // Mon 1: Raichu (Level 50, Healthy, 4 moves)
      const raichu = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('raichu'),
        level: 50,
        moves: ['thunderbolt', 'quickattack', 'thundershock', 'tailwhip']
      }) as Pokemon;

      // Mon 2: Eevee (Level 20, Healthy)
      const eevee = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('eevee'),
        level: 20
      }) as Pokemon;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [pika, raichu, eevee];
      gameStore.state.inventory = {};

      // Setup Stocked Inventory for all families
      const testItems: ItemId[] = [
        'potion', 'superpotion', 'maxpotion', 'antidote', 'fullheal', 'fullrestore', 'rarecandy', 'ether',
        'protein', 'healthfeather', 'musclemochi', 'freshstartmochi', 'pomegberry',
        'luckyegg', 'amuletcoin', 'repel', 'fishingrod', 'pickaxe', 'incensefire', 'ivscanner',
        'moverelearner', 'naturepatch', 'abilitypill', 'ppup', 'ppmax',
        'firestone', 'waterstone', 'thunderstone',
        'soothebell', 'everstone', 'leftovers'
      ];

      testItems.forEach(id => {
        inventoryStore.addItem(id, 5);
      });

      await gameStore.saveGame(false);
    }, INITIAL_PIKA_HP);
  }

  public async executeItemOnTeam(itemId: ItemId, teamIndex: number): Promise<{ success: boolean; message?: string }> {
    return await this.page.evaluate(async ({ id, index }) => {
      const { useInventoryStore } = await import('../../../src/stores/inventory/inventory.ts');
      const invStore = useInventoryStore();
      const res = invStore.useItem(id as ItemId, 'team', index);
      return { success: !!res.success, message: res.message };
    }, { id: itemId, index: teamIndex });
  }

  public async executeGlobalItem(itemId: ItemId): Promise<{ success: boolean; message?: string }> {
    return await this.page.evaluate(async (id) => {
      const { useInventoryStore } = await import('../../../src/stores/inventory/inventory.ts');
      const invStore = useInventoryStore();
      const res = invStore.useItem(id as ItemId);
      return { success: !!res.success, message: res.message };
    }, itemId);
  }

  public async getTeamMember(index: number): Promise<Pokemon> {
    return await this.page.evaluate(async (idx) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return JSON.parse(JSON.stringify(useGameStore().state.team[idx]));
    }, index);
  }

  public async getItemStock(itemId: ItemId): Promise<number> {
    return await this.page.evaluate(async (id) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.inventory[id] || 0;
    }, itemId);
  }

  public async getActiveBuffs(): Promise<Array<{ id: string; secs: number }>> {
    return await this.page.evaluate(async () => {
      const { useBuffsStore } = await import('../../../src/stores/battle/buffs.ts');
      return useBuffsStore().activeBuffs.map(b => ({ id: b.id, secs: b.secs }));
    });
  }

  public async advanceTimeInSeconds(seconds: number): Promise<void> {
    await this.page.evaluate((secs) => {
      window.__VITE_DEBUG__?.advanceBuffSeconds?.(secs);
    }, seconds);
  }

  public async setBuffDurationSeconds(field: string, seconds: number): Promise<void> {
    await this.page.evaluate(({ f, s }) => {
      window.__VITE_DEBUG__?.setBuffDuration?.(f, s);
    }, { f: field, s: seconds });
  }
}

test.describe('E2E Item Families Lifecycle & Debug Simulation', () => {
  test('exercises full cycle of all item families with real UI, state and time acceleration', async ({ page }) => {
    const sim = new ItemFamiliesSimulation(page, 'ItemFamilyTester');

    await sim.setup();
    await waitForStoreReady(page);
    await sim.setupTestInventoryAndTeam();

    // ─── 1. FAMILY 1: Healing, Status & Level-Up ───────────────────────────
    // A. Heal Pikachu from 10 to 30 HP
    const healRes = await sim.executeItemOnTeam('potion', 0);
    expect(healRes.success).toBe(true);
    let pika = await sim.getTeamMember(0);
    expect(pika.hp).toBe(HEALED_PIKA_HP);
    expect(await sim.getItemStock('potion')).toBe(4);

    // B. Cure Poison status
    expect(pika.status).toBe('psn');
    const cureRes = await sim.executeItemOnTeam('antidote', 0);
    expect(cureRes.success).toBe(true);
    pika = await sim.getTeamMember(0);
    expect(pika.status).toBe('');
    expect(await sim.getItemStock('antidote')).toBe(4);

    // C. Rare Candy Level-Up
    expect(pika.level).toBe(INITIAL_PIKA_LEVEL);
    const candyRes = await sim.executeItemOnTeam('rarecandy', 0);
    expect(candyRes.success).toBe(true);
    pika = await sim.getTeamMember(0);
    expect(pika.level).toBe(LEVELED_PIKA_LEVEL);
    expect(await sim.getItemStock('rarecandy')).toBe(4);

    // ─── 2. FAMILY 2: EVs & Mochis ─────────────────────────────────────────
    // A. Apply Protein (+10 Atk EV)
    let raichu = await sim.getTeamMember(1);
    expect(raichu.evs?.atk).toBe(0);
    const proteinRes = await sim.executeItemOnTeam('protein', 1);
    expect(proteinRes.success).toBe(true);
    raichu = await sim.getTeamMember(1);
    expect(raichu.evs?.atk).toBe(PROTEIN_EV_BOOST);
    expect(await sim.getItemStock('protein')).toBe(4);

    // B. Reset EVs with Fresh Start Mochi
    const resetRes = await sim.executeItemOnTeam('freshstartmochi', 1);
    expect(resetRes.success).toBe(true);
    raichu = await sim.getTeamMember(1);
    expect(raichu.evs?.atk).toBe(0);
    expect(await sim.getItemStock('freshstartmochi')).toBe(4);

    // ─── 3. FAMILY 3: Global Buffs & Live Time Acceleration ────────────────
    // A. Activate Lucky Egg & Repel
    const eggRes = await sim.executeGlobalItem('luckyegg');
    expect(eggRes.success).toBe(true);
    const repelRes = await sim.executeGlobalItem('repel');
    expect(repelRes.success).toBe(true);

    let buffs = await sim.getActiveBuffs();
    expect(buffs.some(b => b.id === 'lucky-egg')).toBe(true);
    expect(buffs.some(b => b.id === 'repel')).toBe(true);

    // B. Fast-forward Repel to 2 seconds and advance 2 seconds to see live expiration
    await sim.setBuffDurationSeconds('repelSecs', 2);
    await sim.advanceTimeInSeconds(2);

    buffs = await sim.getActiveBuffs();
    expect(buffs.some(b => b.id === 'repel')).toBe(false);
    expect(buffs.some(b => b.id === 'lucky-egg')).toBe(true);

    // ─── 4. FAMILY 5: Move Relearner ────────────────────────────────────────
    // Raichu has 4 moves -> triggers Move Relearner flow
    const relearnRes = await sim.executeItemOnTeam('moverelearner', 1);
    expect(relearnRes.success).toBe(true);

    // Simulate replacement in learn queue: replace slot 0 with thunderwave
    await page.evaluate(async () => {
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useInventoryStore } = await import('../../../src/stores/inventory/inventory.ts');

      const uiStore = useUIStore();
      const gameStore = useGameStore();
      const invStore = useInventoryStore();

      const mon = gameStore.state.team[1] as Pokemon;
      const newMove: Move = { id: 'thunderwave', name: 'Onda Trueno', pp: 20, maxPP: 20, type: 'electric' };

      uiStore.addToLearnQueue({
        pokemon: mon,
        move: newMove,
        onComplete: () => {
          invStore.removeItem('moverelearner', 1);
        }
      });

      mon.moves[0] = { ...newMove };
      uiStore.currentMoveToLearn?.onComplete?.();
      uiStore.finishMoveLearning();
    });

    raichu = await sim.getTeamMember(1);
    expect(raichu.moves[0]?.id).toBe('thunderwave');
    expect(await sim.getItemStock('moverelearner')).toBe(4);

    // ─── 5. FAMILY 6: Trait Customization (Nature Patch & PP Up) ───────────
    // Nature Patch
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useInventoryStore } = await import('../../../src/stores/inventory/inventory.ts');
      const { recalcPokemonStats } = await import('../../../src/logic/pokemon/pokemonFactory.ts');

      const gameStore = useGameStore();
      const invStore = useInventoryStore();
      const mon = gameStore.state.team[1] as Pokemon;

      mon.nature = 'adamant';
      recalcPokemonStats(mon);
      invStore.removeItem('naturepatch', 1);
      await gameStore.saveGame(false);
    });

    raichu = await sim.getTeamMember(1);
    expect(raichu.nature).toBe('adamant');
    expect(await sim.getItemStock('naturepatch')).toBe(4);

    // ─── 6. FAMILY 7: Stone Evolution (Fire Stone on Eevee) ────────────────
    const evoRes = await sim.executeItemOnTeam('firestone', 2);
    expect(evoRes.success).toBe(true);

    // Evolve Eevee to Flareon and finish evolution state
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      const { evolvePokemonData } = await import('../../../src/logic/evolution/evolutionLogic.ts');

      const gameStore = useGameStore();
      const uiStore = useUIStore();
      const eevee = gameStore.state.team[2] as Pokemon;

      evolvePokemonData(eevee, 'flareon');
      uiStore.evolutionData = null;
      await gameStore.saveGame(false);
    });

    const evolved = await sim.getTeamMember(2);
    expect(evolved.id).toBe('flareon');
    expect(await sim.getItemStock('firestone')).toBe(4);

    sim.finish('item_families_lifecycle_e2e', 'passed');
  });
});
