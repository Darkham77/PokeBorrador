import { useGameStore } from './game.ts';
import { useBattleStore } from './battle.ts';
import { useUIStore } from './ui.ts';
import { useEventStore } from './events.ts';
import { useInventoryStore } from './inventory.ts';
import { FIRE_RED_MAPS } from '@/data/maps';
import { generateEncounter } from '@/logic/encounters/encounters';
import { syncServerTime, getServerTime } from '@/logic/utils/timeUtils';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getItemByName } from '@/data/items.ts';
import { logger } from '@/logic/utils/logger';
import { TRAINER_TYPES } from '@/data/trainerTypes';
import { getRandomQuoteForTrainer } from '@/data/trainerPhrases';
import { getSpritesForArchetype } from '@/logic/utils/npcSpriteRouter';
import type { Pokemon } from '@/types/pokemon';
import type { MapLocation } from '@/types/encounters';

import type { Event } from '@/logic/events/eventEngine';
import type { DominanceInfo } from '@/types/stores';

export async function executeNavigation(
  locId: string,
  state: {
    currentMap: string;
    currentEpochHour: number;
    lastNavigateTime: number;
    lastTrainerChanceIncrementAt: number;
    currentWeather: string;
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
    gs.state.trainerChance = 5;
    callbacks.setLastTrainerChanceIncrementAt(now);

    const { buildTrainerTeam } = await import('@/logic/battle/trainerFactory');

    const isMaxCriminality = (gs.state.playerClass === 'rocket' && (gs.state.classData?.criminality ?? 0) >= 100);
    const targetMap = FIRE_RED_MAPS.find(m => m.id === locId);
    const baseLv = targetMap?.lv?.[0] || 5;

    let tName = 'Entrenador';
    let tSprite = 'youngster';
    let tQuote = '¡Prepárate para combatir! ¡No te lo pondré fácil!';
    const enemyTeam: Pokemon[] = [];

    let typeKey: keyof typeof TRAINER_TYPES = 'default';
    if (isMaxCriminality) {
      const t = TRAINER_TYPES['policeman'];
      tName = t.name;
      const availableSprites = getSpritesForArchetype('policeman');
      const chosenSprite = availableSprites[Math.floor(Math.random() * availableSprites.length)];
      tSprite = chosenSprite || t.sprite;
      tQuote = getRandomQuoteForTrainer('policeman');
      const criminality = gs.state.classData?.criminality || 100;
      const excess = Math.max(0, criminality - 100);
      const bonusLv = Math.floor(excess / 50);
      const trainerLv = baseLv + 5 + bonusLv;
      const teamSize = Math.floor(Math.random() * 2) + 3;

      const team = await buildTrainerTeam(t.pool as unknown as string[], trainerLv, teamSize);
      enemyTeam.push(...team);
    } else {
      const keys = Object.keys(TRAINER_TYPES) as Array<keyof typeof TRAINER_TYPES>;
      typeKey = keys[Math.floor(Math.random() * keys.length)] || 'caza_bichos';
      const t = TRAINER_TYPES[typeKey];
      
      tName = t.name;
      // Pick a random sprite from the full archetype catalog (not just the hardcoded fallback)
      const archetypeSprites = getSpritesForArchetype(t.archetype);
      tSprite = archetypeSprites[Math.floor(Math.random() * archetypeSprites.length)] || t.sprite;
      tQuote = getRandomQuoteForTrainer(typeKey);
      const trainerLv = baseLv + 2;
      const teamSize = Math.floor(Math.random() * 3) + 1;

      const { buildTrainerTeam } = await import('@/logic/battle/trainerFactory');
      const team = await buildTrainerTeam(t.pool as unknown as string[], trainerLv, teamSize);
      enemyTeam.push(...team);
    }

    if (enemyTeam.length > 0 && enemyTeam[0]) {
      battleStore._startBattle(enemyTeam[0], {
        locationId: locId,
        wasSearching: true,
        isTrainer: true,
        enemyTeam,
        trainerName: tName,
        trainerSprite: tSprite,
        trainerArchetype: isMaxCriminality ? 'policeman' : TRAINER_TYPES[typeKey].archetype,
        trainerQuote: tQuote,
        cannotEscape: true
      });
    }
  } else if (wildEnc.type === 'rival') {
    const { getEvolvedForm } = await import('@/logic/evolution/evolutionLogic');
    const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');

    const trainerNameVal = 'Rival Azul';
    const trainerSpriteVal = 'blue';
    
    const teamSize = Math.max(3, gs.state.team.length || 1);
    const avgLevel = gs.state.team.reduce((sum, p) => sum + p.level, 0) / (gs.state.team.length || 1);
    const rivalLevel = Math.floor(avgLevel) + 2;

    const rivalPoolBase = ['pidgeot', 'alakazam', 'gyarados', 'arcanine', 'exeggutor', 'charizard'];
    const shuffledPool = [...rivalPoolBase].sort(() => Math.random() - 0.5).slice(0, teamSize);

    const enemyTeam: Pokemon[] = shuffledPool.map(id => {
      const species = getEvolvedForm(id, rivalLevel);
      const p = makePokemon(species, rivalLevel) as Pokemon;
      if (p) (p as Pokemon & { _revealed?: boolean })._revealed = true;
      return p;
    }).filter((p): p is Pokemon => !!p);

    if (enemyTeam.length > 0 && enemyTeam[0]) {
      battleStore._startBattle(enemyTeam[0], {
        locationId: locId,
        wasSearching: true,
        isTrainer: true,
        enemyTeam,
        trainerName: trainerNameVal,
        trainerSprite: trainerSpriteVal,
        trainerArchetype: 'trainers',
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

  const categoryWeights = {
    fossil: 45,
    stone: 25,
    common: 20,
    rare: 10
  };

  const pickaxeType = gs.state.pickaxeSecs > 0 ? (gs.state.pickaxeType || 'standard') : null;
  const brushType = gs.state.brushSecs > 0 ? (gs.state.brushType || 'standard') : null;

  if (pickaxeType === 'good' || pickaxeType === 'super') {
    const budget = pickaxeType === 'good' ? 500 : 1000;
    const affected = [
      { key: 'rare', base: 10 },
      { key: 'common', base: 20 },
      { key: 'stone', base: 25 }
    ];
    let remaining = budget;
    for (let i = 0; i < affected.length; i++) {
      const item = affected[i]!;
      let added = 0;
      if (i === affected.length - 1) {
        added = remaining;
      } else {
        added = Math.round(remaining * 0.5);
      }
      categoryWeights[item.key as 'rare' | 'common' | 'stone'] += added;
      remaining -= added;
    }
  }

  if (brushType === 'good' || brushType === 'super') {
    const budget = brushType === 'good' ? 500 : 1000;
    categoryWeights.fossil += budget;
  }

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

    let rewardName = '';
    let rewardIcon = '💎';

    if (selectedCategory === 'fossil') {
      const pool = loc?.archaeology?.pool || ['kabuto', 'omanyte'];
      const selectedPoke = pool[Math.floor(Math.random() * pool.length)];
      if (selectedPoke === 'kabuto') {
        rewardName = 'Fósil Domo';
        rewardIcon = '🛡';
      } else if (selectedPoke === 'omanyte') {
        rewardName = 'Fósil Hélix';
        rewardIcon = '🐚';
      } else {
        rewardName = 'Ámbar Viejo';
        rewardIcon = '💎';
      }
    } else if (selectedCategory === 'stone') {
      const stones = [
        { name: 'Piedra Fuego', icon: '🔥' },
        { name: 'Piedra Agua', icon: '💧' },
        { name: 'Piedra Trueno', icon: '⚡' },
        { name: 'Piedra Hoja', icon: '🌿' },
        { name: 'Piedra Lunar', icon: '🌙' },
        { name: 'Piedra Solar', icon: '☀️' }
      ];
      const stone = stones[Math.floor(Math.random() * stones.length)]!;
      rewardName = stone.name;
      rewardIcon = stone.icon;
    } else if (selectedCategory === 'common') {
      const commons = [
        { name: 'Perla', icon: '⚪' },
        { name: 'Polvo Estelar', icon: '✨' },
        { name: 'Mineral de Carbón', icon: '🪨' },
        { name: 'Mineral de Cobre', icon: '🟫' },
        { name: 'Mineral de Hierro', icon: '🧱' }
      ];
      const item = commons[Math.floor(Math.random() * commons.length)]!;
      rewardName = item.name;
      rewardIcon = item.icon;
    } else {
      const rares = [
        { name: 'Pepita', icon: '🟡' },
        { name: 'Perla Grande', icon: '🔘' },
        { name: 'Trozo Estrella', icon: '⭐' },
        { name: 'Mineral de Plata', icon: '⬜' },
        { name: 'Mineral de Oro', icon: '🟨' },
        { name: 'Mineral de Wolframio', icon: '🌑' },
        { name: 'Mineral de Uranio', icon: '🟢' },
        { name: 'Mineral de Rubí', icon: '🔺' },
        { name: 'Mineral de Zafiro', icon: '🔹' },
        { name: 'Mineral de Esmeralda', icon: '💚' },
        { name: 'Mineral de Topacio', icon: '🟡' },
        { name: 'Mineral de Diamante', icon: '💎' }
      ];
      const item = rares[Math.floor(Math.random() * rares.length)]!;
      rewardName = item.name;
      rewardIcon = item.icon;
    }

    const itemData = getItemByName(rewardName);
    const itemSprite = itemData ? getAssetUrl(ASSET_TYPES.ITEM, itemData.sprite) : rewardIcon;

    inventoryStore.addItem(rewardName, 1);
    uiStore.notify(`¡Desenterraste un ${rewardName}!`, itemSprite);
    battleStore.addLog(`¡Desenterraste un <strong style="color:var(--yellow);">${rewardName}</strong>!`, 'log-info', rewardName);
  }
}
