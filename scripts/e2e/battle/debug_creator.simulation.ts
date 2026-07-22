// fallow-ignore-file security-sink
import { test, expect } from '@playwright/test';
import { setupE2ESession, loginTestUser, confirmAndStartBattle, waitForWaitInput, openDebugTab } from '../e2e_helpers.ts';

interface E2EWindow {
  __VITE_DEBUG_STORE_RESOLVER__?: () => {
    state: {
      isTrainer?: boolean;
      trainerName?: string;
      enemy?: { id: string; level: number };
      weather?: { type: string; turns: number; visual: string };
    } | null;
  };
  __VITE_DEBUG__?: {
    getGameStore?: () => {
      state: {
        team: Array<{
          id: string;
          level: number;
          nature: string;
          ability: string;
          nickname?: string | null;
          name: string;
          ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
          maxHp: number;
          atk: number;
          def: number;
          spa: number;
          spd: number;
          spe: number;
          moves: Array<{
            id?: string;
            name: string;
          } | null>;
        }>;
      };
    };
  };
}



test.describe('Admin Debug Panel E2E Simulations', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/api/dev-import-db-cleanup');
    await setupE2ESession(page);
    const testUser = `DEBUG_ADMIN_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    await loginTestUser(page, testUser);
  });

  test('should create a custom pokemon and verify its properties in battle', async ({ page }) => {
    // 1. Open POKES tab
    await openDebugTab(page, 'POKES');

    // 2. Select Species: Charmander
    const speciesContainer = page.locator('#debug-select-especie');
    await speciesContainer.locator('.search-input').fill('charmander');
    const charmanderOption = speciesContainer.locator('.option-item').filter({ hasText: 'CHARMANDER' }).first();
    await charmanderOption.waitFor({ state: 'visible', timeout: 5000 });
    await charmanderOption.click();

    // 3. Set Level: 42
    const levelInput = page.locator('.debug-input-group:has-text("NIVEL") input[type="number"]');
    await levelInput.fill('42');

    // 4. Set Nature: Modest
    const natureContainer = page.locator('#debug-select-naturaleza');
    await natureContainer.locator('.search-input').fill('modest');
    const modestOption = natureContainer.locator('.option-item').filter({ hasText: 'MODEST' }).first();
    await modestOption.waitFor({ state: 'visible', timeout: 5000 });
    await modestOption.click();

    // 5. Set Ability: Blaze
    const abilityContainer = page.locator('#debug-select-habilidad');
    await abilityContainer.locator('.search-input').fill('blaze');
    const blazeOption = abilityContainer.locator('.option-item').filter({ hasText: 'BLAZE' }).first();
    await blazeOption.waitFor({ state: 'visible', timeout: 5000 });
    await blazeOption.click();

    // 6. Set IVs: HP 31, ATK 10, DEF 15, SPA 31, SPD 20, SPE 31
    const ivs = { hp: '31', atk: '10', def: '15', spa: '31', spd: '20', spe: '31' };
    for (const [stat, val] of Object.entries(ivs)) {
      await page.locator(`.iv-item:has-text("${stat.toUpperCase()}") input`).fill(val);
    }

    // 7. Set Nickname: FUEGUITO
    const nickInput = page.locator('.debug-input-group:has-text("APODO") input[type="text"]');
    await nickInput.fill('FUEGUITO');

    // 8. Auto Fill Moves
    await page.locator('.moves-section button').filter({ hasText: '🪄' }).click();

    // 9. Click "ATRAPAR" (protocol 'catch')
    await page.locator('.creator-footer button').filter({ hasText: 'ATRAPAR' }).click();

    // 10. Close debug modal
    const closeBtn = page.locator('.modal-close-btn').first();
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();

    // 11. Start a wild encounter combat to inspect player pokemon state
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const caterpie = pokemonDebugService.generate({
        id: 'caterpie',
        level: 5,
        moves: ['tackle']
      });
      await useBattleStore().startBattle(caterpie, { locationId: 'route1' });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // 12. Verify active player pokemon stats/properties in combat store matches config
    const activePokemonState = await page.evaluate(() => {
      const win = window as unknown as E2EWindow;
      const gameStore = win.__VITE_DEBUG__?.getGameStore?.();
      // Find the Charmander we just created in the team
      const charmander = gameStore?.state?.team?.find((p) => p?.id === 'charmander');
      return {
        id: charmander?.id ?? '',
        level: charmander?.level ?? 0,
        nature: charmander?.nature ?? '',
        ability: charmander?.ability ?? '',
        nickname: charmander?.nickname ?? '',
        ivs: charmander?.ivs ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        maxHp: charmander?.maxHp ?? 0,
        atk: charmander?.atk ?? 0,
        def: charmander?.def ?? 0,
        spa: charmander?.spa ?? 0,
        spd: charmander?.spd ?? 0,
        spe: charmander?.spe ?? 0,
        moves: (charmander?.moves ?? []).map((m) => m?.id || ''),
      };
    });

    expect(activePokemonState.id).toBe('charmander');
    expect(activePokemonState.level).toBe(42);
    expect(activePokemonState.nature).toBe('modest');
    expect(activePokemonState.ability).toBe('blaze');
    expect(activePokemonState.nickname).toBe('FUEGUITO');
    expect(activePokemonState.ivs.hp).toBe(31);
    expect(activePokemonState.ivs.atk).toBe(10);
    expect(activePokemonState.ivs.def).toBe(15);
    expect(activePokemonState.ivs.spa).toBe(31);
    expect(activePokemonState.ivs.spd).toBe(20);
    expect(activePokemonState.ivs.spe).toBe(31);
    
    // exact stat assertions based on base stats, level 42, nature modest, and custom IVs
    expect(activePokemonState.maxHp).toBe(97);
    expect(activePokemonState.atk).toBe(46);
    expect(activePokemonState.def).toBe(47);
    expect(activePokemonState.spa).toBe(74);
    expect(activePokemonState.spd).toBe(55);
    expect(activePokemonState.spe).toBe(72);

    expect(activePokemonState.moves.length).toBe(4);
    for (const mId of activePokemonState.moves) {
      expect(mId).not.toBe('');
    }
  });

  test('should create custom encounter and verify enemy properties in battle', async ({ page }) => {
    // 1. Open POKES tab
    await openDebugTab(page, 'POKES');

    // 2. Select Species: Bulbasaur
    const speciesContainer = page.locator('.search-select-container:has-text("ESPECIE")');
    await speciesContainer.locator('.search-input').fill('bulbasaur');
    const bulbasaurOption = speciesContainer.locator('.option-item').filter({ hasText: 'BULBASAUR' }).first();
    await bulbasaurOption.waitFor({ state: 'visible', timeout: 5000 });
    await bulbasaurOption.click();

    // 3. Set Level: 33
    const levelInput = page.locator('.debug-input-group:has-text("NIVEL") input[type="number"]');
    await levelInput.fill('33');

    // 4. Click "ENCONTRAR"
    await page.locator('.creator-footer button').filter({ hasText: 'ENCONTRAR' }).click();

    // 5. Wait for combat to prompt and start it
    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // 6. Verify enemy pokemon state in battle matches bulbasaur level 33
    const enemyState = await page.evaluate(() => {
      const win = window as unknown as E2EWindow;
      const battleStore = win.__VITE_DEBUG_STORE_RESOLVER__?.();
      const enemy = battleStore?.state?.enemy;
      return {
        id: enemy?.id ?? '',
        level: enemy?.level ?? 0
      };
    });

    expect(enemyState.id).toBe('bulbasaur');
    expect(enemyState.level).toBe(33);
  });

  test('should configure and start trainer combat from ENTREN tab', async ({ page }) => {
    // 1. Open ENTREN tab
    await openDebugTab(page, 'ENTREN');

    // 2. Preset select
    const presetSelect = page.locator('.input-group:has(.field-label:has-text("Tema / Arquetipo")) select');
    await presetSelect.selectOption('luchador');

    // 3. Generate random team for trainer (this overwrites trainer name)
    await page.locator('button:has-text("GENERAR NUEVO EQUIPO AL AZAR")').click();

    // 4. Fill trainer properties (do this after generation to override)
    const nameInput = page.locator('.input-group:has(.field-label:has-text("Nombre del Entrenador")) input');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('BROCK_TEST');

    // 5. Iniciar Combate (uses 'map' location type by default, which preserves name)
    await page.locator('.battle-start-btn-debug').first().click();

    // 6. Wait and start combat
    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // 7. Verify trainer properties in battle store
    const battleTrainerState = await page.evaluate(() => {
      const win = window as unknown as E2EWindow;
      const battleStore = win.__VITE_DEBUG_STORE_RESOLVER__?.();
      return {
        isTrainer: !!battleStore?.state?.isTrainer,
        trainerName: battleStore?.state?.trainerName ?? '',
      };
    });

    expect(battleTrainerState.isTrainer).toBe(true);
    expect(battleTrainerState.trainerName).toBe('BROCK_TEST');
  });

  test('should manipulate cycle/weather from TIEMPO tab and verify combat weather sync', async ({ page }) => {
    // 1. Open TIEMPO tab
    await openDebugTab(page, 'TIEMPO');

    // 2. Set sandstorm weather
    const sandstormBtn = page.locator('.weather-grid button').filter({ hasText: 'T. ARENA' }).first();
    await sandstormBtn.waitFor({ state: 'visible', timeout: 5000 });
    await sandstormBtn.click();

    // 3. Close debug modal using the close button
    const closeBtn = page.locator('.modal-close-btn').first();
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();

    // 4. Start quick battle
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const bulbasaur = pokemonDebugService.generate({
        id: 'bulbasaur',
        level: 50,
        moves: ['splash']
      });
      await useBattleStore().startBattle(bulbasaur, { locationId: 'route1' });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // 5. Verify weather in combat state is sandstorm
    const weatherState = await page.evaluate(() => {
      const win = window as unknown as E2EWindow;
      const battleStore = win.__VITE_DEBUG_STORE_RESOLVER__?.();
      return battleStore?.state?.weather?.type ?? '';
    });

    expect(weatherState).toBe('sandstorm');
  });
});
