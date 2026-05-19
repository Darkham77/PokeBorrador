/**
 * src/logic/environment/bushLibrary.ts
 * 
 * BIBLIOTECA DINÁMICA DE COBERTURAS AMBIENTALES (EX-ARBUSTOS)
 * 
 * Encapsula la lógica pura de selección por bioma y doble tirada de dados
 * utilizando un PRNG determinista (mulberry32).
 */

import { BUSH_FAMILIES, type BushFamily } from './bushCatalog';
import { FIRE_RED_MAPS } from '@/data/maps';
import { mulberry32 } from '../utils/math.ts';




export { BUSH_FAMILIES, type BushFamily };


export interface ResolvedBushConfig {
  id: number;
  cls: string;
  assetId: string;    // ej. 'grass-2', 'box-1', 'rock-3'
  family: BushFamily; // 'grass' | 'box' | 'rock'
  tintClass: string;  // 'tint-desert', 'tint-swamp', 'tint-arctic', o ''
  randomScale: number;
  flip: number;
  offsetX: number;
  tx: number;
  ty: number;
  ad: string;
  ay: string;
}

interface BiomeBushWeights {
  weights: Record<BushFamily, number>;
  tint?: string;
}

export const BIOME_BUSH_CONFIG: Record<string, BiomeBushWeights> = {
  isCave:     { weights: { rock: 100, grass: 0,  box: 0 } },
  isVolcanic: { weights: { rock: 100, grass: 0,  box: 0 } },
  isUrban:    { weights: { box: 100,  grass: 0,  rock: 0 } },
  isIndoors:  { weights: { box: 100,  grass: 0,  rock: 0 } },
  isArctic:   { weights: { rock: 95,  grass: 5,  box: 0 }, tint: 'tint-arctic' },
  isDesert:   { weights: { rock: 95,  grass: 5,  box: 0 }, tint: 'tint-desert' },
  isSwamp:    { weights: { grass: 95, rock: 5,  box: 0 }, tint: 'tint-swamp' },
  isMountain: { weights: { rock: 95,  grass: 5,  box: 0 } },
  isCoastal:  { weights: { rock: 70,  grass: 30, box: 0 } },
  isForest:   { weights: { grass: 80, rock: 20, box: 0 } },
  isPlains:   { weights: { grass: 95, rock: 5,  box: 0 } }
};



export function getActiveBushesForMap(
  locationId: string,
  layer: 'front' | 'back',
  sessionSeed: number,
  baseBushes: Array<{ id: number; cls: string; scale: number; tx: number; ty: number; ad: string; ay: string }>
): ResolvedBushConfig[] {
  // 1. Encontrar mapa y resolver bioma activo según jerarquía
  const map = FIRE_RED_MAPS.find(m => m.id === locationId);
  let activeBiomeKey = 'isPlains';

  if (map) {
    const hierarchy = [
      'isCave', 'isVolcanic', 'isUrban', 'isIndoors',
      'isArctic', 'isDesert', 'isSwamp', 'isMountain',
      'isCoastal', 'isForest', 'isPlains'
    ];
    for (const key of hierarchy) {
      if ((map as Record<string, unknown>)[key]) {
        activeBiomeKey = key;
        break;
      }
    }
  }

  const defaultWeights: BiomeBushWeights = { weights: { grass: 95, rock: 5, box: 0 } };
  const biomeConfig = BIOME_BUSH_CONFIG[activeBiomeKey] ?? BIOME_BUSH_CONFIG['isPlains'] ?? defaultWeights;

  // 2. Iterar sobre los arbustos base y realizar la doble tirada de dados
  return baseBushes.map(b => {
    // Semilla combinada única por arbusto y capa
    const layerOffset = layer === 'front' ? 1000 : 2000;
    const prng = mulberry32(sessionSeed ^ (b.id * 1313) ^ layerOffset);

    // Tirada 1: Elegir familia según pesos
    const roll1 = prng() * 100; // [0, 100)
    let selectedFamily: BushFamily = 'grass';
    let cumulative = 0;

    for (const family of ['grass', 'box', 'rock'] as const) {
      cumulative += biomeConfig.weights[family];
      if (roll1 < cumulative) {
        selectedFamily = family;
        break;
      }
    }

    // Tirada 2: Elegir asset específico dentro de la familia elegida
    const assets = BUSH_FAMILIES[selectedFamily];
    const roll2 = Math.floor(prng() * assets.length);
    const assetId = assets[roll2] ?? assets[0] ?? 'grass-1';

    // Tinte aplicable solo si el asset es de la familia pastos
    const tintClass = (selectedFamily === 'grass' && biomeConfig.tint) ? biomeConfig.tint : '';

    // Transformaciones aleatorias deterministas
    const scaleFactor = 0.7 + (prng() * 0.6) + (b.id * 0.05);
    const flip = prng() < 0.5 ? -1 : 1;
    const offsetX = Math.floor(prng() * 20) - 10;

    return {
      ...b,
      assetId,
      family: selectedFamily,
      tintClass,
      randomScale: scaleFactor,
      flip,
      offsetX
    };
  });
}

