import { test, expect } from '@playwright/test';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../simulation_config.ts';
import { setupE2ESession, loginTestUser, openDebugTab, armBattleReadyForInput, awaitBattleReadyForInput, type WindowWithResolver } from '../e2e_helpers.ts';

const CHARMANDER_EXPECTED_HP = 97;
const CHARMANDER_EXPECTED_ATK = 46;
const CHARMANDER_EXPECTED_DEF = 47;
const CHARMANDER_EXPECTED_SPA = 74;
const CHARMANDER_EXPECTED_SPD = 55;
const CHARMANDER_EXPECTED_SPE = 72;
const E2E_CHARMANDER_LEVEL = 42;
const E2E_BULBASAUR_LEVEL = 33;
const E2E_WILD_CATERPIE_LEVEL = 5;
const E2E_WILD_BULBASAUR_LEVEL = 50;
const E2E_FULL_MOVESET_COUNT = 4;
const E2E_TEST_IV_HP_MAX = 31;
const E2E_TEST_IV_ATK_CUSTOM = 10;
const E2E_TEST_IV_DEF_CUSTOM = 15;
const E2E_TEST_IV_SPA_MAX = 31;
const E2E_TEST_IV_SPD_CUSTOM = 20;
const E2E_TEST_IV_SPE_MAX = 31;

interface E2ECharmander {
  id?: string;
  level?: number;
  nature?: string;
  ability?: string;
  nickname?: string | null;
  name?: string;
  ivs?: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number };
  maxHp?: number;
  atk?: number;
  def?: number;
  spa?: number;
  spd?: number;
  spe?: number;
  moves?: Array<{ id?: string; name?: string } | null>;
}

test.describe('Admin Debug Panel E2E Simulations', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ESession(page, []);
    await loginTestUser(page, 'DEBUG_ADMIN');
  });

  test('should create a custom pokemon and verify its properties in battle', async ({ page }) => {
    // 1. Open POKES tab
    await openDebugTab(page, 'POKES');

    // 2. Select Species: Charmander
    await page.locator('#debug-input-especie').fill('charmander');
    const charmanderOption = page.locator('#option-charmander').first();
    await charmanderOption.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await charmanderOption.click();

    // 3. Set Level: 42
    const levelInput = page.locator('#debug-input-level');
    await levelInput.fill(E2E_CHARMANDER_LEVEL.toString());

    // 4. Set Nature: Modest
    await page.locator('#debug-input-naturaleza').fill('modest');
    const modestOption = page.locator('#option-modest').first();
    await modestOption.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await modestOption.click();

    // 5. Set Ability: Blaze
    await page.locator('#debug-input-habilidad').fill('blaze');
    const blazeOption = page.locator('#option-blaze').first();
    await blazeOption.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await blazeOption.click();

    // 6. Set IVs: HP 31, ATK 10, DEF 15, SPA 31, SPD 20, SPE 31
    const ivs = { hp: '31', atk: '10', def: '15', spa: '31', spd: '20', spe: '31' };
    for (const [stat, val] of Object.entries(ivs)) {
      await page.locator(`#debug-iv-${stat}`).fill(val);
    }

    // 7. Set Nickname: FUEGUITO
    const nickInput = page.locator('#debug-input-nickname');
    await nickInput.fill('FUEGUITO');

    // 8. Auto Fill Moves
    await page.locator('#debug-btn-auto-moves').click();

    // 9. Click "ATRAPAR" (protocol 'catch')
    await page.locator('#debug-btn-catch').click();

    // 10. Close debug modal
    const closeBtn = page.locator('#debug-panel-modal-close-btn');
    await closeBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await closeBtn.click();
    await closeBtn.waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // 11. Create the inspection encounter through the visible debug controls.
    await openDebugTab(page, 'POKES');
    await page.locator('#debug-input-especie').fill('caterpie');
    const caterpieOption = page.locator('#option-caterpie').first();
    await caterpieOption.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await caterpieOption.click();
    await page.locator('#debug-input-level').fill(E2E_WILD_CATERPIE_LEVEL.toString());
    await armBattleReadyForInput(page);
    await page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(page);

    // 12. Verify active player pokemon stats/properties in combat store matches config
    const activePokemonState = await page.evaluate(() => {
      const win = window as WindowWithResolver;
      const gameStore = win.__VITE_DEBUG__?.getGameStore?.() as { state?: { team?: E2ECharmander[] } } | undefined;
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
    expect(activePokemonState.level).toBe(E2E_CHARMANDER_LEVEL);
    expect(activePokemonState.nature).toBe('modest');
    expect(activePokemonState.ability).toBe('blaze');
    expect(activePokemonState.nickname).toBe('FUEGUITO');
    expect(activePokemonState.ivs.hp).toBe(E2E_TEST_IV_HP_MAX);
    expect(activePokemonState.ivs.atk).toBe(E2E_TEST_IV_ATK_CUSTOM);
    expect(activePokemonState.ivs.def).toBe(E2E_TEST_IV_DEF_CUSTOM);
    expect(activePokemonState.ivs.spa).toBe(E2E_TEST_IV_SPA_MAX);
    expect(activePokemonState.ivs.spd).toBe(E2E_TEST_IV_SPD_CUSTOM);
    expect(activePokemonState.ivs.spe).toBe(E2E_TEST_IV_SPE_MAX);
    
    expect(activePokemonState.maxHp).toBe(CHARMANDER_EXPECTED_HP);
    expect(activePokemonState.atk).toBe(CHARMANDER_EXPECTED_ATK);
    expect(activePokemonState.def).toBe(CHARMANDER_EXPECTED_DEF);
    expect(activePokemonState.spa).toBe(CHARMANDER_EXPECTED_SPA);
    expect(activePokemonState.spd).toBe(CHARMANDER_EXPECTED_SPD);
    expect(activePokemonState.spe).toBe(CHARMANDER_EXPECTED_SPE);

    expect(activePokemonState.moves.length).toBe(E2E_FULL_MOVESET_COUNT);
    for (const mId of activePokemonState.moves) {
      expect(mId).not.toBe('');
    }
  });

  test('should create custom encounter and verify enemy properties in battle', async ({ page }) => {
    // 1. Open POKES tab
    await openDebugTab(page, 'POKES');

    // 2. Select Species: Bulbasaur
    await page.locator('#debug-input-especie').fill('bulbasaur');
    const bulbasaurOption = page.locator('#option-bulbasaur').first();
    await bulbasaurOption.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await bulbasaurOption.click();

    // 3. Set Level: 33
    const levelInput = page.locator('#debug-input-level');
    await levelInput.fill(E2E_BULBASAUR_LEVEL.toString());

    // 4. Click "ENCONTRAR"
    await armBattleReadyForInput(page);
    await page.locator('#debug-btn-encounter').click();

    // 5. Wait for combat to start and become ready for input
    await awaitBattleReadyForInput(page);

    // 6. Verify enemy pokemon state in battle matches bulbasaur level 33
    const enemyState = await page.evaluate(() => {
      const win = window as WindowWithResolver;
      const battleStore = win.__VITE_DEBUG_STORE_RESOLVER__?.();
      const enemy = battleStore?.state?.enemy;
      return {
        id: enemy?.id ?? '',
        level: enemy?.level ?? 0
      };
    });

    expect(enemyState.id).toBe('bulbasaur');
    expect(enemyState.level).toBe(E2E_BULBASAUR_LEVEL);
  });

  test('should configure and start trainer combat from ENTREN tab', async ({ page }) => {
    // 1. Open ENTREN tab
    await openDebugTab(page, 'ENTREN');

    // 2. Preset select
    const presetSelect = page.locator('#debug-trainer-preset-select');
    await presetSelect.selectOption('luchador');

    // 3. Generate random team for trainer (this overwrites trainer name)
    await page.locator('#debug-btn-gen-random-team').click();

    // 4. Fill trainer properties (do this after generation to override)
    const nameInput = page.locator('#debug-input-trainer-name');
    await nameInput.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await nameInput.fill('BROCK_TEST');

    // 5. Iniciar Combate (uses 'map' location type by default, which preserves name)
    await armBattleReadyForInput(page);
    await page.locator('#debug-battle-start-btn').click();

    // 6. Battle startup closes its initiating modal before rendering the arena.
    const closeBtn = page.locator('#debug-panel-modal-close-btn');
    await closeBtn.waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // 7. Wait for battle ready input
    await awaitBattleReadyForInput(page);

    // 8. Verify trainer properties in battle store
    const battleTrainerState = await page.evaluate(() => {
      const win = window as WindowWithResolver;
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
    const sandstormBtn = page.locator('#debug-weather-btn-sandstorm').first();
    await sandstormBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await sandstormBtn.click();

    // 3. Switch through the official tab control and create the inspection encounter.
    await openDebugTab(page, 'POKES');
    await page.locator('#debug-input-especie').fill('bulbasaur');
    const bulbasaurOption = page.locator('#option-bulbasaur').first();
    await bulbasaurOption.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await bulbasaurOption.click();
    await page.locator('#debug-input-level').fill(E2E_WILD_BULBASAUR_LEVEL.toString());
    await armBattleReadyForInput(page);
    await page.locator('#debug-btn-encounter').click();

    await awaitBattleReadyForInput(page);

    // 4. Verify weather in combat state is sandstorm
    const weatherState = await page.evaluate(() => {
      const win = window as WindowWithResolver;
      const battleStore = win.__VITE_DEBUG_STORE_RESOLVER__?.();
      return battleStore?.state?.weather?.type ?? '';
    });

    expect(weatherState).toBe('sandstorm');
  });
});
