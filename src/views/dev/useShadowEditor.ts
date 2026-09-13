/**
 * src/views/dev/useShadowEditor.ts
 *
 * State management and business logic for the developer shadow calibration editor.
 */

import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue';
import type {
  SpriteShadowOverridesMap,
  EditorEntity,
  ShadowEntityCategory,
  GlobalShadowConfig
} from '@/types/pokemon/spriteShadows';
import {
  DEFAULT_SHADOW_WIDTH_RATIO,
  DEFAULT_SHADOW_HEIGHT_RATIO,
  DEFAULT_SHADOW_PIXELATION,
  parseTrainerSpriteKey
} from '@/types/pokemon/spriteShadows';
import { GLOBAL_SHADOW_CONFIG } from '@/data/pokemon/pokemonFeetDatabase';
import feetDbJson from '@/data/pokemon/pokemonFeetDatabase.json' with { type: 'json' };
import { POKEMON_SPRITE_IDS, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import { NPC_SPRITE_TO_ARCHETYPE_MAP, isNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import type { GenderName } from '@pkmn/types';
import gsap from 'gsap';

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_COLUMNS = 4;
const DEFAULT_FEET_Y = 0.9;
const DEFAULT_FEET_X = 0.5;
const TOAST_TIMEOUT_SEC = 3.0;

export const DEFAULT_SPRITE_ZOOM = 2.0;
export const MIN_SPRITE_ZOOM = 0.8;
export const MAX_SPRITE_ZOOM = 4.0;
export const SPRITE_ZOOM_STEP = 0.1;

function getPokemonGen(dexNumber: number): number {
  if (dexNumber <= 151) return 1;
  if (dexNumber <= 251) return 2;
  if (dexNumber <= 386) return 3;
  if (dexNumber <= 493) return 4;
  if (dexNumber <= 649) return 5;
  if (dexNumber <= 721) return 6;
  if (dexNumber <= 809) return 7;
  if (dexNumber <= 905) return 8;
  return 9;
}

export function getNonShinyPath(fullPath: string): string {
  return fullPath
    .replace('/Back shiny/', '/Back/')
    .replace('/Front shiny/', '/Front/')
    .replace('/Icons shiny/', '/Icons/')
    .replace('/Back_shiny/', '/Back/')
    .replace('/Front_shiny/', '/Front/')
    .replace('/Icons_shiny/', '/Icons/')
    .replace('/shiny/', '/');
}

export function useShadowEditor() {
  const overrides = ref<SpriteShadowOverridesMap>({});
  const initialSavedJson = ref<string>('{}');
  const globalShadowConfig = ref<GlobalShadowConfig>({
    widthRatio: GLOBAL_SHADOW_CONFIG.widthRatio,
    heightRatio: GLOBAL_SHADOW_CONFIG.heightRatio,
    pixelation: GLOBAL_SHADOW_CONFIG.pixelation
  });
  const initialSavedConfigJson = ref<string>(JSON.stringify(globalShadowConfig.value));

  const isLoading = ref(true);
  const isSaving = ref(false);
  const isRebuilding = ref(false);
  const rebuildProgress = ref(0);
  const rebuildMessage = ref('');
  const toastMessage = ref<string | null>(null);

  // Helper to read from sessionStorage safely
  const getSessionNumber = (key: string, fallback: number): number => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return fallback;
    try {
      const val = sessionStorage.getItem(key);
      if (val !== null) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) return num;
      }
    } catch {
      // sessionStorage unavailable
    }
    return fallback;
  };

  const setSessionValue = (key: string, val: string): void => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(key, val);
    } catch {
      // sessionStorage unavailable
    }
  };

  // Filters & Settings
  const selectedCategory = ref<ShadowEntityCategory>('pokemon');
  const selectedView = ref<'all' | 'front' | 'back'>('all');
  const selectedGen = ref<number | 'all'>('all');
  const selectedGender = ref<'all' | Extract<GenderName, 'M' | 'F'>>('all');
  const isShiny = ref(false);
  const searchQuery = ref('');
  const onlyModified = ref(false);
  const columns = ref(getSessionNumber('dev_shadow_columns', DEFAULT_COLUMNS));
  const spriteZoom = ref(getSessionNumber('dev_shadow_zoom', DEFAULT_SPRITE_ZOOM));
  const currentPage = ref(getSessionNumber('dev_shadow_page', 1));

  watch(columns, (val) => {
    setSessionValue('dev_shadow_columns', String(val));
  });

  watch(spriteZoom, (val) => {
    setSessionValue('dev_shadow_zoom', String(val));
  });

  watch(currentPage, (val) => {
    setSessionValue('dev_shadow_page', String(val));
  });

  // All cataloged entity definitions
  const allEntities = ref<EditorEntity[]>([]);

  let toastTween: gsap.core.Tween | null = null;
  const showToast = (msg: string) => {
    toastMessage.value = msg;
    if (toastTween) toastTween.kill();
    toastTween = gsap.delayedCall(TOAST_TIMEOUT_SEC, () => {
      if (toastMessage.value === msg) {
        toastMessage.value = null;
      }
    });
  };

  const hasUnsavedChanges = computed(() => {
    return JSON.stringify(overrides.value) !== initialSavedJson.value ||
      JSON.stringify(globalShadowConfig.value) !== initialSavedConfigJson.value;
  });

  const resetGlobalWidthRatio = () => {
    globalShadowConfig.value = { ...globalShadowConfig.value, widthRatio: DEFAULT_SHADOW_WIDTH_RATIO };
  };

  const resetGlobalHeightRatio = () => {
    globalShadowConfig.value = { ...globalShadowConfig.value, heightRatio: DEFAULT_SHADOW_HEIGHT_RATIO };
  };

  const resetGlobalPixelation = () => {
    globalShadowConfig.value = { ...globalShadowConfig.value, pixelation: DEFAULT_SHADOW_PIXELATION };
  };

  const modifiedCount = computed(() => {
    return Object.keys(overrides.value).length;
  });

  // Extract base feet data from precalculated static DB in O(1)
  const getPrecalculatedFeet = (fullPath: string): { feetY: number; feetX: number; isFlying: boolean; shadowScale: number } => {
    const pGroup = feetDbJson.p as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container
    const nGroup = feetDbJson.n as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container
    const tGroup = feetDbJson.t as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container

    let tuple: readonly number[] | undefined;
    if (fullPath.startsWith('/assets/sprites/pokemon/')) {
      const sub = fullPath.slice('/assets/sprites/pokemon/'.length).replace(/\.webp$/i, '');
      tuple = pGroup[sub];
    } else if (fullPath.startsWith('/assets/sprites/npc/')) {
      const sub = fullPath.slice('/assets/sprites/npc/'.length).replace(/\.webp$/i, '');
      tuple = nGroup[sub];
    } else if (fullPath.startsWith('/assets/sprites/trainers/')) {
      const sub = fullPath.slice('/assets/sprites/trainers/'.length).replace(/\.webp$/i, '');
      tuple = tGroup[sub];
    }

    if (tuple && tuple.length >= 2) {
      return {
        feetY: tuple[0]!,
        feetX: tuple[1]!,
        isFlying: tuple[2] === 1,
        shadowScale: tuple[3] ?? 1.0
      };
    }

    const nonShiny = getNonShinyPath(fullPath);
    if (nonShiny !== fullPath) {
      return getPrecalculatedFeet(nonShiny);
    }

    return { feetY: DEFAULT_FEET_Y, feetX: DEFAULT_FEET_X, isFlying: false, shadowScale: 1.0 };
  };

  const buildCatalog = () => {
    const list: EditorEntity[] = [];
    const seenKeys = new Set<string>();
    const addEntity = (entity: EditorEntity) => {
      if (seenKeys.has(entity.key)) return;
      seenKeys.add(entity.key);
      list.push(entity);
    };

    const pGroup = feetDbJson.p as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container

    // 1. Extract canonical species map in exact National Dex order (1 to 1025)
    // Eliminating duplicate forms/cosplays so each National Dex species appears once
    const canonicalSpeciesMap = new Map<number, string>();
    for (const [speciesName, num] of Object.entries(POKEMON_SPRITE_IDS)) {
      const dexNum = parseInt(String(num), 10);
      if (!isNaN(dexNum) && !canonicalSpeciesMap.has(dexNum)) {
        canonicalSpeciesMap.set(dexNum, speciesName);
      }
    }

    const sortedDexNumbers = Array.from(canonicalSpeciesMap.keys()).sort((a, b) => a - b);
    const shinyFolderSuffix = isShiny.value ? ' shiny' : '';

    // Intercalate Front and Back for every Pokémon
    for (const numVal of sortedDexNumbers) {
      const speciesName = canonicalSpeciesMap.get(numVal)!;
      let validSpeciesId;
      try {
        validSpeciesId = requirePokemonSpeciesId(speciesName);
      } catch {
        continue;
      }

      const gen = getPokemonGen(numVal);

      // FRONT (♂ M / Base)
      const frontAnimSubKey = `animated/Front${shinyFolderSuffix}/${numVal}i`;
      const baseFrontAnimSubKey = `animated/Front/${numVal}i`;
      const hasFrontAnim = Object.hasOwn(pGroup, frontAnimSubKey) || Object.hasOwn(pGroup, baseFrontAnimSubKey);
      const frontPath = hasFrontAnim
        ? `/assets/sprites/pokemon/${frontAnimSubKey}.webp`
        : `/assets/sprites/pokemon/Front${shinyFolderSuffix}/${numVal}.webp`;
      const frontCoords = getPrecalculatedFeet(frontPath);

      addEntity({
        key: frontPath,
        category: 'pokemon',
        name: `#${String(numVal).padStart(3, '0')} ${speciesName.toUpperCase()}`,
        spriteUrl: frontPath,
        defaultFeetX: frontCoords.feetX,
        defaultFeetY: frontCoords.feetY,
        defaultIsFlying: frontCoords.isFlying,
        defaultShadowScale: frontCoords.shadowScale,
        pokemonSpeciesId: validSpeciesId,
        dexNumber: numVal,
        gender: 'M',
        gen,
        view: 'front'
      });

      // BACK (♂ M / Base) - Intercalated immediately following Front
      const backAnimSubKey = `animated/Back${shinyFolderSuffix}/${numVal}i`;
      const baseBackAnimSubKey = `animated/Back/${numVal}i`;
      const hasBackAnim = Object.hasOwn(pGroup, backAnimSubKey) || Object.hasOwn(pGroup, baseBackAnimSubKey);
      const backPath = hasBackAnim
        ? `/assets/sprites/pokemon/${backAnimSubKey}.webp`
        : `/assets/sprites/pokemon/Back${shinyFolderSuffix}/${numVal}.webp`;
      const backCoords = getPrecalculatedFeet(backPath);

      addEntity({
        key: backPath,
        category: 'pokemon',
        name: `#${String(numVal).padStart(3, '0')} ${speciesName.toUpperCase()}`,
        spriteUrl: backPath,
        defaultFeetX: backCoords.feetX,
        defaultFeetY: backCoords.feetY,
        defaultIsFlying: backCoords.isFlying,
        defaultShadowScale: backCoords.shadowScale,
        pokemonSpeciesId: validSpeciesId,
        dexNumber: numVal,
        gender: 'M',
        gen,
        view: 'back'
      });

      // Check for female variant (e.g. animated/Front/25i_f.webp) in O(1)
      const femaleFrontSubKey = `animated/Front${shinyFolderSuffix}/${numVal}i_f`;
      const baseFemaleFrontSubKey = `animated/Front/${numVal}i_f`;
      const hasFemaleFrontAnim = Object.hasOwn(pGroup, femaleFrontSubKey) || Object.hasOwn(pGroup, baseFemaleFrontSubKey);

      if (hasFemaleFrontAnim) {
        const femaleFrontPath = `/assets/sprites/pokemon/${femaleFrontSubKey}.webp`; // asset-url-ok: dev sprite catalog key
        const femaleFrontCoords = getPrecalculatedFeet(femaleFrontPath);

        addEntity({
          key: femaleFrontPath,
          category: 'pokemon',
          name: `#${String(numVal).padStart(3, '0')} ${speciesName.toUpperCase()} ♀`,
          spriteUrl: femaleFrontPath,
          defaultFeetX: femaleFrontCoords.feetX,
          defaultFeetY: femaleFrontCoords.feetY,
          defaultIsFlying: femaleFrontCoords.isFlying,
          defaultShadowScale: femaleFrontCoords.shadowScale,
          pokemonSpeciesId: validSpeciesId,
          dexNumber: numVal,
          gender: 'F',
          gen,
          view: 'front'
        });

        const femaleBackSubKey = `animated/Back${shinyFolderSuffix}/${numVal}i_f`;
        const baseFemaleBackSubKey = `animated/Back/${numVal}i_f`;
        const hasFemaleBackAnim = Object.hasOwn(pGroup, femaleBackSubKey) || Object.hasOwn(pGroup, baseFemaleBackSubKey);

        if (hasFemaleBackAnim) {
          const femaleBackPath = `/assets/sprites/pokemon/${femaleBackSubKey}.webp`; // asset-url-ok: dev sprite catalog key
          const femaleBackCoords = getPrecalculatedFeet(femaleBackPath);

          addEntity({
            key: femaleBackPath,
            category: 'pokemon',
            name: `#${String(numVal).padStart(3, '0')} ${speciesName.toUpperCase()} ♀`,
            spriteUrl: femaleBackPath,
            defaultFeetX: femaleBackCoords.feetX,
            defaultFeetY: femaleBackCoords.feetY,
            defaultIsFlying: femaleBackCoords.isFlying,
            defaultShadowScale: femaleBackCoords.shadowScale,
            pokemonSpeciesId: validSpeciesId,
            dexNumber: numVal,
            gender: 'F',
            gen,
            view: 'back'
          });
        }
      }
    }

    // 2. NPC entities with O(1) archetype resolution (Full-body only)
    const nGroup = feetDbJson.n as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container
    const npcSpriteNames = Object.keys(nGroup).sort();

    for (const name of npcSpriteNames) {
      const fullPath = `/assets/sprites/npc/${name}.webp`; // asset-url-ok: dev sprite catalog key
      const baseCoords = getPrecalculatedFeet(fullPath);
      const validNpcId = isNpcSpriteId(name) ? name : undefined;
      const archetype = validNpcId ? NPC_SPRITE_TO_ARCHETYPE_MAP[validNpcId] : 'cientifico';

      addEntity({
        key: fullPath,
        category: 'npc',
        name: `NPC: ${name}`,
        spriteUrl: fullPath,
        defaultFeetX: baseCoords.feetX,
        defaultFeetY: baseCoords.feetY,
        defaultIsFlying: baseCoords.isFlying,
        defaultShadowScale: baseCoords.shadowScale,
        npcSpriteId: validNpcId,
        archetype
      });
    }

    // 3. Trainer / Player entities (FULL BODY ONLY: 'front' | 'back', strictly excluding 'avatar')
    const tGroup = feetDbJson.t as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container
    const trainerSpriteNames = Object.keys(tGroup).sort();

    for (const name of trainerSpriteNames) {
      const fullPath = `/assets/sprites/trainers/${name}.webp`; // asset-url-ok: dev sprite catalog key
      const baseCoords = getPrecalculatedFeet(fullPath);
      const parsed = parseTrainerSpriteKey(name);
      if (!parsed) continue; // Excludes avatar icons

      addEntity({
        key: fullPath,
        category: 'trainer',
        name: `TRAINER: ${name}`,
        spriteUrl: fullPath,
        defaultFeetX: baseCoords.feetX,
        defaultFeetY: baseCoords.feetY,
        defaultIsFlying: baseCoords.isFlying,
        defaultShadowScale: baseCoords.shadowScale,
        trainerClass: parsed.trainerClass,
        gender: parsed.gender,
        view: parsed.view
      });
    }

    allEntities.value = list;
  };

  const loadOverrides = async () => {
    isLoading.value = true;
    try {
      const res = await fetch('/api/dev-load-shadow-overrides');
      if (res.ok) {
        const data = await res.json();
        let overridesMap = data.overrides ?? data;
        while (overridesMap && typeof overridesMap === 'object' && 'overrides' in overridesMap) {
          overridesMap = overridesMap.overrides;
        }
        const cleanMap = { ...overridesMap };
        delete cleanMap.globalShadowConfig;
        delete cleanMap.overrides;
        overrides.value = cleanMap;
        initialSavedJson.value = JSON.stringify(cleanMap);
        if (data.globalShadowConfig) {
          globalShadowConfig.value = {
            widthRatio: data.globalShadowConfig.widthRatio ?? DEFAULT_SHADOW_WIDTH_RATIO,
            heightRatio: data.globalShadowConfig.heightRatio ?? DEFAULT_SHADOW_HEIGHT_RATIO,
            pixelation: data.globalShadowConfig.pixelation ?? DEFAULT_SHADOW_PIXELATION
          };
          initialSavedConfigJson.value = JSON.stringify(globalShadowConfig.value);
        }
      }
    } catch (_e) {
      overrides.value = {};
      initialSavedJson.value = '{}';
    } finally {
      buildCatalog();
      isLoading.value = false;
    }
  };

  const filteredEntities = computed(() => {
    let result = allEntities.value;

    if (selectedCategory.value !== 'all') {
      result = result.filter(e => e.category === selectedCategory.value);
    }

    if (selectedCategory.value === 'pokemon' && selectedGen.value !== 'all') {
      result = result.filter(e => e.category === 'pokemon' && e.gen === selectedGen.value);
    }

    if (selectedCategory.value === 'pokemon' && selectedGender.value !== 'all') {
      result = result.filter(e => e.category === 'pokemon' && e.gender === selectedGender.value);
    }

    if (selectedView.value !== 'all') {
      result = result.filter(e => {
        if (e.category === 'pokemon') return e.view === selectedView.value;
        if (e.category === 'trainer') return e.view === selectedView.value;
        return true;
      });
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q) || e.key.toLowerCase().includes(q));
    }

    if (onlyModified.value) {
      result = result.filter(e => !!overrides.value[e.key]);
    }

    return result;
  });

  const totalEntities = computed(() => filteredEntities.value.length);
  const totalPages = computed(() => Math.max(1, Math.ceil(totalEntities.value / DEFAULT_PAGE_SIZE)));

  const pagedEntities = computed(() => {
    const start = (currentPage.value - 1) * DEFAULT_PAGE_SIZE;
    return filteredEntities.value.slice(start, start + DEFAULT_PAGE_SIZE);
  });

  const setEntityOverride = (
    key: string,
    feetX: number,
    feetY: number,
    isFlying: boolean,
    shadowScale?: number
  ) => {
    overrides.value = {
      ...overrides.value,
      [key]: {
        feetX: Number(feetX.toFixed(4)),
        feetY: Number(feetY.toFixed(4)),
        isFlying,
        ...(shadowScale !== undefined && shadowScale !== 1.0 ? { shadowScale: Number(shadowScale.toFixed(2)) } : {})
      }
    };
  };

  const getEffectiveOverride = (key: string) => {
    if (overrides.value[key]) return overrides.value[key];
    const baseKey = getNonShinyPath(key);
    if (baseKey !== key && overrides.value[baseKey]) {
      return overrides.value[baseKey];
    }
    return undefined;
  };

  const isInheritedFromBase = (key: string): boolean => {
    if (overrides.value[key]) return false;
    const baseKey = getNonShinyPath(key);
    return baseKey !== key && overrides.value[baseKey] !== undefined;
  };

  const resetEntityOverride = (key: string) => {
    if (overrides.value[key]) {
      const next = { ...overrides.value };
      delete next[key];
      overrides.value = next;
    }
  };

  const saveChanges = async () => {
    isSaving.value = true;
    try {
      const res = await fetch('/api/dev-save-shadow-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrides: overrides.value,
          globalShadowConfig: globalShadowConfig.value
        }, null, 2)
      });
      const data = await res.json();
      if (data.success) {
        initialSavedJson.value = JSON.stringify(overrides.value);
        initialSavedConfigJson.value = JSON.stringify(globalShadowConfig.value);
        showToast(`💾 Cambios guardados en disco (${data.count} overrides + config de sombra).`);
      } else {
        showToast(`❌ Error al guardar: ${data.error || 'Fallo desconocido'}`);
      }
    } catch (err) {
      showToast(`❌ Error de red al contactar con Vite dev server: ${String(err)}`);
    } finally {
      isSaving.value = false;
    }
  };

  const rebuildDatabase = async (): Promise<boolean> => {
    if (isRebuilding.value) return false;
    await saveChanges();
    isRebuilding.value = true;
    rebuildProgress.value = 0;
    rebuildMessage.value = 'Iniciando motor de recompilación estática...';

    return new Promise((resolve) => {
      const eventSource = new EventSource('/api/dev-rebuild-feet-database');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          rebuildProgress.value = data.progress;
          rebuildMessage.value = data.message;

          if (data.done) {
            eventSource.close();
            isRebuilding.value = false;
            showToast('⚡ Base de datos estática recompilada con éxito.');
            resolve(true);
          }
        } catch {
          // JSON parse error
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        isRebuilding.value = false;
        showToast('❌ Error de comunicación SSE con Vite Dev Server.');
        resolve(false);
      };
    });
  };

  const downloadJson = () => {
    const payload = {
      globalShadowConfig: globalShadowConfig.value,
      overrides: overrides.value
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spriteShadowOverrides.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 Archivo spriteShadowOverrides.json descargado.');
  };

  watch([isShiny], () => {
    buildCatalog();
  });

  if (getCurrentInstance()) {
    onMounted(() => {
      loadOverrides();
    });
  } else {
    loadOverrides();
  }

  return {
    overrides,
    globalShadowConfig,
    resetGlobalWidthRatio,
    resetGlobalHeightRatio,
    resetGlobalPixelation,
    hasUnsavedChanges,
    modifiedCount,
    isLoading,
    isSaving,
    isRebuilding,
    rebuildProgress,
    rebuildMessage,
    toastMessage,
    selectedCategory,
    selectedView,
    selectedGen,
    selectedGender,
    isShiny,
    searchQuery,
    onlyModified,
    columns,
    spriteZoom,
    currentPage,
    totalEntities,
    totalPages,
    allEntities,
    filteredEntities,
    pagedEntities,
    buildCatalog,
    setEntityOverride,
    resetEntityOverride,
    getEffectiveOverride,
    isInheritedFromBase,
    getNonShinyPath,
    saveChanges,
    rebuildDatabase,
    downloadJson
  };
}
