import { type Page, expect } from '@playwright/test';
import { toID } from '@pkmn/sim';
import {
  MAX_PER_ACTION_TIMEOUT_MS,
  MAX_UI_SETTLE_TIMEOUT_MS,
  SWITCH_SLOT_INDEX_OFFSET
} from '../simulation_config.ts';
import { isMatchingUid } from '../../../src/logic/battle/showdownUidMapper.ts';
import type { CertifiedBattleCase } from '../fuzzer/generators/fuzzer_team_generator.ts';
import { clickResilient } from './e2eLogger.ts';
import {
  waitForWaitInput,
  type WindowWithResolver
} from './battleEventHelpers.ts';

export type CertifiedTestBatch = CertifiedBattleCase;

export interface BattleLogEntry {
  side: 'player' | 'enemy';
  msg: string;
}

export interface PlayerRequestPokemonSlot {
  uid?: string;
  active?: boolean;
}

export interface E2EBattleState {
  over?: boolean;
  turnCount?: number;
  player?: { name?: string; hp?: number; maxHp?: number };
  enemy?: { name?: string; hp?: number; maxHp?: number };
  playerRequest?: unknown;
  enemyRequest?: unknown;
}

const ITEM_TRANSLATIONS: Record<string, string> = {
  potion: 'Poción',
  superpotion: 'Superpoción',
  hyperpotion: 'Hiperpoción',
  maxpotion: 'Poción Máxima',
  revive: 'Revivir',
  revivemax: 'Max Revivir'
};

interface DebugStore {
  player?: { moves?: Array<{ id: string } | null> };
  state?: {
    playerRequest?: { active?: Array<{ moves?: Array<{ id?: string }> }> };
    player?: { moves?: Array<{ id: string } | null> };
  };
}

export async function resolveTargetUidForSlot(page: Page, slotNum: number, _label: string): Promise<string | null> {
  return await page.evaluate(async ({ slotNum }) => {
    try {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return null;
      const store = resolver();
      const state = store.state;
      if (!state) return null;
      
      const { ShowdownTeamResolver } = (await import('../../../src/logic/battle/showdownTeamResolver.ts')) as { ShowdownTeamResolver: { getPokemonByShowdownSlot: (team: unknown[], request: unknown, slot: number) => { uid?: string } | null | undefined } };
      
      const gameStore = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.() as { state: { team: unknown[] } } | undefined;
      const team = gameStore?.state?.team || [];
      const pokemon = ShowdownTeamResolver.getPokemonByShowdownSlot(team, state.playerRequest, slotNum);
      if (pokemon && pokemon.uid) {
        return pokemon.uid;
      }
      return null;
    } catch (_err: unknown) {
      return null;
    }
  }, { slotNum });
}

export async function confirmAndStartBattle(page: Page): Promise<void> {
  try {
    const confirmBtn = page.locator('#confirm-modal-btn').first();
    if ((await confirmBtn.count()) > 0 && (await confirmBtn.isVisible())) {
      await clickResilient(confirmBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    }
  } catch (error: unknown) {
    console.debug('[E2E AutoBattle] Confirm button already dismounted or non-visible:', error instanceof Error ? error.message : String(error));
  }

  try {
    const startBtn = page.locator('#start-encounter-btn').first();
    await startBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(startBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (error: unknown) {
    console.debug('[E2E AutoBattle] Start button already dismounted or non-visible:', error instanceof Error ? error.message : String(error));
  }
}

export async function executeNativeAutoBattle(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (window.__VITE_DEBUG__) window.__VITE_DEBUG__.isScriptedReplayMode = false;
  });

  try {
    await page.waitForFunction(() => {
      const isBattleInDom = Boolean(document.querySelector('#battle-view, .battle-arena, #battle-controls-layout'));
      if (!isBattleInDom) return false;
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      const active = (store?.activeBattle || store?.state) as { over?: boolean } | undefined;
      if (!store || !active) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      return !store.isProcessing
        && fsmState === 'ACTIVE_BATTLE'
        && (fsmSubState === 'WAIT_INPUT' || fsmSubState === 'SWITCH_MENU')
        && active.over === false;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (err: unknown) {
    const debugInfo = await page.evaluate(() => {
      const isBattleInDom = Boolean(document.querySelector('#battle-view, .battle-arena, #battle-controls-layout'));
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      const active = (store?.activeBattle || store?.state) as { over?: boolean } | undefined;
      return {
        isBattleInDom,
        hasStore: Boolean(store),
        hasState: Boolean(active),
        fsmState: store?.currentFsmState,
        fsmSubState: store?.currentSubState,
        isProcessing: store?.isProcessing,
        over: active?.over
      };
    });
    console.error('[E2E-DEBUG] Failed to start native battle. State:', JSON.stringify(debugInfo));
    throw err;
  }

  while (true) {
    await waitForWaitInput(page);
    const battleOver = await page.evaluate(() => {
      const isBattleInDom = Boolean(document.querySelector('#battle-view, .battle-arena, #battle-controls-layout'));
      if (!isBattleInDom) return true;
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      if (!store) return true;
      const active = (store.activeBattle || store.state) as { over?: boolean } | undefined;
      const fsmState = store.currentFsmState;
      return active?.over === true ||
        fsmState === 'EXIT_BATTLE' ||
        fsmState === 'REWARDS_PHASE' ||
        fsmState === 'SEARCH_PHASE';
    });
    if (battleOver) {
      return;
    }

    const stateInfo = await page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      const active = (store?.activeBattle || store?.state) as { turnCount?: number; player?: { name?: string; hp?: number }; enemy?: { name?: string; hp?: number } } | undefined;
      return {
        turn: active?.turnCount,
        fsm: store?.currentFsmState,
        sub: store?.currentSubState,
        pName: active?.player?.name,
        pHp: active?.player?.hp,
        eName: active?.enemy?.name,
        eHp: active?.enemy?.hp,
      };
    });
    console.debug(`[E2E-AUTO-BATTLE] Turn ${stateInfo.turn} | FSM: ${stateInfo.fsm}/${stateInfo.sub} | Player: ${stateInfo.pName} (${stateInfo.pHp} HP) vs Enemy: ${stateInfo.eName} (${stateInfo.eHp} HP)`);

    const actionTaken = await handleBattleInput(page);
    if (!actionTaken) {
      const battleState = await page.evaluate(() => {
        const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
        const active = (store?.activeBattle || store?.state) as { over?: boolean; playerRequest?: unknown; enemyRequest?: unknown } | undefined;
        return {
          fsm: store?.currentFsmState,
          subState: store?.currentSubState,
          isProcessing: store?.isProcessing,
          isOver: active?.over,
          playerRequest: active?.playerRequest,
          enemyRequest: active?.enemyRequest,
        };
      });
      throw new Error(`[E2E] Failed to take battle input in state: ${JSON.stringify(battleState)}`);
    }
  }
}

export async function handleSwitchMenuInput(page: Page, choice?: string): Promise<boolean> {
  const cleanChoice = choice?.trim().toLowerCase() ?? '';
  if (cleanChoice.startsWith('switch ')) {
    const switchSlot = parseInt(cleanChoice.split(' ')[1] || '2', 10);
    const targetUid = await resolveTargetUidForSlot(page, switchSlot, 'SWITCH_MENU');

    if (targetUid) {
      const modalItem = page.locator(`.base-modal-root .list-item[data-pokemon-uid="${targetUid}"], .list-item[data-pokemon-uid="${targetUid}"]`).first();
      const isModalItemVisible = (await modalItem.count()) > 0 && await modalItem.isVisible();
      if (isModalItemVisible) {
        await clickResilient(modalItem, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
        return true;
      }

      const cardBtn = page.locator(`.quick-card-override[data-pokemon-uid="${targetUid}"]`).first();
      await cardBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
      await clickResilient(cardBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    } else {
      const switchIdx = switchSlot - SWITCH_SLOT_INDEX_OFFSET;
      const allBenchCards = page.locator('[id^="battle-switch-"]:not(.is-active)');
      await allBenchCards.first().waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
      await allBenchCards.nth(switchIdx).click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    }
    return true;
  }

  const modalItem = page.locator('.base-modal-root .list-item:not(.is-fainted):not(.is-selected), .list-item[id^="pokemon-select-"]:not(.is-fainted)').first();
  const isModalItemVisible = (await modalItem.count()) > 0 && await modalItem.isVisible();
  if (isModalItemVisible) {
    await clickResilient(modalItem, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    return !choice;
  }

  const activeSwitchBtn = page.locator('[id^="battle-switch-"]:not(.is-active):not(.is-fainted):not(.is-disabled)').first();
  await activeSwitchBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await clickResilient(activeSwitchBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  return !choice;
}

export async function handleMoveChoice(page: Page, cleanChoice: string): Promise<boolean> {
  const moveToken = cleanChoice.split(' ')[1] || '';
  if (moveToken === 'recharge') return true;

  const moveIdx = parseInt(moveToken || '1', 10) - 1;
  const struggleOverlay = page.locator('#struggle-overlay');
  const isStruggleActive = (await struggleOverlay.count()) > 0 && await struggleOverlay.isVisible();

  let moveBtn;
  if (isStruggleActive) {
    moveBtn = struggleOverlay.locator('button[id^="move-btn-"]');
  } else {
    const resolvedVisualIdx = await page.evaluate((idx: number): number => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return idx;
      const store = resolver() as DebugStore;

      const playerRequest = store.state?.playerRequest;
      const active = playerRequest?.active;
      const activeMon = (active && active.length > 0) ? active[0] : null;
      if (!activeMon) return idx;
      const movesList = activeMon.moves;
      if (!movesList) return idx;
      const reqMove = movesList[idx];
      const targetMoveId = reqMove ? reqMove.id : null;
      if (!targetMoveId) return idx;

      let moves: Array<{ id: string } | null> | undefined = undefined;
      const pStore = store.player;
      if (pStore && pStore.moves) {
        moves = pStore.moves;
      } else {
        const pState = store.state?.player;
        if (pState && pState.moves) moves = pState.moves;
      }
      if (!moves) return idx;
      const vIdx = moves.findIndex((m) => m && m.id === targetMoveId);
      return vIdx !== -1 ? vIdx : idx;
    }, moveIdx);

    moveBtn = page.locator('#move-panel button[id^="move-btn-"]').nth(resolvedVisualIdx);
  }

  await moveBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  if (await moveBtn.isDisabled()) {
    return false;
  }
  await clickResilient(moveBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  return true;
}

export async function handleSwitchChoice(page: Page, cleanChoice: string): Promise<boolean> {
  const switchSlot = parseInt(cleanChoice.split(' ')[1] || String(SWITCH_SLOT_INDEX_OFFSET), 10);
  const targetUid = await resolveTargetUidForSlot(page, switchSlot, 'SWITCH');

  if (targetUid) {
    const cardBtn = page.locator(`.quick-card-override[data-pokemon-uid="${targetUid}"]`).first();
    await cardBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(cardBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } else {
    const switchIdx = switchSlot - SWITCH_SLOT_INDEX_OFFSET;
    const allBenchCards = page.locator('[id^="battle-switch-"]:not(.is-active)');
    await allBenchCards.first().waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(allBenchCards.nth(switchIdx), { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }
  return true;
}

export async function handleItemChoice(page: Page, cleanChoice: string): Promise<boolean> {
  const parts = cleanChoice.split(':');
  const itemId = parts[1] || 'potion';
  const targetIdx = parseInt(parts[2] || '1', 10) - 1;
  const translatedName = ITEM_TRANSLATIONS[itemId] || itemId;

  const quickCard = page.locator(`.quick-item-card[data-item-id="${itemId}"]`);
  const isQuickVisible = (await quickCard.count()) > 0 && await quickCard.isVisible();

  if (isQuickVisible) {
    await clickResilient(quickCard, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } else {
    const bagBtn = page.locator('#battle-bag-btn');
    await bagBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(bagBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const backpackItem = page.locator(`#inventory-item-${toID(translatedName)}, .inventory-item-card`).first();
    await backpackItem.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(backpackItem, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }

  const targetUid = await page.evaluate((idx) => {
    try {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return null;
      const battleStore = resolver();
      const pinia = battleStore._p;
      const gameStore = pinia?._s?.get('game');
      const team = [...(gameStore?.state?.team || [])].filter((p): p is NonNullable<typeof p> => p != null);
      return team[idx]?.uid || null;
    } catch (_e) {
      return null;
    }
  }, targetIdx);

  let targetBtn = page.locator('[id^="pokemon-select-"]').nth(targetIdx);
  if (targetUid) {
    targetBtn = page.locator(`#pokemon-select-${targetUid}`).first();
  }

  await targetBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await clickResilient(targetBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  return true;
}

export async function executeSpecificChoice(page: Page, choice: string): Promise<boolean> {
  try {
    const cleanChoice = choice.trim().toLowerCase();
    if (cleanChoice.startsWith('move ')) {
      return await handleMoveChoice(page, cleanChoice);
    }
    if (cleanChoice.startsWith('switch ')) {
      return await handleSwitchChoice(page, cleanChoice);
    }
    if (cleanChoice.startsWith('useitem:')) {
      return await handleItemChoice(page, cleanChoice);
    }
    return true;
  } catch (e) {
    console.error(`[E2E] Strict Choice '${choice}' failed to execute in the UI. Aborting test. Error:`, e);
    throw e;
  }
}

export async function handleBattleInput(page: Page, choice?: string): Promise<boolean> {
  if (choice !== undefined && choice.trim() === '') {
    return true;
  }

  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    return !resolver().isProcessing;
  }, undefined, { timeout: MAX_UI_SETTLE_TIMEOUT_MS });

  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    try {
      return !resolver().isProcessing;
    } catch {
      return true;
    }
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

  await page.locator('#battle-controls-layout.is-ui-locked, .battle-controls-layout.is-ui-locked').first().waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS });

  const subState = await page.evaluate(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return 'WAIT_INPUT';
    try {
      const store = resolver();
      return store?.currentSubState ?? 'WAIT_INPUT';
    } catch {
      return 'WAIT_INPUT';
    }
  });

  const isModalOpen = await page.evaluate(async () => {
    try {
      const { useModalStore } = await import('@/stores/modals');
      return useModalStore().stack.some(m => !m.closing);
    } catch {
      return false;
    }
  });

  if (isModalOpen && subState === 'WAIT_INPUT') {
    console.debug('[E2E-HANDLE-INPUT] Blocking modal is currently open during WAIT_INPUT. Skipping input.');
    return false;
  }

  if (subState === 'SWITCH_MENU') {
    return handleSwitchMenuInput(page, choice);
  }

  if (!choice) {
    const firstMoveBtn = page.locator('#move-panel button[id^="move-btn-"]:not([disabled]):not(.disabled-move), button[id^="move-btn-"]:not([disabled]):not(.disabled-move)').first();
    await firstMoveBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(firstMoveBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    return true;
  }

  return executeSpecificChoice(page, choice);
}

export async function checkIfChoiceIsInvalid(page: Page, choice: string | undefined): Promise<boolean> {
  if (!choice) return false;
  return await page.evaluate((ch) => {
    try {
      const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const battleStore = resolver();
      const battle = battleStore.state;
      if (!battle) return false;
      const req = battle.playerRequest;

      if (req?.wait) {
        return true;
      }

      const clean = ch.trim().toLowerCase();
      if (clean.startsWith('move ')) {
        const moveIdx = parseInt(clean.split(' ')[1] || '1', 10) - 1;
        const move = battle.player?.moves?.[moveIdx];
        const reqMove = req?.active?.[0]?.moves?.[moveIdx];
        const isInvalid = !move || (reqMove && reqMove.disabled);
        return !!isInvalid;
      } else if (clean.startsWith('switch ')) {
        const slotNum = parseInt(clean.split(' ')[1] || '2', 10);
        const slotOrder = req?.side?.pokemon || [];
        const targetPoke = slotOrder[slotNum - 1];
        if (!targetPoke) {
          return true;
        }
        const isFnt = targetPoke.condition.endsWith(' fnt') || targetPoke.condition.startsWith('0/');
        const isInvalid = !!targetPoke.active || isFnt;
        return !!isInvalid;
      }
      return false;
    } catch (_e: unknown) {
      return false;
    }
  }, choice);
}

export async function verifyHpParity(page: Page): Promise<void> {
  try {
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      const playerHp = store.state?.player?.hp ?? 0;
      const playerMaxHp = store.state?.player?.maxHp ?? 1;
      const enemyHp = store.state?.enemy?.hp ?? 0;
      const enemyMaxHp = store.state?.enemy?.maxHp ?? 1;

      const simBattle = (window as WindowWithResolver).__SIMULATOR_BATTLE__;
      if (simBattle) {
        const simP1Hp = simBattle.p1?.active?.[0]?.hp;
        const simP2Hp = simBattle.p2?.active?.[0]?.hp;
        if (simP1Hp !== undefined && simP1Hp !== playerHp) return false;
        if (simP2Hp !== undefined && simP2Hp !== enemyHp) return false;
      }

      if (playerHp > 0) {
        const el = document.querySelector('.player-card .hp-values');
        const text = el?.textContent ?? '';
        if (!text.includes(`${playerHp}/${playerMaxHp}`)) return false;
      }
      if (enemyHp > 0) {
        const el = document.querySelector('.enemy-card .hp-values');
        const text = el?.textContent ?? '';
        if (!text.includes(`${enemyHp}/${enemyMaxHp}`)) return false;
      }
      return true;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (err) {
    const diagnosis = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return { storePlayer: 'null', storeEnemy: 'null', domPlayer: 'null', domEnemy: 'null' };
      const store = resolver();
      const storePlayer = `${store.state?.player?.hp}/${store.state?.player?.maxHp}`;
      const storeEnemy  = `${store.state?.enemy?.hp}/${store.state?.enemy?.maxHp}`;
      const domPlayer   = document.querySelector('.player-card .hp-values')?.textContent ?? 'null';
      const domEnemy    = document.querySelector('.enemy-card .hp-values')?.textContent ?? 'null';
      return { storePlayer, storeEnemy, domPlayer, domEnemy };
    });
    console.error(`[E2E ERROR] HP Mismatch — Store player: ${diagnosis.storePlayer}, DOM player: "${diagnosis.domPlayer}" | Store enemy: ${diagnosis.storeEnemy}, DOM enemy: "${diagnosis.domEnemy}"`);
    throw err;
  }
}

export async function dispatchReplayChoice(
  page: Page,
  action: { choice: string; targetUid: string; activePlayerUid: string; requestSlots: unknown[] }
): Promise<void> {
  const normalizedChoice = action.choice.trim().toLowerCase();
  if (normalizedChoice.startsWith('move ')) {
    const moveSlot = Number(normalizedChoice.slice('move '.length)) - 1;
    if (!Number.isInteger(moveSlot) || moveSlot < 0) {
      throw new Error(`[E2E-CERTIFIED-REPLAY] Invalid certified move choice: "${action.choice}".`);
    }
    await clickResilient(page.locator(`#move-btn-${moveSlot}:not([disabled])`).first());
  } else if (normalizedChoice.startsWith('switch ')) {
    const switchSlot = Number(normalizedChoice.slice('switch '.length));
    const targetUid = action.targetUid;
    if (!Number.isInteger(switchSlot) || switchSlot < 1 || !targetUid) {
      throw new Error(`[E2E-CERTIFIED-REPLAY] Certified switch target cannot be resolved. context=${JSON.stringify({ choice: action.choice, activePlayerUid: action.activePlayerUid, requestSlots: action.requestSlots })}`);
    }
    if (targetUid === action.activePlayerUid) {
      throw new Error(`[E2E-CERTIFIED-REPLAY] Certified switch resolves to the active client Pokémon. context=${JSON.stringify({ choice: action.choice, targetUid, requestSlots: action.requestSlots })}`);
    }
    const certifiedTarget = page.locator(`#battle-switch-${targetUid}`).first();
    await certifiedTarget.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(certifiedTarget);
  } else if (normalizedChoice === 'struggle') {
    await clickResilient(page.locator('#struggle-overlay #move-btn-0:not([disabled])').first());
  } else if (normalizedChoice === '') {
    throw new Error('[E2E-CERTIFIED-REPLAY] The game exposed player input for a P2-only certified step; the automatic opponent transition is missing.');
  } else {
    throw new Error(`[E2E-CERTIFIED-REPLAY] Unsupported certified UI choice: "${action.choice}".`);
  }
}

export async function checkIfReplayEndingOrOver(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    const store = resolver?.();
    const active = (store?.activeBattle || store?.state) as { over?: boolean } | undefined;
    if (!active || active.over) return true;
    const debug = (window as WindowWithResolver).__VITE_DEBUG__;
    const history = Reflect.get(debug ?? {}, 'history');
    const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
    const isReplayComplete = Array.isArray(history) && typeof historyIndex === 'number' && historyIndex >= history.length;
    const workerEnded = Reflect.get(debug ?? {}, 'certifiedReplayWorkerEnded') === true;
    return isReplayComplete && workerEnded;
  });
}

function verifyFinalStateTeam(
  seat: 'p1' | 'p2',
  expectedTeam: Array<{ uid?: string; name: string; hp: number; maxHp: number; status?: string; fainted: boolean }>,
  clientState: { p1: Array<{ uid: string; name: string; hp: number; maxHp: number; status: string; fainted: boolean }>; p2: Array<{ uid: string; name: string; hp: number; maxHp: number; status: string; fainted: boolean }> }
): void {
  expectedTeam.forEach((expected) => {
    const targetUid = expected.uid || expected.name;
    const clientPoke = clientState[seat].find(p => isMatchingUid(p.uid, targetUid));
    if (clientPoke) {
      if (clientPoke.fainted !== expected.fainted) {
        throw new Error(`[E2E-PARITY] ${seat} ${targetUid} fainted mismatch: expected=${expected.fainted}, actual=${clientPoke.fainted}, hp=${clientPoke.hp}/${clientPoke.maxHp}.`);
      }
      if (clientPoke.maxHp !== expected.maxHp) {
        throw new Error(`[E2E-PARITY] ${seat} ${targetUid} max HP mismatch: expected=${expected.maxHp}, actual=${clientPoke.maxHp}.`);
      }
      if (!expected.fainted) {
        if (clientPoke.hp !== expected.hp) {
          throw new Error(`[E2E-PARITY] ${seat} ${targetUid} HP mismatch: expected=${expected.hp}, actual=${clientPoke.hp}.`);
        }
        if (expected.status !== undefined) {
          const expectedStatus = expected.status || '';
          if (clientPoke.status !== expectedStatus) {
            throw new Error(`[E2E-PARITY] ${seat} ${targetUid} status mismatch: expected=${expectedStatus}, actual=${clientPoke.status}.`);
          }
        }
      }
    } else {
      throw new Error(`[E2E] Expected ${seat} pokemon with prefix ${expected.name} not found in client state.`);
    }
  });
}

export async function executeAutoBattle(
  page: Page,
  finalState?: CertifiedTestBatch['finalState']
): Promise<void> {
  await page.evaluate(() => {
    if (window.__VITE_DEBUG__) {
      window.__VITE_DEBUG__.isScriptedReplayMode = true;
    }
  });

  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    return !!resolver?.().state;
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

  while (true) {
    await page.waitForFunction(() => {
      const readiness = window.__VITE_DEBUG__?.getScriptedReplayReadiness?.();
      return readiness?.isReady === true;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const eventDetail = await page.evaluate(() => {
      const readiness = window.__VITE_DEBUG__?.getScriptedReplayReadiness?.();
      if (!readiness?.isReady) {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Scripted replay readiness disappeared before action dispatch. context=${JSON.stringify(readiness)}`);
      }
      return readiness;
    });

    if (eventDetail.over) {
      break;
    }

    if (eventDetail.subState === 'WAIT_INPUT') {
      await verifyHpParity(page);
    }

    const action = await page.evaluate(async () => {
      const debug = window.__VITE_DEBUG__;
      const history = Reflect.get(debug ?? {}, 'history');
      const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
      if (!Array.isArray(history) || typeof historyIndex !== 'number') {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Missing certified history cursor. context=${JSON.stringify({ hasHistory: Array.isArray(history), historyIndex })}`);
      }
      if (historyIndex >= history.length) {
        return { choice: '', historyIndex, terminal: true, targetUid: '', activePlayerUid: '', requestSlots: [] };
      }
      const step = history[historyIndex] as { p1Choice?: unknown } | undefined;
      if (!step || typeof step.p1Choice !== 'string') {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Missing P1 choice at certified history index ${historyIndex}.`);
      }
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const battleStore = resolver?.();
      const playerRequest = battleStore?.state?.playerRequest;
      const gameStore = debug?.getGameStore?.() as { state?: { team?: unknown[] } } | undefined;
      if (!battleStore?.state || battleStore.state.over === true) {
        return { choice: '', historyIndex, terminal: true, targetUid: '', activePlayerUid: '', requestSlots: [] };
      }
      if (!playerRequest || !gameStore?.state?.team) {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Live battle is missing a request or local team for UI slot mapping. context=${JSON.stringify({
          hasPlayerRequest: Boolean(playerRequest),
          hasLocalTeam: Boolean(gameStore?.state?.team),
          fsm: battleStore.currentFsmState,
          subState: battleStore.currentSubState,
        })}`);
      }
      const { ShowdownTeamResolver } = await import('../../../src/logic/battle/showdownTeamResolver.ts');
      const normalizedChoice = step.p1Choice.trim().toLowerCase();
      const switchSlot = normalizedChoice.startsWith('switch ') ? Number(normalizedChoice.slice('switch '.length)) : null;
      const target = switchSlot === null ? null : ShowdownTeamResolver.getPokemonByShowdownSlot(
        gameStore.state.team as Parameters<typeof ShowdownTeamResolver.getPokemonByShowdownSlot>[0],
        playerRequest,
        switchSlot,
      );
      const requestSlots = playerRequest.side?.pokemon?.map((pokemon: PlayerRequestPokemonSlot) => ({ uid: pokemon.uid ?? '', active: pokemon.active === true })) ?? [];
      return {
        choice: step.p1Choice,
        historyIndex,
        terminal: false,
        targetUid: target?.uid ?? '',
        activePlayerUid: battleStore.state.player?.uid ?? '',
        requestSlots,
      };
    });

    if (action.terminal) {
      break;
    }

    await dispatchReplayChoice(page, action);

    await page.waitForFunction(({ previousHistoryIndex }) => {
      const debug = window.__VITE_DEBUG__;
      const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
      const store = window.__VITE_DEBUG_STORE_RESOLVER__?.();
      const active = (store?.activeBattle || store?.state) as { over?: boolean } | undefined;
      return (typeof historyIndex === 'number' && historyIndex > previousHistoryIndex)
        || !active
        || active.over === true;
    }, { previousHistoryIndex: action.historyIndex }, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const isEndingOrOver = await checkIfReplayEndingOrOver(page);
    if (isEndingOrOver) {
      break;
    }
  }

  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    const store = resolver();
    const active = (store?.activeBattle || store?.state) as { over?: boolean } | undefined;
    const debug = (window as WindowWithResolver).__VITE_DEBUG__;
    const history = Reflect.get(debug ?? {}, 'history');
    const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
    const isReplayComplete = Array.isArray(history) && typeof historyIndex === 'number' && historyIndex >= history.length;
    return !active || active.over || store.currentFsmState !== 'ACTIVE_BATTLE' || isReplayComplete;
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

  if (finalState) {
    const isBattleOver = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return true;
      const store = resolver();
      const active = (store?.activeBattle || store?.state) as { over?: boolean } | undefined;
      if (!active || active.over || store.currentFsmState !== 'ACTIVE_BATTLE') return true;
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const history = Reflect.get(debug ?? {}, 'history');
      const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
      return Array.isArray(history) && typeof historyIndex === 'number' && historyIndex >= history.length;
    });

    expect(isBattleOver).toBe(true);

    const replayTraceMismatch = await page.evaluate(() => {
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const history = Reflect.get(debug ?? {}, 'history');
      const trace = Reflect.get(debug ?? {}, 'certifiedReplaySubmissionTrace');
      if (!Array.isArray(history) || !Array.isArray(trace)) {
        throw new Error(`[E2E-CERTIFICATION] Missing replay history or worker submission trace. context=${JSON.stringify({ hasHistory: Array.isArray(history), hasTrace: Array.isArray(trace) })}`);
      }
      if (trace.length !== history.length) {
        return { traceLength: trace.length, historyLength: history.length, mismatch: null };
      }
      interface ReplayStep { p1Choice?: string; p2Choice?: string }
      for (let index = 0; index < history.length; index++) {
        const expected = history[index] as ReplayStep | undefined;
        const actual = trace[index] as ReplayStep | undefined;
        if (!expected || !actual || expected.p1Choice !== actual.p1Choice || expected.p2Choice !== actual.p2Choice) {
          return { traceLength: trace.length, historyLength: history.length, mismatch: { index, expected, actual } };
        }
      }
      return null;
    });
    if (replayTraceMismatch) {
      throw new Error(`[E2E-CERTIFICATION] Worker submissions diverged from the certified JSON. context=${JSON.stringify(replayTraceMismatch)}`);
    }

    const clientState = await page.evaluate(() => {
      interface LocalDebugObject {
        [key: string]: unknown;
        isScriptedReplayMode?: boolean;
        lastFinalState?: {
          p1: Array<{ uid: string; name: string; hp: number; maxHp: number; fainted: boolean }>;
          p2: Array<{ uid: string; name: string; hp: number; maxHp: number; fainted: boolean }>;
        };
      }

      interface WindowWithDebug extends Window {
        __VITE_DEBUG__?: LocalDebugObject;
      }

      const win = window as WindowWithDebug;
      const workerFinalState = Reflect.get(win.__VITE_DEBUG__ ?? {}, 'certifiedReplayWorkerFinalState');
      if (workerFinalState) {
        return workerFinalState;
      }
      if (win.__VITE_DEBUG__ && win.__VITE_DEBUG__.lastFinalState) {
        return win.__VITE_DEBUG__.lastFinalState;
      }
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver || !debug?.getGameStore) return { p1: [], p2: [] };
      const store = resolver();
      const gameStore = debug.getGameStore();
      const formatTeam = (team: Array<{ uid: string; name: string; hp: number; maxHp: number; status?: string }>) =>
        team.map((p) => ({
          uid: p.uid,
          name: p.name,
          hp: p.hp,
          maxHp: p.maxHp,
          status: p.status || '',
          fainted: p.hp <= 0
        }));

      const p1Team = (gameStore.state?.team ?? []) as Array<{ uid: string; name: string; hp: number; maxHp: number; status?: string }>;
      const p2Team = (store.state?.enemyTeam ?? []) as Array<{ uid: string; name: string; hp: number; maxHp: number; status?: string }>;
      return { p1: formatTeam(p1Team), p2: formatTeam(p2Team) };
    }) as {
      p1: Array<{ uid: string; name: string; hp: number; maxHp: number; status: string; fainted: boolean }>;
      p2: Array<{ uid: string; name: string; hp: number; maxHp: number; status: string; fainted: boolean }>;
    };

    (['p1', 'p2'] as const).forEach((seat) => {
      const expectedTeam = finalState[seat];
      if (expectedTeam) {
        verifyFinalStateTeam(seat, expectedTeam as Parameters<typeof verifyFinalStateTeam>[1], clientState);
      }
    });
  }
}
