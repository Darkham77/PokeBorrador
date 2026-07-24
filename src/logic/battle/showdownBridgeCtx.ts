import type { BattleContext } from '../../types/battle/battleContext.ts';
import type { Pokemon } from '../../types/pokemon/pokemon.ts';

/** Contexto inmutable que se pasa a cada sub-handler de showdownBridge. */
export interface SBCtx {
  store: BattleContext;
  type: string;
  parts: string[];
  line: string;
  p: Pokemon;
  e: Pokemon;
  turnLogs?: string[];
  getSide: (rawId: string) => 'player' | 'enemy' | null;
  getPoke: (rawId: string) => Pokemon | null;
  playerSide?: string;
}
