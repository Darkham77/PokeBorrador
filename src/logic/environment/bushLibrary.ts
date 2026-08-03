/**
 * src/logic/environment/bushLibrary.ts
 * 
 * BIBLIOTECA DINÁMICA DE COBERTURAS AMBIENTALES (EX-ARBUSTOS)
 * 
 * Encapsula la lógica pura de selección por bioma y doble tirada de dados
 * utilizando un PRNG determinista (mulberry32).
 */

import { BUSH_FAMILIES, type BushFamily } from './bushCatalog.ts';
import { FIRE_RED_MAPS } from '../../data/world/maps.ts';
import { mulberry32 } from '../utils/math.ts';
import type { MapLocation } from '@/types/pokemon/encounters';

export { BUSH_FAMILIES, type BushFamily };

export type BushAnimationType = 'bush' | 'tree' | 'none';

export const BUSH_ANIMATION_MAPPING: Record<string, BushAnimationType> = {
  bush: 'bush',
  bushflower: 'bush',
  cactus: 'tree',
  fern: 'tree',
  treebroken: 'tree',
  rock: 'none',
  box: 'none'
};

export function getAnimationTypeForFamily(family: string): BushAnimationType {
  const mapped = BUSH_ANIMATION_MAPPING[family];
  if (mapped) return mapped;
  const lower = family.toLowerCase(); // text-ok
  if (lower.startsWith('rock') || lower.startsWith('box') || lower.startsWith('crystal')) {
    return 'none';
  }
  if (lower.startsWith('tree') || lower.startsWith('fern') || lower.startsWith('cactus')) {
    return 'tree';
  }
  return 'bush';
}

export interface ResolvedBushConfig {
  id: number;
  cls: string;
  assetId: string;    // ej. 'bush-1', 'cactus-2', 'rock-1'
  family: BushFamily; // La familia seleccionada dinámicamente del catálogo
  animationType: BushAnimationType; // Tipo de animación
  tintClass: string;  // 'tint-desert', 'tint-swamp', 'tint-arctic', 'tint-cave', o ''
  randomScale: number;
  flip: number;
  offsetX: number;
  tx: number;
  ty: number;
  ad: string;
  ay: string;
}

interface BiomeBushWeights {
  weights: Record<string, number>;
  tint?: {
    class: string;
    families?: string[];
  };
}

export const BIOME_BUSH_CONFIG: Record<string, BiomeBushWeights> = {
  isCrystalCave: {
    weights: {
      rock: 90,
      crystalblack: 1,
      crystalblue: 1,
      crystaldarkred: 1,
      crystalgreen: 1,
      crystalpink: 1,
      crystalred: 1,
      crystalviolet: 1,
      crystalwhite: 1,
      crystalyellow: 1,
      crystalyellowgreen: 1
    },
    tint: { class: 'tint-cave', families: ['rock'] }
  },
  isCave:     { 
    weights: { rock: 100 }, 
    tint: { class: 'tint-cave', families: ['rock'] } 
  },
  isVolcanic: { weights: { rock: 100 } },
  isUrban:    { weights: { box: 100 } },
  isIndoors:  { weights: { box: 100 } },
  isArctic:   { 
    weights: { rock: 90, bushsnow: 10 }, 
    tint: { class: 'tint-arctic', families: ['rock'] } 
  },
  isDesert:   { 
    weights: { rock: 70, cactus: 25, grass: 5 }, 
    tint: { class: 'tint-desert', families: ['rock'] } 
  },
  isSwamp:    { 
    weights: { bush: 35, fern: 35, grass: 5, grassflower: 15, treebroken: 10 }, 
    tint: { class: 'tint-swamp' } 
  },
  isMountain: { weights: { rock: 60, treebroken: 10, grass: 15, bush: 15 } },
  isCoastal:  { weights: { rock: 50, bush: 30, grass: 10 , grassflower: 10} },
  isForest:   { weights: { bush: 40, bushflower: 15, grassflower: 5, grass: 10, fern: 20, rock: 10, treebroken: 10 } },
  isPlains:   { weights: { bush: 30, bushflower: 5, grassflower: 5, grass: 35, fern: 15, rock: 10 } }
};

const MAP_BIOME_KEYS = [
  'isArctic', 'isIndoors', 'isUrban', 'isVolcanic', 'isCrystalCave', 'isCave',
  'isDesert', 'isSwamp', 'isMountain',
  'isCoastal', 'isForest', 'isPlains'
] as const satisfies readonly (keyof MapLocation)[];

export function isBushFamily(val: string): val is BushFamily {
  return (Object.keys(BUSH_FAMILIES) as readonly string[]).includes(val); // domain-ok
}

export function getBiomeConfigForMap(locationId: string): BiomeBushWeights {
  const map = FIRE_RED_MAPS.find(m => m.id === locationId);
  let activeBiomeKey = 'isPlains';

  if (map) {
    for (const key of MAP_BIOME_KEYS) {
      if (map[key]) {
        activeBiomeKey = key;
        break;
      }
    }
  }

  const defaultWeights: BiomeBushWeights = { weights: { bush: 80, rock: 20 } };
  return BIOME_BUSH_CONFIG[activeBiomeKey] ?? BIOME_BUSH_CONFIG['isPlains'] ?? defaultWeights;
}

/**
 * Normaliza las propiedades de un arbusto aplicando la doble tirada de dados
 * determinista basada en sessionSeed y layer.
 */
export function resolveBushesForLayer(
  baseBushes: Array<{ id: number; cls: string; tx: number; ty: number; ad: string; ay: string }>,
  sessionSeed: number,
  layer: 'front' | 'back',
  mapId: string
): ResolvedBushConfig[] {
  const biomeConfig = getBiomeConfigForMap(mapId);

  // 2. Iterar sobre los arbustos base y realizar la doble tirada de dados
  return baseBushes.map(b => {
    // Semilla combinada única por arbusto y capa
    const layerOffset = layer === 'front' ? 1000 : 2000;
    const prng = mulberry32(sessionSeed ^ (b.id * 1313) ^ layerOffset);

    // Tirada 1: Elegir familia dinámica según los pesos del bioma actual
    const activeWeights = biomeConfig.weights;
    const availableFamilies = Object.keys(activeWeights).filter(isBushFamily);

    let selectedFamily: BushFamily = 'bush'; // Fallback por defecto

    let totalWeight = 0;
    for (const fam of availableFamilies) {
      totalWeight += activeWeights[fam] || 0;
    }

    if (totalWeight > 0) {
      const roll = prng() * totalWeight;
      let sum = 0;
      for (const fam of availableFamilies) {
        sum += activeWeights[fam] || 0;
        if (roll < sum) {
          selectedFamily = fam;
          break;
        }
      }
    } else {
      // Fallback: Elegir cualquier familia que exista en el catálogo
      const allFamilies = Object.keys(BUSH_FAMILIES).filter(isBushFamily);
      selectedFamily = allFamilies[Math.floor(prng() * allFamilies.length)] ?? 'bush';
    }

    // Tirada 2: Elegir un asset específico dentro de la familia elegida
    const assets = BUSH_FAMILIES[selectedFamily];
    const roll2 = Math.floor(prng() * assets.length);
    const assetId = assets[roll2] ?? assets[0] ?? 'grass-1';

    // Tinte aplicable según configuración del bioma y familia de la cobertura
    let tintClass = '';
    if (biomeConfig.tint) {
      const tintConf = biomeConfig.tint;
      if (!tintConf.families || tintConf.families.includes(selectedFamily)) {
        tintClass = tintConf.class;
      }
    }

    // Transformaciones aleatorias deterministas
    const scaleFactor = 0.7 + (prng() * 0.6) + (b.id * 0.05);
    const flip = prng() < 0.5 ? -1 : 1;
    const offsetX = Math.floor(prng() * 20) - 10;

    return {
      ...b,
      assetId,
      family: selectedFamily,
      animationType: getAnimationTypeForFamily(selectedFamily),
      tintClass,
      randomScale: scaleFactor,
      flip,
      offsetX
    };
  });
}

export function getActiveBushesForMap(
  locationId: string,
  layer: 'front' | 'back',
  sessionSeed: number,
  baseBushes: Array<{ id: number; cls: string; scale?: number; tx?: number; ty?: number; ad?: string; ay?: string }>
): ResolvedBushConfig[] {
  return resolveBushesForLayer(baseBushes as Array<{ id: number; cls: string; tx: number; ty: number; ad: string; ay: string }>, sessionSeed, layer, locationId);
}
