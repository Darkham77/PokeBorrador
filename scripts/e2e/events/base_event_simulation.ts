import { type Page, expect } from '@playwright/test';
import { BaseE2ESimulation, type SimulationOptions } from '../base_simulation.ts';

const E2E_ACTION_TIMEOUT_MS = 5000;

/**
 * scripts/e2e/events/base_event_simulation.ts
 *
 * Central superclass for all World Events Playwright simulations.
 * Encapsulates virtual time travel (setMockTime), canonical database verification (fail-fast),
 * HUD-based user navigation, multi-driver automated awarding (fn_award_event_automated),
 * and official UI interactions (enrollment, slot management, award claim/discard).
 */
export abstract class BaseEventSimulation extends BaseE2ESimulation {
  constructor(
    page: Page,
    username: string,
    logBufferOrOptions?: string[] | SimulationOptions,
    sqliteKey?: string,
    options?: SimulationOptions
  ) {
    super(page, username, logBufferOrOptions, sqliteKey, options);
  }

  /**
   * Overrides base setup to purge leftover awards and entries for this test user.
   * Enforces Dual Database Shared State Reset Contract (AGENTS.md line 12).
   */
  public override async setup(): Promise<void> {
    await super.setup();
    if (this.driver === 'postgres') {
      await this.queryTestDb('DELETE FROM awards WHERE winner_name = ?', [this.username]);
      await this.queryTestDb('DELETE FROM competition_entries WHERE player_name = ?', [this.username]);
    } else {
      await this.page.evaluate(async (user) => {
        const { queryLocal, persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await queryLocal('DELETE FROM awards WHERE winner_name = ?', [user]);
        await queryLocal('DELETE FROM competition_entries WHERE player_name = ?', [user]);
        await persistSQLite();
      }, this.username);
    }
  }

  /**
   * Sets the game client's virtual clock to a deterministic date and time.
   * Dispatches time-sync-update to trigger immediate reactive updates across all stores.
   */
  public async setMockGameTime(isoDateStr: string): Promise<void> {
    await this.page.evaluate(async (dateStr) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      if (gameStore.db) {
        gameStore.db.setMockTime(dateStr);
      }
      const { useEventStore } = await import('../../../src/stores/events.ts');
      await useEventStore().fetchEvents(true);
    }, isoDateStr);
  }

  /**
   * Restores real-world system clock in the client database router.
   */
  public async resetMockGameTime(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      if (gameStore.db) {
        gameStore.db.resetTime();
      }
      const { useEventStore } = await import('../../../src/stores/events.ts');
      await useEventStore().fetchEvents(true);
    });
  }

  /**
   * Asserts that a canonical event exists in the events_config table.
   * Fails loudly (fail-fast) if the event is missing from official database migrations.
   */
  public async assertCanonicalEventExists(eventId: string): Promise<void> {
    const rows = await this.queryTestDb<{ id: string; name: string }>(
      'SELECT id, name FROM events_config WHERE id = ?',
      [eventId]
    );
    if (!rows || rows.length === 0) {
      throw new Error(
        `[BaseEventSimulation] Canonical event "${eventId}" does not exist in events_config database. Fail-fast triggered.`
      );
    }
  }

  /**
   * Isolates an event by deactivating all other events in events_config for this test run.
   */
  public async isolateEvent(targetEventId: string): Promise<void> {
    if (this.driver === 'postgres') {
      await this.queryTestDb('UPDATE events_config SET active = false WHERE id != ?', [targetEventId]);
    } else {
      await this.page.evaluate(async (eventId) => {
        const { queryLocal, persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await queryLocal('UPDATE events_config SET active = 0 WHERE id != ?', [eventId]);
        await persistSQLite();
        const { useEventStore } = await import('../../../src/stores/events.ts');
        await useEventStore().fetchEvents(true);
      }, targetEventId);
    }
  }

  /**
   * Resets all competition entries, results, awards, and lockout for an event.
   * Enforces Dual Database Shared State Reset Contract (AGENTS.md).
   */
  public async purgeEventState(eventId: string): Promise<void> {
    if (this.driver === 'postgres') {
      await this.queryTestDb('DELETE FROM competition_entries WHERE event_id = ?', [eventId]);
      await this.queryTestDb('DELETE FROM competition_results WHERE event_id = ?', [eventId]);
      await this.queryTestDb('DELETE FROM awards WHERE event_id = ?', [eventId]);
      await this.queryTestDb('UPDATE events_config SET last_awarded_at = NULL WHERE id = ?', [eventId]);
    } else {
      await this.page.evaluate(async (id) => {
        const { queryLocal, persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await queryLocal('DELETE FROM competition_entries WHERE event_id = ?', [id]);
        await queryLocal('DELETE FROM competition_results WHERE event_id = ?', [id]);
        await queryLocal('DELETE FROM awards WHERE event_id = ?', [id]);
        await queryLocal('UPDATE events_config SET last_awarded_at = NULL WHERE id = ?', [id]);
        await persistSQLite();
      }, eventId);
    }
  }

  /**
   * Opens the World Events modal through official HUD navbar user controls:
   * Opens the social submenu and clicks #nav-social-events-btn.
   */
  public async openWorldEventsViaHud(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      useUIStore().openHudGroup = 'SOCIAL';
    });

    const eventsBtn = this.page.locator('.hud-center #nav-social-events-btn, #nav-social-events-btn').first();
    await eventsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await eventsBtn.click();

    const modalHeader = this.page.locator('.events-modal-header, .events-modal-content-inner').first();
    await modalHeader.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Navigates to the Home dashboard tab via HUD navigation button.
   */
  public async navigateToHome(): Promise<void> {
    const homeBtn = this.page.locator('#nav-home-btn').filter({ visible: true }).first();
    await expect(homeBtn).toBeVisible({ timeout: 5000 });
    await homeBtn.click();
    const homeView = this.page.locator('#home-view-container');
    await expect(homeView).toBeVisible({ timeout: 5000 });
  }

  /**
   * Opens the World Events modal directly via store (useful for secondary browser contexts).
   */
  public async openWorldEventsModal(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      await useEventStore().fetchEvents(true);
      useModalStore().open('WorldEvents');
    });
    const modalHeader = this.page.locator('.events-modal-header, .events-modal-content-inner');
    await modalHeader.first().waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Closes the World Events modal cleanly.
   */
  public async closeWorldEventsModal(): Promise<void> {
    const closeBtn = this.page.locator('#modal-close-btn, .modal-close-btn').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await this.page.evaluate(async () => {
        const { useModalStore } = await import('../../../src/stores/modals.ts');
        useModalStore().close('WorldEvents');
      });
    }
  }

  /**
   * Triggers automated awarding for an event via fn_award_event_automated.
   * Handles PostgreSQL anti-lockout reset and SQLite binary reload.
   */
  public async triggerEventAwarding(eventId: string): Promise<void> {
    if (this.driver === 'postgres') {
      await this.queryTestDb('UPDATE events_config SET last_awarded_at = NULL WHERE id = ?', [eventId]);
    }
    await this.page.evaluate(async (id) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      if (!gameStore.db) throw new Error('[BaseEventSimulation] Game database is not ready');
      await gameStore.db.rpc('fn_award_event_automated', { target_event_id: id });
      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }
      const { useEventStore } = await import('../../../src/stores/events.ts');
      await useEventStore().fetchEvents(true);
    }, eventId);
  }

  /**
   * Enrolls a Pokémon into a sub-competition through canonical #id locators:
   * #comp-slot-chip-<eventId>-<categoryId> -> #pokemon-select-<pokemonUid> -> #pokemon-selection-confirm-btn.
   */
  public async enrollPokemonById(
    eventId: string,
    categoryId: string,
    pokemonUid: string
  ): Promise<void> {
    const chip = this.page.locator(`#comp-slot-chip-${eventId}-${categoryId}`);
    await chip.waitFor({ state: 'visible', timeout: 5000 });
    await chip.click();

    const pokeSelect = this.page.locator(`#pokemon-select-${pokemonUid}`);
    await pokeSelect.waitFor({ state: 'visible', timeout: 5000 });
    await pokeSelect.click();

    // In autoConfirm mode (single-select competition slot), clicking confirms immediately.
    // Verify selection modal unmounts completely within the 5s timeout limit.
    await expect(this.page.locator('.selection-container')).toHaveCount(0, { timeout: 5000 });

    await this.page.evaluate(async () => {
      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }
    });
  }

  /**
   * Enrolls a Pokémon into a sub-competition through the official UI modal flow:
   * Target card -> category chip -> PokemonSelectionModal -> #pokemon-select-<uid> -> confirm.
   */
  public async enrollPokemonViaModal(
    cardTitle: string,
    categoryText: string,
    pokemonUid: string
  ): Promise<void> {
    const card = this.page.locator('.event-card').filter({ hasText: cardTitle }).first();
    await card.waitFor({ state: 'visible', timeout: E2E_ACTION_TIMEOUT_MS });

    const chip = card.locator('.comp-slot-chip').filter({ hasText: categoryText }).first();
    await chip.waitFor({ state: 'visible', timeout: E2E_ACTION_TIMEOUT_MS });
    await chip.click();

    const pokeSelect = this.page.locator(`#pokemon-select-${pokemonUid}`);
    await pokeSelect.waitFor({ state: 'visible', timeout: E2E_ACTION_TIMEOUT_MS });
    await pokeSelect.click();

    const confirmBtn = this.page.locator('#pokemon-selection-confirm-btn');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    await this.page.waitForFunction(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      return !useModalStore().isOpen('PokemonSelection');
    }, null, { timeout: E2E_ACTION_TIMEOUT_MS });

    await this.page.evaluate(async () => {
      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }
    });
  }

  /**
   * Asserts that a category chip reflects enrolled status (contains checkmark '✓').
   */
  public async expectSlotEnrolled(cardTitle: string, categoryText: string): Promise<void> {
    const card = this.page.locator('.event-card').filter({ hasText: cardTitle }).first();
    const chip = card.locator('.comp-slot-chip').filter({ hasText: categoryText }).first();
    await expect(chip).toContainText('✓', { timeout: E2E_ACTION_TIMEOUT_MS });
  }

  /**
   * Claims the first available pending award in the awards banner.
   */
  public async claimFirstPendingAward(): Promise<void> {
    const firstClaimBtn = this.page.locator('[id^="claim-pending-award-btn-"]').first();
    await expect(firstClaimBtn).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });
    await firstClaimBtn.click();
  }

  /**
   * Discards the first available pending award via ConfirmModal.
   */
  public async discardFirstPendingAward(): Promise<void> {
    const discardBtn = this.page.locator('[id^="discard-pending-award-btn-"]').first();
    await expect(discardBtn).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });
    await discardBtn.click();

    const confirmModalBtn = this.page.locator('#confirm-modal-btn');
    await expect(confirmModalBtn).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });
    await confirmModalBtn.click();
  }

  /**
   * Reads player currency and prize item counts from GameStore state.
   */
  public async getPlayerPrizeState(): Promise<{
    money: number;
    battleCoins: number;
    goldCapCount: number;
    rareCandyCount: number;
  }> {
    return this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const st = useGameStore().state;
      return {
        money: st.money || 0,
        battleCoins: st.battleCoins || 0,
        goldCapCount: (st.inventory && st.inventory['goldbottlecap']) || 0,
        rareCandyCount: (st.inventory && st.inventory['rarecandy']) || 0
      };
    });
  }

  /**
   * Verifies the complete interactive pending awards flow:
   * 1. Re-opens World Events modal.
   * 2. Asserts 2 pending awards exist in GUI.
   * 3. Claims the 1st award and verifies expected prizes are credited.
   * 4. Asserts 1 award remains in GUI.
   * 5. Discards the 2nd award via ConfirmModal.
   * 6. Asserts 0 pending awards remain in GUI.
   */
  public async verifyAwardClaimAndDiscardFlow(expectedPrize: {
    money: number;
    battleCoins: number;
    goldCapCount: number;
    rareCandyCount: number;
  }): Promise<void> {
    await this.openWorldEventsViaHud();

    const awardItems = this.page.locator('.event-pending-awards-banner .award-item');
    await expect(awardItems).toHaveCount(2, { timeout: E2E_ACTION_TIMEOUT_MS });

    await this.claimFirstPendingAward();
    await expect(awardItems).toHaveCount(1, { timeout: E2E_ACTION_TIMEOUT_MS });

    const stateAfterClaim = await this.getPlayerPrizeState();
    expect(stateAfterClaim.money).toBe(expectedPrize.money);
    expect(stateAfterClaim.battleCoins).toBe(expectedPrize.battleCoins);
    expect(stateAfterClaim.goldCapCount).toBe(expectedPrize.goldCapCount);
    expect(stateAfterClaim.rareCandyCount).toBe(expectedPrize.rareCandyCount);

    await this.discardFirstPendingAward();
    await expect(awardItems).toHaveCount(0, { timeout: E2E_ACTION_TIMEOUT_MS });
  }

  /**
   * Claims an award directly through the UI banner button.
   */
  public async claimPendingAward(awardId: string): Promise<void> {
    const claimBtn = this.page.locator(`#claim-pending-award-btn-${awardId}`);
    await claimBtn.waitFor({ state: 'visible', timeout: E2E_ACTION_TIMEOUT_MS });
    await claimBtn.click();
    await expect(claimBtn).toHaveCount(0, { timeout: E2E_ACTION_TIMEOUT_MS });
  }

  /**
   * Discards an award through the UI banner button with confirmation dialog.
   */
  public async discardPendingAward(awardId: string): Promise<void> {
    const discardBtn = this.page.locator(`#discard-pending-award-btn-${awardId}`);
    await discardBtn.waitFor({ state: 'visible', timeout: E2E_ACTION_TIMEOUT_MS });
    await discardBtn.click();

    const confirmModal = this.page.locator('.modal-overlay').filter({ hasText: '¿DESCARTAR RECOMPENSA?' });
    await confirmModal.waitFor({ state: 'visible', timeout: E2E_ACTION_TIMEOUT_MS });

    const confirmBtn = confirmModal.locator('.confirm-btn, .btn-confirm, button:has-text("DESCARTAR")').first();
    await confirmBtn.waitFor({ state: 'visible', timeout: E2E_ACTION_TIMEOUT_MS });
    await confirmBtn.click();

    await expect(discardBtn).toHaveCount(0, { timeout: E2E_ACTION_TIMEOUT_MS });
  }
}
