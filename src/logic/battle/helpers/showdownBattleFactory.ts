// src/logic/battle/helpers/showdownBattleFactory.ts
import { Battle } from '@pkmn/sim';
import { getShowdownFormatId, patchShowdownSpreadModify } from '../showdownAdapter.ts';
import { parseShowdownSeedForBattle } from './seedInitializer.ts';

/**
 * Factory function to create and configure a Showdown Battle instance uniformly
 * for both the web worker and fuzzer/replayer environments.
 */
export function createShowdownBattle(
  format: string,
  seed: string | number[] | null | undefined,
  strictChoices = false
): Battle {
  const genMatch = format.match(/gen(\d+)/);
  const genNum = genMatch ? parseInt(genMatch[1] || '5', 10) : undefined;

  const parsedSeed = parseShowdownSeedForBattle(seed);
  const battle = new Battle({
    formatid: getShowdownFormatId(genNum),
    strictChoices,
    ...(parsedSeed ? { seed: parsedSeed } : {})
  });

  // Apply base stats overrides/patches for Pokemon stats calculation accuracy
  patchShowdownSpreadModify(() => true);

  return battle;
}
