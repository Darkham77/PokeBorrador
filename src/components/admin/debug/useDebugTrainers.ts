import type { JsonObject } from '@francogp/auditor';
import { ref, computed, type ComputedRef, type Ref } from 'vue';

import type { ItemId } from '@/data/inventory/items';
import {
  TRAINER_TYPES,
  isTrainerTypeKey,
  requireNpcArchetype,
  getArchetypePool
} from '@/data/player/trainerTypes';
import { ARCHETYPE_SPRITES } from '@/data/pokemon/npcSpriteCatalog';
import { requireNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { GYMS, GYMS_BY_ID, isGymId, type GymId } from '@/data/world/gyms';
import type { MapRouteId } from '@/data/world/map-assets';
import { MAX_POKEMON_TEAM_SIZE } from '@/logic/constants/gameplay';
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService';
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { generateNpcName, type NpcNameOptions } from '@/logic/utils/npcNameGenerator';
import {
  getSpritesForArchetype,
  type NpcArchetype,
  type NpcSpriteId
} from '@/logic/utils/npcSpriteRouter';
import { useBattleStore } from '@/stores/battle/battle';
import { useDebugStore } from '@/stores/debug';
import { useGameStore } from '@/stores/game';
import { usePlayerClassStore } from '@/stores/player/playerClass';
import type { BattleDifficulty, BattleMinigame } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

import { generateDebugTeamList } from './debugTrainerTeamHelper.ts';

const POLICE_PRESET_AVG_LEVEL_BASE = 30;
const POLICE_PRESET_LEVEL_BOOST = 2;
const POLICE_PRESET_IV_VAL = 20;
const DEFAULT_GEN_MIN_LEVEL = 10;
const DEFAULT_GEN_MAX_LEVEL = 15;
const MIN_POLICE_LEVEL = 10;
const DEFAULT_ADD_POKEMON_LEVEL = 10;

interface ExtendedPokemon extends Pokemon {
  _revealed?: boolean;
}

interface ExtendedBattleOptions {
  isTrainer?: boolean;
  trainerName?: string;
  isGym?: boolean;
  gymId?: GymId;
  locationId?: MapRouteId;
  wasSearching?: boolean;
  enemyTeam?: Pokemon[];
  minigame?: BattleMinigame | null;
  isGuardian?: boolean;
  pts?: number;
  isDebug?: boolean;
  difficulty?: BattleDifficulty;
  rewardTM?: ItemId;
  battleOptions?: JsonObject;
}

// TRAINER_SPRITES removed — use ARCHETYPE_SPRITES from npcSpriteCatalog for dynamic selection.
// Use getSpritesForArchetype(archetype) to get the full list for a given archetype.

// Derived from TRAINER_TYPES to avoid duplication — adding an archetype there automatically includes it here
export const ARCHETYPE_PRESETS = [
  { id: 'random', name: 'Al Azar (Total)' },
  ...Object.entries(TRAINER_TYPES).map(([id, def]) => ({ id, name: def.name }))
];

// All sprites across all archetypes, flattened — used for totally random selection
const ALL_CATALOG_SPRITES: readonly NpcSpriteId[] = (
  Object.values(ARCHETYPE_SPRITES) as ReadonlyArray<readonly NpcSpriteId[]>
).flat();

export type CombatLocationType = 'map' | 'gym';

export interface UseDebugTrainersReturn {
  trainerName: Ref<string>;
  trainerSprite: Ref<NpcSpriteId>;
  enemyTeam: Ref<Pokemon[]>;
  selectedPokeIndex: Ref<number | null>;
  selectedPreset: Ref<string>;
  combatLocationType: Ref<CombatLocationType>;
  selectedMapId: Ref<MapRouteId>;
  selectedGymId: Ref<string>;
  gymDifficulty: Ref<BattleDifficulty>;
  genTeamSize: Ref<number>;
  genMinLevel: Ref<number>;
  genMaxLevel: Ref<number>;
  genForceShiny: Ref<boolean>;
  genGuardianProb: Ref<number>;
  isRocketClass: ComputedRef<boolean>;
  criminality: ComputedRef<number>;
  allMapsList: ComputedRef<Array<{ id: MapRouteId; name: string }>>;
  gymList: ComputedRef<Array<{ id: string; name: string; leader: string }>>;
  activePoke: ComputedRef<Pokemon | null>;
  availableSpriteList: ComputedRef<Array<{ id: string; label: string }>>;
  randomizeTrainer: () => void;
  randomizeTrainerName: () => void;
  randomizeTrainerSprite: () => void;
  generateRandomTeam: () => void;
  loadPolicePreset: () => void;
  addPokemonToTeam: () => void;
  removePokemonFromTeam: (idx: number) => void;
  startCombat: () => Promise<void>;
  validateTeamLegality: () => { valid: boolean; issues: string[] };
  debugStore: ReturnType<typeof useDebugStore>;
}

export function useDebugTrainers(): UseDebugTrainersReturn {
  const battleStore = useBattleStore();
  const gameStore = useGameStore();
  const classStore = usePlayerClassStore();
  const debugStore = useDebugStore();

  const trainerName = ref('Entrenador Vicio');
  const trainerSprite = ref<NpcSpriteId>('youngster');
  const enemyTeam = ref<Pokemon[]>([]);
  const trainerArchetype = ref<NpcArchetype | undefined>(undefined);
  const selectedPokeIndex = ref<number | null>(null);
  const selectedPreset = ref('random');

  const combatLocationType = ref<CombatLocationType>('map');
  const selectedMapId = ref<MapRouteId>('route1');
  const selectedGymId = ref('pewter');
  const gymDifficulty = ref<BattleDifficulty>('normal');

  const genTeamSize = ref(3);
  const genMinLevel = ref(DEFAULT_GEN_MIN_LEVEL);
  const genMaxLevel = ref(DEFAULT_GEN_MAX_LEVEL);
  const genForceShiny = ref(false);
  const genGuardianProb = ref(0.01);

  const isRocketClass = computed(() => classStore.playerClass === 'rocket');
  const criminality = computed({
    get: () => classStore.classData.criminality || 0,
    set: (val: number) => {
      if (classStore.classData) {
        classStore.classData.criminality = val;
        gameStore.scheduleSave();
      }
    }
  });

  const allMapsList = computed(() => {
    const maps = pokemonDataProvider.getMaps(); // domain-ok: Open dynamic text or non-domain string payload
    return maps.map((m) => ({ id: m.id, name: m.name }));
  });

  // Dynamic list of sprites for the current preset — used by the sprite <select> in the UI
  const availableSpriteList = computed<{ id: string; label: string }[]>(() => {
    const preset = selectedPreset.value;
    const sprites =
      preset !== 'random' ? getSpritesForArchetype(preset as NpcArchetype) : ALL_CATALOG_SPRITES;
    return sprites.map((id) => ({ id, label: id }));
  });

  const gymList = computed(() => {
    return GYMS.map((g) => ({ id: g.id, name: g.name, leader: g.leader }));
  });

  const activePoke = computed<Pokemon | null>(() => {
    if (selectedPokeIndex.value === null) return null;
    return enemyTeam.value[selectedPokeIndex.value] || null;
  });

  function generateThemedTrainerName(archetypeKey: string): string {
    const archetype = requireNpcArchetype(archetypeKey);
    return generateNpcName({
      spriteId: trainerSprite.value,
      archetype,
      includeTitle: true
    });
  }

  function randomizeTrainer(): void {
    randomizeTrainerSprite();
    randomizeTrainerName();
  }

  function randomizeTrainerName(): void {
    const opts: NpcNameOptions = {
      spriteId: trainerSprite.value,
      includeTitle: true
    };
    if (trainerArchetype.value) {
      opts.archetype = trainerArchetype.value;
    }
    trainerName.value = generateNpcName(opts);
  }

  function randomizeTrainerSprite(): void {
    if (selectedPreset.value !== 'random') {
      const archetype = requireNpcArchetype(selectedPreset.value);
      const sprites = getSpritesForArchetype(archetype);
      const randomSprite = sprites[Math.floor(Math.random() * sprites.length)];
      if (!randomSprite) {
        throw new Error(
          `[useDebugTrainers] No sprites found for archetype ${selectedPreset.value}`
        );
      }
      trainerSprite.value = requireNpcSpriteId(randomSprite);
    } else {
      const randomSprite =
        ALL_CATALOG_SPRITES[Math.floor(Math.random() * ALL_CATALOG_SPRITES.length)];
      if (!randomSprite) {
        throw new Error('[useDebugTrainers] ALL_CATALOG_SPRITES is empty');
      }
      trainerSprite.value = requireNpcSpriteId(randomSprite);
    }
  }

  function setupArchetypeTrainer(archetypeKey: string): readonly PokemonSpeciesId[] {
    const archetype = requireNpcArchetype(archetypeKey);
    trainerArchetype.value = archetype;
    trainerName.value = generateThemedTrainerName(archetypeKey);

    const availableSprites = getSpritesForArchetype(archetype);
    const randomSprite = availableSprites[Math.floor(Math.random() * availableSprites.length)];
    if (!randomSprite) {
      throw new Error(`[useDebugTrainers] No sprites found for archetype: ${archetypeKey}`);
    }
    trainerSprite.value = requireNpcSpriteId(randomSprite);

    return isTrainerTypeKey(archetype) ? getArchetypePool(archetype) : ['rattata'];
  }

  function generateRandomTeam(): void {
    let pool: readonly PokemonSpeciesId[];

    if (selectedPreset.value === 'random') {
      trainerArchetype.value = undefined;
      randomizeTrainer();
      pool = Object.keys(pokemonDataProvider.getPokemonDb()).filter(isPokemonSpeciesId);
    } else {
      pool = setupArchetypeTrainer(selectedPreset.value);
    }

    const team = generateDebugTeamList({
      size: genTeamSize.value,
      speciesPool: pool,
      minLevel: genMinLevel.value,
      maxLevel: genMaxLevel.value,
      forceShiny: genForceShiny.value,
      guardianProb: genGuardianProb.value
    });

    enemyTeam.value = team;
    selectedPokeIndex.value = team.length > 0 ? 0 : null;
  }

  function loadPolicePreset(): void {
    trainerName.value = 'Oficial de Policía';
    trainerSprite.value = 'policeman';
    trainerArchetype.value = 'policeman';
    combatLocationType.value = 'map';

    const pool: PokemonSpeciesId[] = [
      'growlithe',
      'arcanine',
      'machoke',
      'magneton',
      'pidgeot'
    ] as const;
    const team: Pokemon[] = [];

    const teamAlive = gameStore.state.team.filter((p: Pokemon | null) => p && p.hp > 0);
    const averagePlayerLevel =
      teamAlive.length === 0
        ? POLICE_PRESET_AVG_LEVEL_BASE
        : Math.floor(
            teamAlive.reduce((acc: number, cur: Pokemon | null) => acc + (cur?.level || 0), 0) /
              teamAlive.length
          );

    const lvl = Math.max(MIN_POLICE_LEVEL, averagePlayerLevel + POLICE_PRESET_LEVEL_BOOST);

    pool.forEach((id) => {
      const p = pokemonDebugService.generate({
        id,
        level: lvl,
        ivs: {
          hp: POLICE_PRESET_IV_VAL,
          atk: POLICE_PRESET_IV_VAL,
          def: POLICE_PRESET_IV_VAL,
          spa: POLICE_PRESET_IV_VAL,
          spd: POLICE_PRESET_IV_VAL,
          spe: POLICE_PRESET_IV_VAL
        }
      });
      if (p) team.push(p);
    });

    enemyTeam.value = team.slice(0, 3);
    selectedPokeIndex.value = 0;
  }

  function addPokemonToTeam(): void {
    if (enemyTeam.value.length >= MAX_POKEMON_TEAM_SIZE) return;
    const p = pokemonDebugService.generate({ id: 'rattata', level: DEFAULT_ADD_POKEMON_LEVEL });
    if (p) {
      enemyTeam.value.push(p);
      selectedPokeIndex.value = enemyTeam.value.length - 1;
    }
  }

  function removePokemonFromTeam(index: number): void {
    enemyTeam.value.splice(index, 1);
    if (selectedPokeIndex.value === index) {
      selectedPokeIndex.value = enemyTeam.value.length > 0 ? 0 : null;
    } else if (selectedPokeIndex.value !== null && selectedPokeIndex.value > index) {
      selectedPokeIndex.value--;
    }
  }

  async function startCombat(): Promise<void> {
    if (enemyTeam.value.length === 0) {
      alert('¡Debes agregar al menos un Pokémon al equipo enemigo!');
      return;
    }

    if (battleStore.isBattleActive) {
      await battleStore.endBattle(false, true);
    }

    const firstEnemy = enemyTeam.value[0];
    if (!firstEnemy) return;

    const isGym = combatLocationType.value === 'gym';
    const gym = isGym && isGymId(selectedGymId.value) ? GYMS_BY_ID[selectedGymId.value] : null;

    const locationId = isGym ? 'stadium' : selectedMapId.value;
    const trainerNameVal = isGym && gym ? `Líder ${gym.leader}` : trainerName.value;
    const gymIdVal = isGym && gym ? gym.id : undefined;
    const rewardTMVal = isGym && gym ? gym.rewardTM : undefined;

    enemyTeam.value.forEach((p) => {
      (p as ExtendedPokemon)._revealed = true;
    });

    const opts: ExtendedBattleOptions = {
      isTrainer: true,
      trainerName: trainerNameVal,
      enemyTeam: enemyTeam.value,
      locationId,
      isGym,
      gymId: gymIdVal,
      difficulty: isGym ? gymDifficulty.value : undefined,
      rewardTM: rewardTMVal,
      battleOptions: {
        trainerSprite: trainerSprite.value,
        ...(trainerArchetype.value ? { trainerArchetype: trainerArchetype.value } : {})
      }
    };

    await battleStore.startBattle(firstEnemy, opts); // domain-ok: Open dynamic text or non-domain string payload
  }

  function validateTeamLegality(): { valid: boolean; issues: string[] } {
    const issues: string[] = []; // no-domain: Non-domain utility collection or data structure
    if (enemyTeam.value.length === 0) {
      issues.push('El equipo del entrenador debe tener al menos 1 Pokémon.');
      return { valid: false, issues };
    }
    for (let idx = 0; idx < enemyTeam.value.length; idx++) {
      const p = enemyTeam.value[idx];
      if (!p) continue;
      const report = checkPokemonLegality(p);
      if (!report.isLegal) {
        for (const issue of report.issues) {
          issues.push(`[#${idx + 1} ${p.name}]: ${issue}`);
        }
      }
    }
    return { valid: issues.length === 0, issues };
  }

  return {
    trainerName,
    trainerSprite,
    enemyTeam,
    selectedPokeIndex,
    selectedPreset,
    combatLocationType,
    selectedMapId,
    selectedGymId,
    gymDifficulty,
    genTeamSize,
    genMinLevel,
    genMaxLevel,
    genForceShiny,
    genGuardianProb,
    isRocketClass,
    criminality,
    allMapsList,
    gymList,
    activePoke,
    availableSpriteList,
    randomizeTrainer,
    randomizeTrainerName,
    randomizeTrainerSprite,
    generateRandomTeam,
    loadPolicePreset,
    addPokemonToTeam,
    removePokemonFromTeam,
    startCombat,
    validateTeamLegality,
    debugStore
  };
}
