import { type Page, type Locator, expect } from '@playwright/test';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../simulation_config.ts';
import { clickResilient } from './e2eLogger.ts';
import type { WindowWithResolver } from './battleEventHelpers.ts';

const STORE_READY_TIMEOUT_MS = 15000;
const RESILIENT_NAV_TIMEOUT_MS = 15000;
const POLL_INTERVAL_STEPS = [200, 500, 1000];

export async function waitForStoreReady(page: Page, timeoutMs = STORE_READY_TIMEOUT_MS): Promise<void> {
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_GAME_STORE_RESOLVER__;
    if (resolver) {
      const store = resolver();
      return Boolean(store?.state && store.isReady === true);
    }
    const debug = (window as WindowWithResolver).__VITE_DEBUG__;
    if (!debug || !debug.getGameStore) return false;
    const store = debug.getGameStore();
    return Boolean(store?.state && store.isReady === true);
  }, undefined, { timeout: timeoutMs });
}

export async function openDebugTab(page: Page, category: string): Promise<void> {
  const categoryMap: Record<string, string> = {
    entren: 'trainers',
    entrenadores: 'trainers',
    tiempo: 'time',
    clase: 'class',
    modal: 'modals',
    misi: 'missions',
  };
  const categoryId = categoryMap[category.toLowerCase()] || category.toLowerCase();
  const navBtn = page.locator(`#debug-tab-${categoryId}, [id^="debug-tab-${categoryId}"]`).first();

  const isTabReady = (await navBtn.count()) > 0 && await navBtn.isVisible();
  if (!isTabReady) {
    const trigger = page.locator('#debug-trigger-btn').first();
    await trigger.waitFor({ state: 'visible', timeout: RESILIENT_NAV_TIMEOUT_MS });
    await expect.poll(async () => {
      const isVisible = await page.locator('#debug-nav').isVisible();
      if (!isVisible) {
        await clickResilient(trigger);
      }
      return await page.locator('#debug-nav').isVisible();
    }, { timeout: RESILIENT_NAV_TIMEOUT_MS, intervals: POLL_INTERVAL_STEPS }).toBe(true);
    await navBtn.waitFor({ state: 'visible', timeout: RESILIENT_NAV_TIMEOUT_MS });
  }

  await clickResilient(navBtn, { timeout: RESILIENT_NAV_TIMEOUT_MS });
}

export async function playSingleFishingNote(
  page: Page,
  noteId: number,
  modalContainer: Locator,
  feedbackLocator: Locator
): Promise<boolean> {
  if (!await modalContainer.isVisible() || await feedbackLocator.isVisible()) {
    return false;
  }

  const note = page.locator(`.rhythm-note[data-note-id="${noteId}"]`).first();
  try {
    await note.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (err) {
    if (!await modalContainer.isVisible() || await feedbackLocator.isVisible()) return false;
    throw err;
  }
  try {
    await page.waitForFunction((id) => {
      const ring = document.querySelector(`.rhythm-note[data-note-id="${id}"] .rhythm-ring`);
      if (!ring) return true;
      const transform = getComputedStyle(ring).transform;
      const scale = Number(transform.match(/matrix\(([^,]+)/)?.[1] ?? Number.NaN);
      return !Number.isFinite(scale) || scale <= 1.15;
    }, noteId, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch {
    // catch-ok: transition timeout, proceed to click attempt
  }
  try {
    await note.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (err) {
    if (!await modalContainer.isVisible() || await feedbackLocator.isVisible()) return false;
    throw err;
  }
  return true;
}

export async function playFishingMinigameNaturally(page: Page): Promise<void> {
  const modalContainer = page.locator('#rhythm-container, .rhythm-container').first();
  await modalContainer.waitFor({ state: 'attached', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  const counterText = await page.locator('.rhythm-counter').textContent();
  const totalNotes = Number(counterText?.match(/\/\s*(\d+)/)?.[1]);
  if (!Number.isInteger(totalNotes) || totalNotes < 1) {
    throw new Error(`[E2E] Fishing minigame reported an invalid note counter: ${counterText}`);
  }

  const feedbackLocator = page.locator('.game-feedback').first();

  for (let noteId = 1; noteId <= totalNotes; noteId++) {
    const shouldContinue = await playSingleFishingNote(page, noteId, modalContainer, feedbackLocator);
    if (!shouldContinue) break;
  }

  try {
    await modalContainer.waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (error: unknown) {
    console.debug('[E2E Minigame] Rhythm modal already detached or timed out waiting for detachment:', error instanceof Error ? error.message : String(error));
  }
}

export async function playArchaeologyMinigameNaturally(page: Page): Promise<void> {
  const grid = page.locator('#archaeology-grid').first();
  await grid.waitFor({ state: 'visible', timeout: RESILIENT_NAV_TIMEOUT_MS });
  const tiles = grid.locator('.tile');
  const tileCount = await tiles.count();
  if (tileCount === 0) {
    throw new Error('[E2E] Archaeology minigame rendered an empty grid.');
  }

  for (let index = 0; index < tileCount; index++) {
    if (!await grid.isVisible()) break;
    try {
      await tiles.nth(index).click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    } catch (error) {
      if (!await grid.isVisible()) break;
      throw error;
    }
  }

  try {
    await grid.waitFor({ state: 'detached', timeout: RESILIENT_NAV_TIMEOUT_MS });
  } catch (error: unknown) {
    console.debug('[E2E Minigame] Archaeology grid already detached or timed out waiting for detachment:', error instanceof Error ? error.message : String(error));
  }
}
