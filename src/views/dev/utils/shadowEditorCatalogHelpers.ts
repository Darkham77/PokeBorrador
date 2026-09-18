import type { EditorEntity } from '@/types/pokemon/spriteShadows';
import { parseTrainerSpriteKey } from '@/types/pokemon/spriteShadows';
import { POKEMON_SPRITE_IDS, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import { NPC_SPRITE_TO_ARCHETYPE_MAP, isNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';

export interface PrecalculatedFeetResult {
  feetY: number;
  feetX: number;
  isFlying: boolean;
  shadowScale: number;
}

export type FeetLookupFn = (fullPath: string) => PrecalculatedFeetResult;

const GEN1_MAX_DEX = 151;
const GEN2_MAX_DEX = 251;
const GEN3_MAX_DEX = 386;
const GEN4_MAX_DEX = 493;
const GEN5_MAX_DEX = 649;
const GEN6_MAX_DEX = 721;
const GEN7_MAX_DEX = 809;
const GEN8_MAX_DEX = 905;
const GEN9_NUMBER = 9;

function getPokemonGen(dexNumber: number): number {
  if (dexNumber <= GEN1_MAX_DEX) return 1;
  if (dexNumber <= GEN2_MAX_DEX) return 2;
  if (dexNumber <= GEN3_MAX_DEX) return 3;
  if (dexNumber <= GEN4_MAX_DEX) return 4;
  if (dexNumber <= GEN5_MAX_DEX) return 5;
  if (dexNumber <= GEN6_MAX_DEX) return 6;
  if (dexNumber <= GEN7_MAX_DEX) return 7;
  if (dexNumber <= GEN8_MAX_DEX) return 8;
  return GEN9_NUMBER;
}

function getCanonicalSpeciesMap(): Map<number, string> {
  const map = new Map<number, string>();
  for (const [speciesName, num] of Object.entries(POKEMON_SPRITE_IDS)) {
    const dexNum = parseInt(String(num), 10);
    if (!isNaN(dexNum) && !map.has(dexNum)) {
      map.set(dexNum, speciesName);
    }
  }
  return map;
}

function resolveAnimPath(
  pGroup: Record<string, readonly number[]>,
  view: 'Front' | 'Back',
  shinyFolderSuffix: string,
  numVal: number,
  suffix: string = ''
): string {
  const animSubKey = `animated/${view}${shinyFolderSuffix}/${numVal}i${suffix}`;
  const baseAnimSubKey = `animated/${view}/${numVal}i${suffix}`;
  const hasAnim = Object.hasOwn(pGroup, animSubKey) || Object.hasOwn(pGroup, baseAnimSubKey);
  return hasAnim
    ? `/assets/sprites/pokemon/${animSubKey}.webp`
    : `/assets/sprites/pokemon/${view}${shinyFolderSuffix}/${numVal}${suffix}.webp`;
}

function buildPokemonEntities(
  pGroup: Record<string, readonly number[]>,
  isShiny: boolean,
  getPrecalculatedFeet: FeetLookupFn
): EditorEntity[] {
  const list: EditorEntity[] = [];
  const canonicalSpeciesMap = getCanonicalSpeciesMap();
  const sortedDexNumbers = Array.from(canonicalSpeciesMap.keys()).sort((a, b) => a - b);
  const shinyFolderSuffix = isShiny ? ' shiny' : '';

  for (const numVal of sortedDexNumbers) {
    const speciesName = canonicalSpeciesMap.get(numVal)!;
    let validSpeciesId;
    try {
      validSpeciesId = requirePokemonSpeciesId(speciesName);
    } catch {
      continue;
    }

    const gen = getPokemonGen(numVal);
    const paddedDex = String(numVal).padStart(3, '0');
    const baseName = `#${paddedDex} ${speciesName.toUpperCase()}`;

    // Front (M / Base)
    const frontPath = resolveAnimPath(pGroup, 'Front', shinyFolderSuffix, numVal);
    const frontCoords = getPrecalculatedFeet(frontPath);
    list.push({
      key: frontPath,
      category: 'pokemon',
      name: baseName,
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

    // Back (M / Base)
    const backPath = resolveAnimPath(pGroup, 'Back', shinyFolderSuffix, numVal);
    const backCoords = getPrecalculatedFeet(backPath);
    list.push({
      key: backPath,
      category: 'pokemon',
      name: baseName,
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

    // Check Female Variant
    const femaleFrontSubKey = `animated/Front${shinyFolderSuffix}/${numVal}i_f`;
    const baseFemaleFrontSubKey = `animated/Front/${numVal}i_f`;
    const hasFemaleFrontAnim = Object.hasOwn(pGroup, femaleFrontSubKey) || Object.hasOwn(pGroup, baseFemaleFrontSubKey);

    if (hasFemaleFrontAnim) {
      const femaleFrontPath = `/assets/sprites/pokemon/${femaleFrontSubKey}.webp`; // asset-url-ok: dev sprite catalog key
      const femaleFrontCoords = getPrecalculatedFeet(femaleFrontPath);
      list.push({
        key: femaleFrontPath,
        category: 'pokemon',
        name: `${baseName} ♀`,
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
        list.push({
          key: femaleBackPath,
          category: 'pokemon',
          name: `${baseName} ♀`,
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

  return list;
}

function buildNpcEntities(
  nGroup: Record<string, readonly number[]>,
  getPrecalculatedFeet: FeetLookupFn
): EditorEntity[] {
  const list: EditorEntity[] = [];
  const npcSpriteNames = Object.keys(nGroup).sort();

  for (const name of npcSpriteNames) {
    const fullPath = `/assets/sprites/npc/${name}.webp`; // asset-url-ok: dev sprite catalog key
    const baseCoords = getPrecalculatedFeet(fullPath);
    const validNpcId = isNpcSpriteId(name) ? name : undefined;
    const archetype = validNpcId ? NPC_SPRITE_TO_ARCHETYPE_MAP[validNpcId] : 'cientifico';

    list.push({
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

  return list;
}

function buildTrainerEntities(
  tGroup: Record<string, readonly number[]>,
  getPrecalculatedFeet: FeetLookupFn
): EditorEntity[] {
  const list: EditorEntity[] = [];
  const trainerSpriteNames = Object.keys(tGroup).sort();

  for (const name of trainerSpriteNames) {
    const fullPath = `/assets/sprites/trainers/${name}.webp`; // asset-url-ok: dev sprite catalog key
    const baseCoords = getPrecalculatedFeet(fullPath);
    const parsed = parseTrainerSpriteKey(name);
    if (!parsed) continue; // Excludes avatar icons

    list.push({
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

  return list;
}

export function buildFullEditorCatalog(
  feetData: { p?: object; n?: object; t?: object },
  isShiny: boolean,
  getPrecalculatedFeet: FeetLookupFn
): EditorEntity[] {
  const pGroup = (feetData.p ?? {}) as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container
  const nGroup = (feetData.n ?? {}) as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container
  const tGroup = (feetData.t ?? {}) as Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container

  const pokes = buildPokemonEntities(pGroup, isShiny, getPrecalculatedFeet);
  const npcs = buildNpcEntities(nGroup, getPrecalculatedFeet);
  const trainers = buildTrainerEntities(tGroup, getPrecalculatedFeet);

  const seenKeys = new Set<string>();
  const merged: EditorEntity[] = [];

  for (const entity of [...pokes, ...npcs, ...trainers]) {
    if (!seenKeys.has(entity.key)) {
      seenKeys.add(entity.key);
      merged.push(entity);
    }
  }

  return merged;
}
