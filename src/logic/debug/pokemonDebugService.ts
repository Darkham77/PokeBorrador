

import { makePokemon, recalcPokemonStats, getExpNeeded } from '@/logic/pokemon/pokemonFactory';
import { useGameStore } from '@/stores/game';
import { useBattleStore } from '@/stores/battle/battle';
import { useUIStore } from '@/stores/ui';
import { useModalStore } from '@/stores/modals';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { Pokemon, PokemonEgg, PokemonGender, PokemonGenderName } from '@/types/pokemon/pokemon';
import { logger } from '../utils/logger.ts';
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets';
import { requirePokemonMoveId, type MoveCategory, type PokemonMoveId } from '@/data/battle/moves';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { requireAbilityId, type AbilityId } from '@/data/battle/abilities';
import { toNatureId, type NatureId } from '@/data/battle/natures';
import type { ItemId } from '@/data/inventory/items';
import type { MinigameDifficultySelection } from '@/types/battle/battle';

const DEFAULT_DEBUG_MOVE_PP = 35;
const DEFAULT_DEBUG_MOVE_ACC = 100;
const DEFAULT_DEBUG_FRIENDSHIP = 70;
const FISHING_DEBUG_DIFFICULTY = 50;
const ARCHAEOLOGY_DEBUG_DIFFICULTY = 50;
const EGG_TICKET_BONUS_HOURS = 24;
const SECS_PER_HOUR = 3600;

interface DebugPokemon extends Pokemon {
  mapId?: MapRouteId | null
  minigameDifficulty?: MinigameDifficultySelection | null
}

interface GenerateParams {
  id?: PokemonSpeciesId
  level?: number
  ivs?: Partial<Pokemon['ivs']> | null
  evs?: Partial<Pokemon['evs']> | null
  isShiny?: boolean
  isGuardian?: boolean
  nature?: NatureId | null
  ability?: AbilityId | null
  gender?: PokemonGenderName | null
  moves?: PokemonMoveId[] | null
  nickname?: string | null
  friendship?: number
  heldItem?: ItemId | null
  mapId?: MapRouteId | null
  protocol?: string | null
  name?: string | null
  uid?: string
  minigameDifficulty?: MinigameDifficultySelection | null
}

function requireMoveIdsForDebugEgg(pokemon: Pokemon) {
  return pokemon.moves.map((move) => {
    if (!move?.id) {
      throw new Error(`[debug] Cannot create egg for ${pokemon.id}: move slot is missing a canonical Showdown move id.`);
    }
    return requirePokemonMoveId(move.id);
  });
}

const GENDER_MAP: Record<string, PokemonGender> = {
  male: 'm',
  female: 'f',
  genderless: null,
  m: 'm',
  f: 'f',
  M: 'm',
  F: 'f',
  N: null
} as const;

function buildDebugMoves(moves: PokemonMoveId[]): Pokemon['moves'] {
  return moves
    .filter((m): m is PokemonMoveId => typeof m === 'string' && !!m)
    .map((mName: PokemonMoveId) => {
      const mData = pokemonDataProvider.getMoveData(mName);
      const basePp = mData?.pp || DEFAULT_DEBUG_MOVE_PP;
      const maxPp = Math.floor(basePp * 1.6);
      return { 
        id: mData?.id || mName,
        name: mData?.name || mName, 
        pp: maxPp, 
        maxPP: maxPp,
        type: mData?.type || 'normal',
        power: mData?.power || 0,
        acc: mData?.acc || DEFAULT_DEBUG_MOVE_ACC,
        cat: (mData?.cat || 'physical') as MoveCategory
      };
    }).slice(0, 4);
}

function applyDebugOverrides(p: Pokemon, params: GenerateParams, mappedGender?: PokemonGender): void {
  if (params.ability) {
    p.ability = requireAbilityId(params.ability);
  }
  if (params.nature) {
    p.nature = toNatureId(params.nature);
  }
  if (mappedGender !== undefined) {
    p.gender = mappedGender;
  }
  if (params.uid) {
    p.uid = params.uid;
  }
  if (params.mapId) {
    (p as DebugPokemon).mapId = requireMapRouteId(params.mapId);
  }
  if (params.minigameDifficulty) {
    (p as DebugPokemon).minigameDifficulty = params.minigameDifficulty;
  }
  if (params.ivs) {
    p.ivs = { ...p.ivs, ...params.ivs };
  }
  if (params.evs) {
    p.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...p.evs, ...params.evs };
  }
  if (params.isGuardian) p.isGuardian = true;
  if (params.name) p.name = params.name;
  if (params.nickname) p.nickname = params.nickname;
  p.friendship = params.friendship !== undefined ? params.friendship : DEFAULT_DEBUG_FRIENDSHIP;
  if (params.moves && Array.isArray(params.moves)) {
    p.moves = buildDebugMoves(params.moves);
  }
}

function executeCatchProtocol(
  p: Pokemon,
  game: ReturnType<typeof useGameStore>,
  ui: ReturnType<typeof useUIStore>,
  animationsEnabled: boolean
): void {
  p.obtainedMethod = 'wild';
  game.addPokemon(p, { notify: !animationsEnabled });
  if (animationsEnabled) {
    ui.notify(`[DEBUG] Pokémon atrapado: ${p.name}`, '✨');
  }
}

async function executeHatchSilentProtocol(
  p: Pokemon,
  game: ReturnType<typeof useGameStore>,
  ui: ReturnType<typeof useUIStore>
): Promise<void> {
  const { getEggSpecies } = await import('@/logic/breeding/breedingEngine');
  const eggSpecies = getEggSpecies(p.id);
  const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider');
  const babyName = pokemonDataProvider.resolveSpeciesName(eggSpecies);

  const state = game.state as Record<string, unknown>; // open-record: Generic key-value data dictionary container
  const key = `${eggSpecies}TicketSecs`;
  if (state[key] !== undefined) {
    state[key] = (Number(state[key]) || 0) + EGG_TICKET_BONUS_HOURS * SECS_PER_HOUR;
  }

  if (!game.state.eggs) game.state.eggs = [];
  const eggToPush: PokemonEgg = {
    uid: `${eggSpecies}-${Temporal.Now.instant().epochMilliseconds}`,
    id: eggSpecies,
    steps: 1,
    ivs: p.ivs,
    nature: p.nature,
    movesAtBirth: requireMoveIdsForDebugEgg(p),
    abilitySlot: (p as Pokemon & { abilityIndex?: number }).abilityIndex || 0,
    isShiny: p.isShiny,
    isGuardian: p.isGuardian,
    ready: false
  };
  game.state.eggs.push(eggToPush);
  ui.notify(`[DEBUG] Huevo de ${babyName} añadido a la mochila`, '🥚');
  await game.save(false);
}

async function executeEggWarehouseProtocol(p: Pokemon, ui: ReturnType<typeof useUIStore>): Promise<void> {
  const { useBreedingStore } = await import('@/stores/breeding');
  const breedingStore = useBreedingStore();
  const { getEggSpecies } = await import('@/logic/breeding/breedingEngine');
  const eggSpecies = getEggSpecies(p.id);
  const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider');
  const babyName = pokemonDataProvider.resolveSpeciesName(eggSpecies);
  
  const { eggFactory } = await import('@/logic/breeding/eggFactory');
  const egg = eggFactory.createDaycareEgg({
    species: eggSpecies,
    motherId: requirePokemonSpeciesId(p.id),
    ivs: p.ivs,
    nature: p.nature,
    movesAtBirth: requireMoveIdsForDebugEgg(p),
    abilityIndex: (p as Pokemon & { abilityIndex?: number }).abilityIndex || 0,
    isShiny: !!p.isShiny,
    cost: 0
  });
  
  breedingStore.warehouseEggs.push(egg);
  if (breedingStore.saveWarehouseEggs) {
    breedingStore.saveWarehouseEggs();
  }
  
  ui.notify(`[DEBUG] Huevo de ${babyName} añadido al almacén de la guardería`, '🥚');
}

async function executeHatchAnimProtocol(
  p: Pokemon,
  game: ReturnType<typeof useGameStore>,
  ui: ReturnType<typeof useUIStore>
): Promise<void> {
  const { getEggSpecies } = await import('@/logic/breeding/breedingEngine');
  const eggSpecies = getEggSpecies(p.id);
  const { makePokemon, recalcPokemonStats } = await import('@/logic/pokemon/pokemonFactory');
  const isDebugMode = typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__ || window.location?.search?.includes('debug'));
  
  let babyPokemon = p;
  if (p.id !== eggSpecies || p.level !== 1) {
    babyPokemon = makePokemon(eggSpecies, 1, {
      isShiny: p.isShiny,
      isGuardian: p.isGuardian,
      nature: p.nature,
      abilitySlot: (p as Pokemon & { abilityIndex?: number }).abilityIndex || 0,
      gender: p.gender,
      obtainedMethod: 'egg',
      bypassWhitelist: isDebugMode
    }) || p;
    if (p.ivs) {
      babyPokemon.ivs = { ...babyPokemon.ivs, ...p.ivs };
    }
    recalcPokemonStats(babyPokemon, isDebugMode);
    babyPokemon.hp = babyPokemon.maxHp;
  }
  babyPokemon.obtainedMethod = 'egg';
  
  // Add to game state silently first
  game.addPokemon(babyPokemon, { notify: false });
  
  // Trigger Vue Modal Sequence
  ui.open('HatchAnimation', { pokemon: babyPokemon });
}

async function executeFishingProtocol(p: Pokemon, ui: ReturnType<typeof useUIStore>): Promise<void> {
  const { showFishingIntro, startFishingMinigame } = await import('@/logic/encounters/encounterUI');
  const battleStore = useBattleStore();
  const diffOverride = (p as DebugPokemon).minigameDifficulty && (p as DebugPokemon).minigameDifficulty !== 'auto'
    ? (p as DebugPokemon).minigameDifficulty!
    : undefined;
  showFishingIntro(p, FISHING_DEBUG_DIFFICULTY, () => {
    startFishingMinigame(
      p,
      FISHING_DEBUG_DIFFICULTY,
      async () => {
        ui.notify(`¡Pesca exitosa! Iniciando combate...`, '🎣');
        await battleStore._startBattle(p, { 
          locationId: (p as DebugPokemon).mapId || requireMapRouteId('route12'),
          isDebug: true,
          minigame: 'fishing'
        });
        const modalStore = useModalStore();
        modalStore.closeAll();
      },
      () => {
        ui.notify('El Pokémon escapó...', '💨');
      },
      diffOverride
    );
  });
}

async function executeArchaeologyProtocol(p: Pokemon, ui: ReturnType<typeof useUIStore>): Promise<void> {
  const { showArchaeologyIntro, startArchaeologyMinigame } = await import('@/logic/encounters/encounterUI');
  const battleStore = useBattleStore();
  const diffOverride = (p as DebugPokemon).minigameDifficulty && (p as DebugPokemon).minigameDifficulty !== 'auto'
    ? (p as DebugPokemon).minigameDifficulty!
    : undefined;
  showArchaeologyIntro(p, ARCHAEOLOGY_DEBUG_DIFFICULTY, () => {
    startArchaeologyMinigame(
      p,
      ARCHAEOLOGY_DEBUG_DIFFICULTY,
      async () => {
        ui.notify(`¡Excavación exitosa! Iniciando combate...`, '⛏️');
        await battleStore._startBattle(p, { 
          locationId: (p as DebugPokemon).mapId || requireMapRouteId('mt_moon'),
          isDebug: true,
          minigame: 'archaeology'
        });
        const modalStore = useModalStore();
        modalStore.closeAll();
      },
      () => {
        ui.notify('El fósil se desmoronó...', '💨');
      },
      diffOverride
    );
  });
}

/**
 * Service for administrative and debug operations related to Pokémon.
 * CLI-First implementation.
 */
export const pokemonDebugService = {
  /**
   * Generates a custom pokemon object with specific overrides.
   */
  generate(params: GenerateParams = {}): Pokemon {
    const {
      id = 'pidgey',
      level = 5,
      isShiny = false,
      nature = null,
      ability = null,
      gender = null,
      heldItem = null,
      protocol = null
    } = params;

    const mappedGender = gender ? GENDER_MAP[gender] : undefined;
    const isEgg = protocol === 'hatch' || protocol === 'hatch_anim' || protocol === 'egg_anim' || protocol === 'egg_silent';
    const p = makePokemon(id, level, { 
      isShiny, 
      nature: nature || undefined, 
      ability: ability || undefined, 
      gender: mappedGender, 
      heldItem: heldItem || undefined,
      obtainedMethod: isEgg ? 'egg' : 'wild',
      bypassWhitelist: true
    });
    if (!p) { throw new Error(`[pokemonDebugService] Failed to generate debug Pokemon '${id}'`); }

    applyDebugOverrides(p, params, mappedGender);

    recalcPokemonStats(p, true);
    p.hp = p.maxHp;
    p.expNeeded = getExpNeeded(p.level);

    return p;
  },

  /**
   * Adds the pokemon to the state using a specific protocol.
   */
  async executeProtocol(p: Pokemon, protocol: string = 'catch'): Promise<void> {
    const game = useGameStore();
    const ui = useUIStore();
    const animationsEnabled = ui.debugAnimationsEnabled ?? true;

    logger.debug('DEBUG', `Executing ${protocol.toUpperCase()} protocol for ${p.name}`); // text-ok: UI text display localization string

    switch (protocol) {
      case 'catch':
        executeCatchProtocol(p, game, ui, animationsEnabled);
        break;
      case 'hatch':
      case 'egg_silent':
        await executeHatchSilentProtocol(p, game, ui);
        break;
      case 'egg_warehouse':
        await executeEggWarehouseProtocol(p, ui);
        break;
      case 'hatch_anim':
      case 'egg_anim':
        await executeHatchAnimProtocol(p, game, ui);
        break;
      case 'fishing_minigame':
        await executeFishingProtocol(p, ui);
        break;
      case 'archaeology_minigame':
        await executeArchaeologyProtocol(p, ui);
        break;
      default:
        logger.error('DEBUG', `Unknown protocol: ${protocol}`);
    }
  },

  /**
   * Starts a custom encounter.
   */
  async triggerEncounter(p: Pokemon, mapId: MapRouteId): Promise<void> {
    const routeId = requireMapRouteId(mapId);
    const battleStore = useBattleStore();
    // const _ui = useUIStore();

    // 1. Force flee if there's an active battle
    if (battleStore.isBattleActive) {
      logger.warn('DEBUG', 'Combate activo detectado. Forzando huida del anterior para iniciar el nuevo...');
      await battleStore.endBattle(false, true);
    }

    logger.debug('DEBUG', `Triggering encounter with ${p.name} at ${routeId}`);
    
    // Register as seen
    const game = useGameStore();
    game.registerPokedex(p.id, false);

    // Start battle
    await battleStore._startBattle(p, { 
      locationId: routeId,
      isDebug: true
    });

    const modalStore = useModalStore();
    modalStore.closeAll();
  }
};
