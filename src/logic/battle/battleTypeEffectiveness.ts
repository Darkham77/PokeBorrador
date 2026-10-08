import { isPokemonType, TYPE_CHART } from '../../data/battle/types.ts';
import type { PurePokemon } from './battleMathTypes.ts';

const DELTA_STREAM_WEAKNESS_SET: ReadonlySet<string> = new Set(['electric', 'ice', 'rock']); // runtime-set: Fast O(1) membership lookup set

function getTypeEff(moveType: string | undefined, defType: string | undefined, scrapy = false): number {
  if (!moveType || !defType) return 1;
  const mType = isPokemonType(moveType) ? moveType : null;
  const dType = isPokemonType(defType) ? defType : null;
  if (!mType || !dType) return 1;

  if (scrapy && dType === 'ghost' && (mType === 'normal' || mType === 'fighting')) {
    return 1;
  }

  const row = TYPE_CHART[mType];
  if (!row) return 1;
  const mult = row[dType];
  return mult !== undefined ? mult : 1;
}

export function getCombinedEff(
  moveType: string,
  defender: PurePokemon,
  attacker: PurePokemon | null = null,
  _weather: string | null = null
): number {
  const scrapy = attacker?.ability === 'scrappy';
  let eff = getTypeEff(moveType, defender.type, scrapy);
  if (defender.type2) eff *= getTypeEff(moveType, defender.type2, scrapy);

  return eff;
}

export function calculateDeltaStreamTypeEff(
  eff: number,
  defender: PurePokemon,
  moveType: string,
  isStrongWinds: boolean
): number {
  if (isStrongWinds && (defender.type === 'flying' || defender.type2 === 'flying')) {
    if (eff > 1 && DELTA_STREAM_WEAKNESS_SET.has(moveType)) {
      return eff / 2;
    }
  }
  return eff;
}

export function getEffectivenessPresentation(eff: number): { value: number; label: string; class: string } {
  let effLabel = 'Neutro';
  let effClass = 'neutral';
  if (eff > 1) {
    effLabel = 'Súper eficaz';
    effClass = 'boosted';
  } else if (eff < 1 && eff > 0) {
    effLabel = 'Poco eficaz';
    effClass = 'penalized';
  } else if (eff === 0) {
    effLabel = 'Inmune';
    effClass = 'penalized';
  }
  return { value: eff, label: effLabel, class: effClass };
}
