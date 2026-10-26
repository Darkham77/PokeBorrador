import type { DisplayText } from '@francogp/auditor';
import { computed, toValue, type ComputedRef } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

import { isMoveCategory, type MoveCategory, type PokemonMoveId } from '@/data/battle/moves';
import { toPokemonType } from '@/data/battle/types';
import { getItemName } from '@/data/inventory/items';
import {
  EVOLUTION_TABLE,
  STONE_EVOLUTIONS,
  TRADE_EVOLUTIONS,
  type EvolutionTriggerType
} from '@/data/pokemon/evolutionData';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { POKEMON_SPRITE_IDS } from '@/data/pokemon/spriteMapping';
import { DEFAULT_MAX_PP_FALLBACK } from '@/logic/constants/gameplay';
import {
  calculateInstancePhysicalData,
  type InstancePhysicalData
} from '@/logic/pokemon/physicalDimensionsMath';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils';
import { useGameStore } from '@/stores/game';
import { useModalStore } from '@/stores/modals';
import { POKEMON_STAT_KEYS, type Pokemon, type PokemonStatKey } from '@/types/pokemon/pokemon';
import type { MoveBaseData } from '@/types/system/database';

const MAX_BASE_STAT_VALUE = 255;

function requireMoveCategory(value: string | undefined): MoveCategory {
  if (value === undefined) return 'physical';
  if (isMoveCategory(value)) return value;
  throw new Error(`Invalid move category: ${value}`);
}

interface EvolutionEntry {
  type: EvolutionTriggerType;
  requirement: string;
  to: PokemonSpeciesId;
  isSeen: boolean;
  isCaught: boolean;
}

type PokemonDetailGameStore = ReturnType<typeof useGameStore>;

function getStorageList(gameStore: PokemonDetailGameStore, context: string): (Pokemon | null)[] {
  if (context === 'team') return gameStore.state.team || [];
  if (context === 'box') return gameStore.state.box || [];
  return [];
}

function resolveReactivePokemon(
  gameStore: PokemonDetailGameStore,
  context: string,
  index: number,
  directPokemon?: Pokemon | null
): Pokemon | null {
  const list = getStorageList(gameStore, context);

  if (directPokemon) {
    if (index > -1 && list[index]?.uid === directPokemon.uid) {
      return list[index] ?? null;
    }
    const realMon = list.find((p) => p?.uid === directPokemon.uid);
    return realMon ?? directPokemon;
  }

  if (index > -1) {
    return list[index] ?? null;
  }

  return null;
}

export interface StatDisplay {
  id: string;
  label: string;
  value: number;
  baseValue: number;
  max: number;
  color: string;
  iv: number;
  ev: number;
}

export interface MoveDetail {
  id: PokemonMoveId;
  level: number;
  name: string;
  type: ReturnType<typeof toPokemonType>;
  cat: MoveCategory;
  power: number;
  acc: number;
  pp: number;
  maxPP: number;
}

export interface DetailSpeciesData extends Omit<
  NonNullable<ReturnType<typeof pokemonDataProvider.getPokemonData>>,
  'type'
> {
  nationalId: string;
  type: ReturnType<typeof toPokemonType>[];
  stats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
}

export interface UsePokemonDetailReturn {
  targetPokemon: ComputedRef<Pokemon | null>;
  isInstance: ComputedRef<boolean>;
  targetSpeciesId: ComputedRef<PokemonSpeciesId>;
  species: ComputedRef<DetailSpeciesData | null>;
  cleanCategory: ComputedRef<string>;
  evolutions: ComputedRef<EvolutionEntry[]>;
  displayStats: ComputedRef<StatDisplay[]>;
  moveDetails: ComputedRef<MoveDetail[]>;
  currentMoves: ComputedRef<Pokemon['moves']>;
  canStoneEvolve: ComputedRef<boolean>;
  instancePhysicalData: ComputedRef<InstancePhysicalData | null>;
  captureDateFormatted: ComputedRef<string | null>;
  getSprite: (id: string, isShiny?: boolean) => string;
  finalIndex: ComputedRef<number>;
  finalContext: ComputedRef<string>;
}

// open-record: Dynamic Vue props reactive dictionary
export function usePokemonDetail(
  propsRefs: Record<DisplayText, MaybeRefOrGetter<unknown>>
): UsePokemonDetailReturn {
  const gameStore = useGameStore();
  const modalStore = useModalStore();

  // Normalize inputs (props are passed as a reactive object or refs)
  const getProp = <T>(key: string): T | undefined => toValue(propsRefs[key]) as T | undefined;

  const uiData = computed(() => {
    const modal = modalStore.stack.find((m) => m.name === 'PokemonDetail');
    return modal?.props || {};
  });

  const finalIndex = computed<number>(() => {
    const pIdx = getProp<number>('index') ?? -1;
    if (pIdx !== -1) return pIdx;
    const modalProps = uiData.value;
    return typeof modalProps.index === 'number' ? modalProps.index : -1;
  });

  const finalContext = computed<string>(() => {
    const pCtx = getProp<string>('context');
    if (pCtx && pCtx !== 'pokedex') return pCtx;
    const modalProps = uiData.value;
    return typeof modalProps.context === 'string' ? modalProps.context : 'pokedex';
  });

  const targetPokemon = computed(() => {
    const modalProps = uiData.value;
    const directPokemon =
      getProp<Pokemon>('pokemon') || (modalProps.pokemon as Pokemon | null | undefined);
    return resolveReactivePokemon(gameStore, finalContext.value, finalIndex.value, directPokemon);
  });

  const isInstance = computed(() => !!targetPokemon.value);

  const targetSpeciesId = computed(() => {
    const id = isInstance.value ? targetPokemon.value?.id : getProp<string>('speciesId');
    return requirePokemonSpeciesId(String(id || '').toLowerCase());
  });

  const speciesRaw = computed(() => pokemonDataProvider.getPokemonData(targetSpeciesId.value));

  const species = computed(() => {
    if (!speciesRaw.value) return null;
    const s = speciesRaw.value;
    const types = (Array.isArray(s.type) ? s.type : [s.type]).map(toPokemonType);
    const nationalId = String(POKEMON_SPRITE_IDS[targetSpeciesId.value] || 0);

    return {
      ...s,
      nationalId,
      type: types,
      stats: {
        hp: s.hp || 0,
        atk: s.atk || 0,
        def: s.def || 0,
        spa: s.spa || 0,
        spd: s.spd || 0,
        spe: s.spe || 0
      }
    };
  });

  const cleanCategory = computed(() => {
    if (!species.value?.category) return 'Desconocido';
    return species.value.category.replace(/^Pokémon\s+/i, '');
  });

  const evolutions = computed(() => {
    const list = [];
    const id = targetSpeciesId.value;
    const caught = gameStore.state.pokedex || [];
    const seen = gameStore.state.seenPokedex || [];

    const enrichEvo = (evo: {
      type: EvolutionTriggerType;
      requirement: string;
      to: string;
    }): EvolutionEntry => {
      // type-ok: Type contract declaration
      const toId = requirePokemonSpeciesId(evo.to);
      const isCaught = caught.includes(toId);
      const isSeen = isCaught || seen.includes(toId);
      return { ...evo, to: toId, isSeen, isCaught };
    };

    const evoTable = EVOLUTION_TABLE as Record<
      DisplayText,
      { level: number; to: string } | undefined
    >; // open-record: Generic key-value data dictionary container
    if (evoTable[id]) {
      const ev = evoTable[id];
      list.push(enrichEvo({ type: 'level', requirement: `Nv. ${ev.level}`, to: ev.to }));
    }

    // open-record: Generic key-value data dictionary container
    const stoneTable = STONE_EVOLUTIONS as Record<
      DisplayText,
      { stone: string; to: string } | undefined
    >;
    Object.keys(stoneTable).forEach((key) => {
      if (key === id || key.startsWith(`${id}_`)) {
        const ev = stoneTable[key]!;
        list.push(enrichEvo({ type: 'stone', requirement: getItemName(ev.stone), to: ev.to }));
      }
    });

    const tradeTable = TRADE_EVOLUTIONS as Record<DisplayText, string | undefined>; // open-record: Generic key-value data dictionary container
    if (tradeTable[id]) {
      list.push(enrichEvo({ type: 'trade', requirement: 'Intercambio', to: tradeTable[id] }));
    }
    return list;
  });

  const displayStats = computed(() => {
    if (!species.value) return [];
    const labels: Record<PokemonStatKey, string> = {
      hp: 'HP',
      atk: 'ATK',
      def: 'DEF',
      spa: 'SPA',
      spd: 'SPD',
      spe: 'SPE'
    };
    const colors: Record<PokemonStatKey, string> = {
      hp: 'Rgba(255, 89, 89, 1)',
      atk: 'Rgba(245, 172, 120, 1)',
      def: 'Rgba(250, 224, 120, 1)',
      spa: 'Rgba(157, 183, 245, 1)',
      spd: 'Rgba(167, 219, 141, 1)',
      spe: 'Rgba(250, 146, 178, 1)'
    };
    return POKEMON_STAT_KEYS.map((key) => {
      const base = species.value?.stats[key] ?? 0;
      const current =
        isInstance.value && targetPokemon.value
          ? (Reflect.get(targetPokemon.value, key) as number | undefined) || base
          : base;
      return {
        id: key,
        label: labels[key] || key.toUpperCase(), // text-ok: UI text display localization string
        value: current,
        baseValue: base,
        max: MAX_BASE_STAT_VALUE,
        color: colors[key] || '#888',
        iv: isInstance.value ? (targetPokemon.value?.ivs?.[key] ?? 0) : 0,
        ev: isInstance.value ? (targetPokemon.value?.evs?.[key] ?? 0) : 0
      };
    });
  });

  const moveDetails = computed(() => {
    if (!species.value || !species.value.learnset) return [];
    return species.value.learnset
      .map((m) => {
        const resolvedId = m.id;
        const data = pokemonDataProvider.getMoveData(resolvedId);
        const basePP = data?.pp || DEFAULT_MAX_PP_FALLBACK;
        return {
          id: resolvedId,
          level: m.lv,
          name: m.name,
          type: toPokemonType(data?.type || 'normal'),
          cat: requireMoveCategory(data?.cat),
          power: data?.power ?? 0,
          acc: data?.acc ?? 100,
          pp: basePP,
          maxPP: basePP
        };
      })
      .sort((a, b) => a.level - b.level);
  });

  const currentMoves = computed(() => {
    if (!isInstance.value || !targetPokemon.value?.moves) return [];
    return targetPokemon.value.moves
      .map((m: Pokemon['moves'][number]) => {
        if (!m) return null;
        const resolvedId = (typeof m === 'string' ? m : m.id) || '';
        if (!resolvedId) return null;
        const data = pokemonDataProvider.getMoveData(resolvedId);
        const basePP = typeof m === 'object' && m?.pp ? m.pp : data?.pp || DEFAULT_MAX_PP_FALLBACK;
        const maxPP = typeof m === 'object' && m?.maxPP ? m.maxPP : basePP;
        return {
          ...(typeof m === 'object' ? m : {}),
          ...data,
          pp: basePP,
          maxPP,
          type: toPokemonType(
            data?.type || (typeof m === 'object' ? m.type : undefined) || 'normal'
          ),
          cat: requireMoveCategory(data?.cat || (typeof m === 'object' ? m.cat : undefined))
        };
      })
      .filter((m: unknown): m is Pokemon['moves'][number] & Partial<MoveBaseData> => m !== null);
  });

  const canStoneEvolve = computed(() => {
    const id = targetSpeciesId.value;
    return Object.keys(STONE_EVOLUTIONS).some((key) => key === id || key.startsWith(`${id}_`));
  });

  const instancePhysicalData = computed(() => {
    const p = targetPokemon.value as (Pokemon & { height?: number; weight?: number }) | undefined;
    if (!isInstance.value || !p || !species.value) return null;
    return calculateInstancePhysicalData(p, species.value);
  });

  const captureDateFormatted = computed(() => {
    const p = targetPokemon.value as
      | (Pokemon & { captureDate?: string; timestamp?: number; date?: string; created_at?: string })
      | undefined;
    if (!p) return null;
    const dateVal = p.captureDate || p.timestamp || p.date || p.created_at || p.obtainedAt;
    if (!dateVal) return isInstance.value ? 'SIN FECHA' : null;

    try {
      return (
        typeof dateVal === 'string'
          ? Temporal.Instant.from(dateVal)
          : Temporal.Instant.fromEpochMilliseconds(Number(dateVal))
      )
        .toZonedDateTimeISO(GAME_TIMEZONE)
        .toLocaleString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
    } catch {
      return null;
    }
  });

  const getSprite = (id: string, isShiny: boolean = false): string =>
    getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny });

  return {
    targetPokemon,
    isInstance,
    targetSpeciesId,
    species,
    cleanCategory,
    evolutions,
    displayStats,
    moveDetails,
    currentMoves,
    canStoneEvolve,
    instancePhysicalData,
    captureDateFormatted,
    getSprite,
    finalIndex,
    finalContext
  };
}
