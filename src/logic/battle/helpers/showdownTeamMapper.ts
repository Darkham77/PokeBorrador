// src/logic/battle/helpers/showdownTeamMapper.ts
import type { Battle } from '@pkmn/sim';
import { findPokemonByShowdownName } from '../showdownUidMapper.ts';
import { statsMap } from '../showdownAdapter.ts';

export interface ShowdownRequestPokemon {
  ident?: string;
  uid?: string;
  condition?: string;
  active?: boolean;
  details?: string;
}

export interface ShowdownRequest {
  side?: {
    pokemon: ShowdownRequestPokemon[];
  };
}

export interface CustomPokemonSet {
  name: string;
  species: string;
  stats?: Record<string, number>;
  uid?: string;
}

export class ShowdownTeamMapper {
  /**
   * Populates statsMap from sets to ensure Showdown patches can access pre-calculated stats.
   */
  static populateStatsMap(
    team: Array<{ name?: string; species: string; stats?: Record<string, number> | null } | null> | null | undefined
  ): void {
    if (!team) return;
    team.forEach(set => {
      if (set && set.stats) {
        statsMap.set(set.name || set.species, set.stats);
      }
    });
  }

  /**
   * Synchronizes simulator side's Pokemon UIDs into active request side's Pokemon array.
   * This is required because Showdown does not natively persist custom client-side UIDs.
   */
  static injectUidsIntoRequest(
    battle: Battle | null,
    player: 'p1' | 'p2',
    req: ShowdownRequest | null | undefined
  ): ShowdownRequest | null {
    if (!req) return null;
    if (req.side && Array.isArray(req.side.pokemon)) {
      const simulatorPokemon = (battle?.[player] as unknown as { pokemon?: Array<{ uid?: string }> })?.pokemon || [];
      const assignedUids = new Set<string>();

      req.side.pokemon.forEach((reqMon) => {
        if (reqMon && reqMon.ident) {
          const cleanIdent = reqMon.ident.replace(/^(p1a|p2a|p1|p2):\s*/, '').trim().toLowerCase();
          const availableMons = simulatorPokemon.filter(p => p && p.uid && !assignedUids.has(p.uid));
          const matched = findPokemonByShowdownName(cleanIdent, availableMons);
          if (matched && matched.uid) {
            reqMon.uid = matched.uid;
            assignedUids.add(reqMon.uid);
          } else {
            throw new Error(`[ShowdownTeamMapper] No UID found on simulator Pokemon instance: ${reqMon.ident}`);
          }
        }
      });
    }
    return req;
  }
}
