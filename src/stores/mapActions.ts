import { useGameStore } from '@/stores/game.ts';
import { useBattleStore } from '@/stores/battle/battle.ts';
import { useUIStore } from '@/stores/ui.ts';
import { useEventStore } from '@/stores/events.ts';
import { useInventoryStore } from '@/stores/inventory/inventory.ts';

import { generateEncounter } from '@/logic/encounters/encounters';
import { syncServerTime, getServerTime } from '@/logic/utils/timeUtils';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getItemById } from '@/data/inventory/items.ts';
import { logger } from '@/logic/utils/logger';
import { buildRivalEncounter, buildTrainerEncounter } from '@/logic/battle/trainerSpawner';
import { calculateArchaeologyWeights } from '@/logic/utils/archaeologyHelpers';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation } from '@/types/pokemon/encounters';

import type { Event } from '@/logic/events/eventEngine';
import type { DominanceInfo } from '@/types/system/stores';

export async function executeNavigation(
  locId: string,
  state: {
    currentMap: string;
    currentEpochHour: number;
    lastNavigateTime: number;
    lastTrainerChanceIncrementAt: number;
    currentWeather: string;
    currentCycle: string;
    activeEvents: Event[];
    mapWinners: Record<string, DominanceInfo>;
  },
  callbacks: {
    setCurrentMap: (val: string) => void;
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
  if (now - state.lastNavigateTime < 400) {
    logger.warn('MapStore', 'Navigate throttled');
    return;
  }
  callbacks.setLastNavigateTime(now);
  logger.info('MapStore', `Navigating to ${locId}...`);

  // Pity timer logic
  const elapsedPity = now - state.lastTrainerChanceIncrementAt;
  if (elapsedPity >= 120000) {
    const increments = Math.floor(elapsedPity / 120000);
    gs.state.trainerChance = Math.min(20, (gs.state.trainerChance || 5) + increments * 5);
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
        nextPoke.status = null;
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
        trainerSprite: sprite,
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
        trainerSprite: sprite,
        trainerArchetype: 'rival',
        isRival: true,
        cannotEscape: true
      });
    }
  }
}

export async function executeArchaeologyRewards(locId: string, gs: ReturnType<typeof useGameStore>, difficulty?: string) {
  const mapsList = pokemonDataProvider.getMaps() as unknown as MapLocation[];
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

    let rewardId = '';
    let rewardIcon = '';

    if (selectedCategory === 'fossil') {
      const pool = loc?.archaeology?.pool || ['kabuto', 'omanyte'];
      const selectedPoke = pool[Math.floor(Math.random() * pool.length)];
      if (selectedPoke === 'kabuto') {
        rewardId = 'dome_fossil';
        rewardIcon = '🛡';
      } else if (selectedPoke === 'omanyte') {
        rewardId = 'helix_fossil';
        rewardIcon = '🐚';
      } else {
        rewardId = 'old_amber';
        rewardIcon = '💎';
      }
    } else if (selectedCategory === 'stone') {
      const stones = ['fire_stone', 'water_stone', 'thunder_stone', 'leaf_stone', 'moon_stone', 'sun_stone'];
      rewardId = stones[Math.floor(Math.random() * stones.length)]!;
      rewardIcon = '💎';
    } else if (selectedCategory === 'common') {
      const commons = [
        { id: 'pearl', icon: '⚪' },
        { id: 'stardust', icon: '✨' },
        { id: 'coal_ore', icon: '🪨' },
        { id: 'copper_ore', icon: '🟫' },
        { id: 'iron_ore', icon: '🧱' }
      ];
      const item = commons[Math.floor(Math.random() * commons.length)]!;
      rewardId = item.id;
      rewardIcon = item.icon;
    } else {
      const rares = [
        { id: 'nugget', icon: '🟡' },
        { id: 'big_pearl', icon: '🔘' },
        { id: 'star_piece', icon: '⭐' },
        { id: 'silver_ore', icon: '⬜' },
        { id: 'gold_ore', icon: '🟨' },
        { id: 'tungsten_ore', icon: '🌑' },
        { id: 'uranium_ore', icon: '🟢' },
        { id: 'rubi_ore', icon: '🔺' },
        { id: 'zaphire_ore', icon: '🔹' },
        { id: 'emmerald_ore', icon: '💚' },
        { id: 'topaz_ore', icon: '🟡' },
        { id: 'diamond_ore', icon: '💎' }
      ];
      const item = rares[Math.floor(Math.random() * rares.length)]!;
      rewardId = item.id;
      rewardIcon = item.icon;
    }

    const itemData = getItemById(rewardId);
    const itemSprite = (itemData && itemData.sprite) ? getAssetUrl(ASSET_TYPES.ITEM, itemData.sprite) : rewardIcon;

    inventoryStore.addItem(rewardId, 1);
    const displayName = itemData ? itemData.name : rewardId;
    uiStore.notify(`¡Desenterraste un ${displayName}!`, itemSprite);
    battleStore.addLog(`¡Desenterraste un <strong style="color:var(--yellow);">${displayName}</strong>!`, 'log-info', displayName);
  }
}
