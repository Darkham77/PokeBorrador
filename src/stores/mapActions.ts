import { useGameStore } from '@/stores/game.ts';
import { useBattleStore } from '@/stores/battle/battle.ts';
import { useUIStore } from '@/stores/ui.ts';
import { useEventStore } from '@/stores/events.ts';
import { useInventoryStore } from '@/stores/inventory/inventory.ts';

import { generateEncounter } from '@/logic/encounters/encounters';
import { syncServerTime, getServerTime } from '@/logic/utils/timeUtils';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getItemById } from '@/data/inventory/items.ts';
import type { ItemId } from '@/data/inventory/items.ts';
import { requireNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { logger } from '@/logic/utils/logger';
import { buildRivalEncounter, buildTrainerEncounter } from '@/logic/battle/trainerSpawner';
import { calculateArchaeologyWeights } from '@/logic/utils/archaeologyHelpers';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation } from '@/types/pokemon/encounters';

import type { DominanceInfo } from '@/types/system/stores';
import type { Event } from '@/logic/events/eventEngine';
import { NAVIGATE_THROTTLE_MS, PITY_TIMER_INCREMENT_THRESHOLD_MS, TRAINER_CHANCE_MAX_PERCENT, TRAINER_CHANCE_INCREMENT_STEP, TRAINER_CHANCE_DEFAULT_PERCENT } from '@/logic/constants/gameplay.ts';
import type { MapRouteId } from '@/data/world/map-assets';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { DayPhase } from '@/logic/utils/timeUtils';
import { requireMapRouteId } from '@/data/world/map-assets';

export async function executeNavigation(
  rawLocId: string,
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
  const locId = requireMapRouteId(rawLocId);
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

  // Pity timer logic
  const elapsedPity = now - state.lastTrainerChanceIncrementAt;
  if (elapsedPity >= PITY_TIMER_INCREMENT_THRESHOLD_MS) {
    const increments = Math.floor(elapsedPity / PITY_TIMER_INCREMENT_THRESHOLD_MS);
    gs.state.trainerChance = Math.min(TRAINER_CHANCE_MAX_PERCENT, (gs.state.trainerChance || TRAINER_CHANCE_DEFAULT_PERCENT) + increments * TRAINER_CHANCE_INCREMENT_STEP);
    callbacks.setLastTrainerChanceIncrementAt(now);
    logger.info('MapStore', `PITY: Trainer chance increased to ${gs.state.trainerChance}%`);
  }

  // 1. Verify health
  const healthy = (gs.state.team as Pokemon[]).find(p => p.hp > 0 && !p.onMission && !p.onDefense);
  if (!healthy) {
    uiStore.notify('Todos tus Pokémon están debilitados. ¡Ve al Centro Pokémon!', '🏥');
    return;
  }

  // Update loc and sync time
  await syncServerTime();
  const nextHour = Math.floor(getServerTime() / 3600000);
  callbacks.setCurrentEpochHour(nextHour);
  callbacks.setCurrentMap(locId);

  // 2. Hatch progress — steps only reduce via explicit activities (battle, capture, gym, minigame)

  // 3. Generate Encounter
  const encounter = battleStore.debugLoopPokemon 
    ? (() => {
        const nextPoke = JSON.parse(JSON.stringify(battleStore.debugLoopPokemon)) as Pokemon;
        nextPoke.hp = nextPoke.maxHp;
        nextPoke.status = '';
        nextPoke.confused = 0;
        nextPoke.flinched = false;
        logger.debug('DEBUG', `Navegación: Usando bucle infinito de ${nextPoke.name}`);
        return { type: 'wild', pokemon: nextPoke };
      })()
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

  // 4. Process Encounter
  const wildEnc = encounter as { type: string; pokemon: Pokemon; pts?: number; faction?: string; rarity?: number };
  if (wildEnc.type === 'wild' || wildEnc.type === 'fishing' || wildEnc.type === 'archaeology') {
    battleStore._startBattle(wildEnc.pokemon, { 
      locationId: locId,
      wasSearching: true,
      isFishing: wildEnc.type === 'fishing',
      isArchaeology: wildEnc.type === 'archaeology'
    });
  } else if (wildEnc.type === 'guardian') {
    wildEnc.pokemon.isGuardian = true;
    battleStore._startBattle(wildEnc.pokemon, { 
      locationId: locId,
      wasSearching: true,
      isGuardian: true,
      pts: wildEnc.pts
    });
  } else if (wildEnc.type === 'defender') {
    uiStore.notify(`¡Defensor del Team ${wildEnc.faction?.toUpperCase()} detectado!`, '⚔️');
  } else if (wildEnc.type === 'trainer') {
    callbacks.setLastTrainerChanceIncrementAt(now);

    const { name, sprite, quote, archetype, enemyTeam } = await buildTrainerEncounter(gs.state, locId);

    if (enemyTeam.length > 0 && enemyTeam[0]) {
      battleStore._startBattle(enemyTeam[0], {
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
  } else if (wildEnc.type === 'rival') {
    const { name, sprite, enemyTeam } = await buildRivalEncounter(gs.state.team);

    if (enemyTeam.length > 0 && enemyTeam[0]) {
      battleStore._startBattle(enemyTeam[0], {
        locationId: locId,
        wasSearching: true,
        isTrainer: true,
        enemyTeam,
        trainerName: name,
        trainerSprite: requireNpcSpriteId(sprite),
        trainerArchetype: 'rival',
        isRival: true,
        cannotEscape: true
      });
    }
  }
}

export async function executeArchaeologyRewards(locId: string, gs: ReturnType<typeof useGameStore>, difficulty?: string) {
  const mapsList = pokemonDataProvider.getMaps() as MapLocation[]; // domain-ok
  const loc = mapsList.find(m => m.id === locId);
  const inventoryStore = useInventoryStore();
  const uiStore = useUIStore();
  const battleStore = useBattleStore();
  const { getAssetUrl, ASSET_TYPES } = await import('@/logic/services/assetService.ts');

  let maxRolls = 1;
  if (difficulty === 'medium') maxRolls = 2;
  else if (difficulty === 'hard') maxRolls = 3;
  else if (difficulty === 'expert') maxRolls = 4;

  const pickaxeType = gs.state.pickaxeSecs > 0 ? (gs.state.pickaxeType || 'standard') : null;
  const brushType = gs.state.brushSecs > 0 ? (gs.state.brushType || 'standard') : null;

  const categoryWeights = calculateArchaeologyWeights(pickaxeType, brushType);


  const totalWeight = categoryWeights.fossil + categoryWeights.stone + categoryWeights.common + categoryWeights.rare;

  for (let r = 0; r < maxRolls; r++) {
    if (r > 0 && Math.random() >= 0.5) {
      continue;
    }

    const rand = Math.random() * totalWeight;
    let selectedCategory: 'fossil' | 'stone' | 'common' | 'rare' = 'common';
    
    if (rand < categoryWeights.fossil) {
      selectedCategory = 'fossil';
    } else if (rand < categoryWeights.fossil + categoryWeights.stone) {
      selectedCategory = 'stone';
    } else if (rand < categoryWeights.fossil + categoryWeights.stone + categoryWeights.common) {
      selectedCategory = 'common';
    } else {
      selectedCategory = 'rare';
    }

    let rewardId: ItemId | null = null;
    let rewardIcon = '';

    if (selectedCategory === 'fossil') {
      const pool = loc?.archaeology?.pool || ['kabuto', 'omanyte'];
      const selectedPoke = pool[Math.floor(Math.random() * pool.length)];
      if (selectedPoke === 'kabuto') {
        rewardId = 'domefossil';
        rewardIcon = '🛡';
      } else if (selectedPoke === 'omanyte') {
        rewardId = 'helixfossil';
        rewardIcon = '🐚';
      } else {
        rewardId = 'oldamber';
        rewardIcon = '💎';
      }
    } else if (selectedCategory === 'stone') {
      const stones = ['firestone', 'waterstone', 'thunderstone', 'leafstone', 'moonstone', 'sunstone'] as const satisfies readonly ItemId[];
      rewardId = stones[Math.floor(Math.random() * stones.length)]!;
      rewardIcon = '💎';
    } else if (selectedCategory === 'common') {
      const commons = [
        { id: 'pearl', icon: '⚪' },
        { id: 'stardust', icon: '✨' },
        { id: 'coalore', icon: '🪨' },
        { id: 'copperore', icon: '🟫' },
        { id: 'ironore', icon: '🧱' }
      ] as const satisfies readonly { id: ItemId; icon: string }[];
      const item = commons[Math.floor(Math.random() * commons.length)]!;
      rewardId = item.id;
      rewardIcon = item.icon;
    } else {
      const rares = [
        { id: 'nugget', icon: '🟡' },
        { id: 'bigpearl', icon: '🔘' },
        { id: 'starpiece', icon: '⭐' },
        { id: 'silverore', icon: '⬜' },
        { id: 'goldore', icon: '🟨' },
        { id: 'tungstenore', icon: '🌑' },
        { id: 'uraniumore', icon: '🟢' },
        { id: 'rubiore', icon: '🔺' },
        { id: 'zaphireore', icon: '🔹' },
        { id: 'emmeraldore', icon: '💚' },
        { id: 'topazore', icon: '🟡' },
        { id: 'diamondore', icon: '💎' }
      ] as const satisfies readonly { id: ItemId; icon: string }[];
      const item = rares[Math.floor(Math.random() * rares.length)]!;
      rewardId = item.id;
      rewardIcon = item.icon;
    }

    if (!rewardId) throw new Error(`[mapActions] Archaeology category ${selectedCategory} did not resolve an item id.`);
    const itemData = getItemById(rewardId);
    const itemSprite = (itemData && itemData.sprite) ? getAssetUrl(ASSET_TYPES.ITEM, itemData.sprite) : rewardIcon;

    inventoryStore.addItem(rewardId, 1);
    const displayName = itemData ? itemData.name : rewardId;
    uiStore.notify(`¡Desenterraste un ${displayName}!`, itemSprite);
    battleStore.addLog(`¡Desenterraste un <strong style="color:var(--yellow);">${displayName}</strong>!`, 'log-info', rewardId);
  }
}
