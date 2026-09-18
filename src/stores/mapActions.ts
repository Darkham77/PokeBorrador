import { cloneReactive } from '@/logic/utils/cloneUtils.ts';
import { useGameStore } from '@/stores/game.ts';
import { useBattleStore } from '@/stores/battle/battle.ts';
import { useUIStore } from '@/stores/ui.ts';
import { useEventStore } from '@/stores/events.ts';
import { useInventoryStore } from '@/stores/inventory/inventory.ts';

import { generateEncounter } from '@/logic/encounters/encounters';
import { syncServerTime } from '@/logic/auth/timeSync';
import { getServerTime } from '@/logic/utils/timeUtils';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getItemById } from '@/data/inventory/items.ts';
import { requireNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { logger } from '@/logic/utils/logger';
import { buildRivalEncounter, buildTrainerEncounter } from '@/logic/battle/trainerSpawner';
import { calculateArchaeologyWeights, rollArchaeologyCategory, rollArchaeologyReward, getArchaeologyMaxRolls, ARCHAEOLOGY_MULTI_ROLL_CONTINUE_CHANCE } from '@/logic/utils/archaeologyHelpers.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation } from '@/types/pokemon/encounters';

import type { DominanceInfo } from '@/types/system/stores';
import type { Event } from '@/logic/events/eventEngine';
import { NAVIGATE_THROTTLE_MS, PITY_TIMER_INCREMENT_THRESHOLD_MS, TRAINER_CHANCE_MAX_PERCENT, TRAINER_CHANCE_INCREMENT_STEP, TRAINER_CHANCE_DEFAULT_PERCENT } from '@/logic/constants/gameplay.ts';
import type { MapRouteId } from '@/data/world/map-assets';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { DayPhase } from '@/logic/utils/timeUtils';

const MS_PER_HOUR = 3_600_000;
const DEFAULT_REWARD_QUANTITY = 1;

function updateTrainerPityTimer(
  now: number,
  lastIncrementAt: number,
  gs: ReturnType<typeof useGameStore>,
  setLastTrainerChanceIncrementAt: (val: number) => void
) {
  const elapsedPity = now - lastIncrementAt;
  if (elapsedPity < PITY_TIMER_INCREMENT_THRESHOLD_MS) return;

  const increments = Math.floor(elapsedPity / PITY_TIMER_INCREMENT_THRESHOLD_MS);
  gs.state.trainerChance = Math.min(
    TRAINER_CHANCE_MAX_PERCENT,
    (gs.state.trainerChance || TRAINER_CHANCE_DEFAULT_PERCENT) + increments * TRAINER_CHANCE_INCREMENT_STEP
  );
  setLastTrainerChanceIncrementAt(now);
  logger.info('MapStore', `PITY: Trainer chance increased to ${gs.state.trainerChance}%`);
}

function getDebugLoopEncounter(debugLoopPokemon: Pokemon) {
  const nextPoke = cloneReactive(debugLoopPokemon) as Pokemon;
  nextPoke.hp = nextPoke.maxHp;
  nextPoke.status = '';
  nextPoke.confused = 0;
  nextPoke.flinched = false;
  logger.debug('DEBUG', `Navegación: Usando bucle infinito de ${nextPoke.name}`);
  return { type: 'wild' as const, pokemon: nextPoke };
}

async function handleNavigationTrainerEncounter(
  locId: MapRouteId,
  gsState: ReturnType<typeof useGameStore>['state'],
  battleStore: ReturnType<typeof useBattleStore>,
  now: number,
  setLastTrainerChanceIncrementAt: (val: number) => void
) {
  setLastTrainerChanceIncrementAt(now);
  const { name, sprite, quote, archetype, enemyTeam } = await buildTrainerEncounter(gsState, locId);
  const lead = enemyTeam[0];
  if (!lead) return;

  battleStore._startBattle(lead, {
    locationId: locId,
    wasSearching: true,
    isTrainer: true,
    enemyTeam,
    trainerName: name,
    trainerSprite: requireNpcSpriteId(sprite),
    trainerArchetype: archetype,
    trainerQuote: quote,
    cannotEscape: true
  });
}

async function handleNavigationRivalEncounter(
  locId: MapRouteId,
  team: Pokemon[],
  battleStore: ReturnType<typeof useBattleStore>
) {
  const { name, sprite, enemyTeam, quote } = await buildRivalEncounter(team);
  const lead = enemyTeam[0];
  if (!lead) return;

  battleStore._startBattle(lead, {
    locationId: locId,
    wasSearching: true,
    isTrainer: true,
    enemyTeam,
    trainerName: name,
    trainerSprite: requireNpcSpriteId(sprite),
    trainerArchetype: 'rival',
    trainerQuote: quote,
    isRival: true,
    cannotEscape: true
  });
}

interface EncounterDispatchContext {
  gs: ReturnType<typeof useGameStore>;
  battleStore: ReturnType<typeof useBattleStore>;
  uiStore: ReturnType<typeof useUIStore>;
  now: number;
  setLastTrainerChanceIncrementAt: (val: number) => void;
}

async function dispatchNavigationEncounter(
  encounter: NonNullable<Awaited<ReturnType<typeof generateEncounter>>>,
  locId: MapRouteId,
  context: EncounterDispatchContext
) {
  const enc = encounter as { type: string; pokemon: Pokemon; pts?: number; faction?: string; rarity?: number };
  if (enc.type === 'wild' || enc.type === 'fishing' || enc.type === 'archaeology') {
    context.battleStore._startBattle(enc.pokemon, {
      locationId: locId,
      wasSearching: true,
      minigame: (enc.type === 'fishing' || enc.type === 'archaeology') ? enc.type : null
    });
    return;
  }
  if (enc.type === 'guardian') {
    enc.pokemon.isGuardian = true;
    context.battleStore._startBattle(enc.pokemon, {
      locationId: locId,
      wasSearching: true,
      isGuardian: true,
      pts: enc.pts
    });
    return;
  }
  if (enc.type === 'defender') {
    context.uiStore.notify(`¡Defensor del Team ${enc.faction?.toUpperCase()} detectado!`, '⚔️');
    return;
  }
  if (enc.type === 'trainer') {
    await handleNavigationTrainerEncounter(
      locId,
      context.gs.state,
      context.battleStore,
      context.now,
      context.setLastTrainerChanceIncrementAt
    );
    return;
  }
  if (enc.type === 'rival') {
    await handleNavigationRivalEncounter(
      locId,
      context.gs.state.team as Pokemon[],
      context.battleStore
    );
  }
}

export async function executeNavigation(
  locId: MapRouteId,
  state: {
    currentMap: MapRouteId;
    currentEpochHour: number;
    lastNavigateTime: number;
    lastTrainerChanceIncrementAt: number;
    currentWeather: WeatherId;
    currentCycle: DayPhase;
    activeEvents: Event[];
    mapWinners: Partial<Record<MapRouteId, DominanceInfo>>;
  },
  callbacks: {
    setCurrentMap: (val: MapRouteId) => void;
    setCurrentEpochHour: (val: number) => void;
    setLastNavigateTime: (val: number) => void;
    setLastTrainerChanceIncrementAt: (val: number) => void;
  }
) {
  const gs = useGameStore();
  const battleStore = useBattleStore();
  const uiStore = useUIStore();
  const eventStore = useEventStore();

  const now = Temporal.Now.instant().epochMilliseconds;
  if (now - state.lastNavigateTime < NAVIGATE_THROTTLE_MS) {
    logger.warn('MapStore', 'Navigate throttled');
    return;
  }
  callbacks.setLastNavigateTime(now);
  logger.info('MapStore', `Navigating to ${locId}...`);

  updateTrainerPityTimer(now, state.lastTrainerChanceIncrementAt, gs, callbacks.setLastTrainerChanceIncrementAt);

  const healthy = (gs.state.team as Pokemon[]).find(p => p.hp > 0 && !p.onMission && !p.onDefense);
  if (!healthy) {
    uiStore.notify('Todos tus Pokémon están debilitados. ¡Ve al Centro Pokémon!', '🏥');
    return;
  }

  await syncServerTime();
  const nextHour = Math.floor(getServerTime() / MS_PER_HOUR);
  callbacks.setCurrentEpochHour(nextHour);
  callbacks.setCurrentMap(locId);

  const encounter = battleStore.debugLoopPokemon
    ? getDebugLoopEncounter(battleStore.debugLoopPokemon)
    : await generateEncounter(locId, gs.state, {
        activeEvents: state.activeEvents,
        dominanceData: state.mapWinners,
        shinyMultiplier: eventStore.globalMultipliers?.shiny || 1,
        weather: state.currentWeather,
        cycle: state.currentCycle,
        eventFishingBonus: eventStore.globalMultipliers?.fishing || 1
      });

  if (!encounter) {
    logger.info('MapStore', `No encounter generated for ${locId}`);
    return;
  }
  logger.success('MapStore', `Encounter generated: ${encounter.type}`);

  await dispatchNavigationEncounter(encounter, locId, {
    gs,
    battleStore,
    uiStore,
    now,
    setLastTrainerChanceIncrementAt: callbacks.setLastTrainerChanceIncrementAt
  });
}

export async function executeArchaeologyRewards(locId: MapRouteId, gs: ReturnType<typeof useGameStore>, difficulty?: string) {
  const mapsList = pokemonDataProvider.getMaps() as MapLocation[]; // domain-ok: Open dynamic text or non-domain string payload
  const loc = mapsList.find(m => m.id === locId);
  const inventoryStore = useInventoryStore();
  const uiStore = useUIStore();
  const battleStore = useBattleStore();
  const { getAssetUrl, ASSET_TYPES } = await import('@/logic/services/assetService.ts');

  const maxRolls = getArchaeologyMaxRolls(difficulty);
  const pickaxeType = gs.state.pickaxeSecs > 0 ? (gs.state.pickaxeType || 'standard') : null;
  const brushType = gs.state.brushSecs > 0 ? (gs.state.brushType || 'standard') : null;
  const categoryWeights = calculateArchaeologyWeights(pickaxeType, brushType);

  for (let r = 0; r < maxRolls; r++) {
    if (r > 0 && Math.random() >= ARCHAEOLOGY_MULTI_ROLL_CONTINUE_CHANCE) {
      continue;
    }

    const selectedCategory = rollArchaeologyCategory(categoryWeights);
    const { rewardId, rewardIcon } = rollArchaeologyReward(selectedCategory, loc?.archaeology?.pool);

    const itemData = getItemById(rewardId);
    const itemSprite = (itemData && itemData.sprite) ? getAssetUrl(ASSET_TYPES.ITEM, itemData.sprite) : rewardIcon;

    inventoryStore.addItem(rewardId, DEFAULT_REWARD_QUANTITY);
    const displayName = itemData ? itemData.name : rewardId;
    uiStore.notify(`¡Desenterraste un ${displayName}!`, itemSprite);
    battleStore.addLog(`¡Desenterraste un <strong style="color:var(--yellow);">${displayName}</strong>!`, 'log-info', rewardId);
  }
}
