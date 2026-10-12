import { PDEX_ORDER } from '../pokemon/pokedex.ts';

import type { FactionId } from '@/types/system/game.ts';

export const ACTIVE_GENERATION = 9;
export const ACTIVE_SHOWDOWN_FORMAT = ACTIVE_GENERATION < 5 ? `gen${ACTIVE_GENERATION}customgame` : `gen${ACTIVE_GENERATION}customgame@@@!Team Preview`;

export const FACTIONS: Record<'UNION' | 'POWER', FactionId> = {
  UNION: 'union',
  POWER: 'poder'
} as const;


export const ENABLED_POKEMON_IDS = [
  ...PDEX_ORDER,
  'pichu',
  'cleffa',
  'igglybuff',
  'togepi',
  'tyrogue',
  'smoochum',
  'elekid',
  'magby',
  'castform',
  'castformsunny',
  'castformrainy',
  'castformsnowy'
] as const;

export type EnabledPokemonId = (typeof ENABLED_POKEMON_IDS)[number];
export const ENABLED_POKEMON_IDS_SET: ReadonlySet<string> = new Set(ENABLED_POKEMON_IDS);

export function isEnabledPokemonId(id: string): id is EnabledPokemonId {
  return ENABLED_POKEMON_IDS_SET.has(id);
}

export const STARTER_POKEMON_IDS = [
  'bulbasaur',
  'charmander',
  'squirtle'
] as const;

export type StarterPokemonId = (typeof STARTER_POKEMON_IDS)[number];
export const STARTER_POKEMON_IDS_SET: ReadonlySet<string> = new Set(STARTER_POKEMON_IDS);


export const MAX_POKEMON_LEVEL = 100;
export const MAX_BATTLE_TURNS = 300;
/**
 * Effective duration of the volatile state Disable in Pokémon Showdown (Gen 5-9).
 * Source of truth: `external/pokemon-showdown-code/sim/data/moves.ts` (line 3664: `duration: 5`, decremented to 4 on `onStart` when the target has not yet acted in that turn).
 */
export const SHOWDOWN_DISABLE_DURATION_TURNS = 4;

/**
 * Wait duration in seconds during rewards phase in auto-battle mode
 * after log queue finishes, to allow reading results before the next battle.
 * Uses GSAP timeline (gsapSleep) to scale with timeScale(100) in simulations.
 */
export const AUTO_BATTLE_REWARDS_DELAY_SEC = 1.5;

/**
 * Wait duration in seconds to read NPC/Trainer dialogue during auto-battle mode
 * before automatically starting the encounter.
 * Uses GSAP timeline (gsap.delayedCall / gsapSleep) to scale with timeScale(100) in simulations.
 */
export const AUTO_BATTLE_NPC_DIALOG_DELAY_SEC = 3.0;


export interface GameRatiosConfig {
  maxPokemonLevel: number;
  shinyRate: number;
  encounters: {
    rival: number;
    fishing: number;
    legendaryArticuno: number;
    legendaryMewtwo: number;
    trainerBase: number;
    trainerMax: number;
    trainerIncrement: number;
    trainerRepel: number;
  };
  battle: {
    catchFormulaParams: {
      catchBaseMultiplier: number;
    };
  };
  gym: {
    rematchTMRateNormal: number;
    rematchTMRateHard: number;
  };
  heldItems: {
    commonRate: number;
    rareRate: number;
  };
}

export const GAME_RATIOS: GameRatiosConfig = {
  // --- Pokémon Level ---
  maxPokemonLevel: MAX_POKEMON_LEVEL,

  // --- Shiny ---
  // Shiny encounter rate. 2000 means 1 in 2000 chance.
  shinyRate: 3000,

  // --- Encounters ---
  encounters: {
    rival: 0.001,              // 0.1% chance for a Rival encounter on any map
    fishing: 0.10,            // 10% chance for a fishing encounter when on a map with water
    legendaryArticuno: 0.01,  // 1% chance to encounter Articuno in Seafoam Islands if ticket is active
    legendaryMewtwo: 0.001,    // 0.1% chance to encounter Mewtwo in Cerulean Cave if ticket is active

    // Trainer normal encounters
    trainerBase: 5,           // Base % chance for trainer encounter (increases with pity timer)
    trainerMax: 20,           // Maximum % chance for trainer encounter (pity limit)
    trainerIncrement: 5,      // % added to trainer chance every 2 minutes

    // Trainer guaranteed encounters (Repel)
    trainerRepel: 0.30        // 30% chance for trainer encounter when Repel is active (guaranteed encounter logic)
  },

  // --- Battle ---
  battle: {
    catchFormulaParams: {
      catchBaseMultiplier: 1.0, // A multiplier applied to the catch rate.
    }
  },
  
  // --- Gym ---
  gym: {
    rematchTMRateNormal: 0.03, // 3% chance for TM on Normal rematch
    rematchTMRateHard: 0.05    // 5% chance for TM on Hard rematch
  },

  // --- Held Items ---
  heldItems: {
    commonRate: 0.50,         // 50% chance for common wild held item
    rareRate: 0.05            // 5% chance for rare wild held item
  }
};

// ── Stat stage multipliers (2/N to N/2) ─────────────────────────
// Index 6 = stage 0 (neutral)
export const STAGE_MULT = [0.25, 0.28, 0.33, 0.40, 0.50, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];

// ── Accuracy/Evasion multipliers (3/N to N/3) ───────────────────
export const ACC_STAGE_MULT = [0.33, 0.37, 0.43, 0.50, 0.60, 0.75, 1, 1.33, 1.66, 2, 2.33, 2.66, 3];
