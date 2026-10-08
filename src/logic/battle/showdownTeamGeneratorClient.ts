import type { PokemonSet } from '@pkmn/sim';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getShowdownWorker, preloadShowdownWorker } from './showdownWorkerInstance.ts';

export interface RequestTrainerTeamOptions {
  level: number;
  teamSize: number;
  allowedSpecies: Iterable<PokemonSpeciesId>;
  aceSpeciesId?: PokemonSpeciesId;
}

export interface RequestRivalTeamOptions {
  level: number;
  teamSize: number;
  aceSpeciesId: PokemonSpeciesId;
  allowedSpecies?: Iterable<PokemonSpeciesId>;
}

export const TEAM_GENERATOR_TYPES = ['TRAINER', 'RIVAL'] as const;
export type TeamGeneratorType = (typeof TEAM_GENERATOR_TYPES)[number];

type TeamGeneratorHandler = (type: TeamGeneratorType, payload: unknown) => Promise<PokemonSet[]>;
let teamGeneratorHandler: TeamGeneratorHandler | null = null; // singleton-ok: Singleton instance state container

export function registerTeamGeneratorHandler(handler: TeamGeneratorHandler | null): void {
  teamGeneratorHandler = handler;
}

function cleanWorkerListener(worker: Worker, handler: (e: MessageEvent) => void): void {
  if (worker.removeEventListener) {
    worker.removeEventListener('message', handler);
  } else {
    worker.onmessage = null;
  }
}

export async function requestTrainerTeam(options: RequestTrainerTeamOptions): Promise<PokemonSet[]> {
  if (teamGeneratorHandler) {
    return teamGeneratorHandler('TRAINER', options);
  }
  let worker = getShowdownWorker();
  if (!worker) {
    preloadShowdownWorker();
    worker = getShowdownWorker();
  }
  if (!worker) {
    throw new Error('[ShowdownWorkerClient] showdownWorker is null. Call preloadShowdownWorker or registerTeamGeneratorHandler.');
  }

  const requestId = `tr_${Math.floor(performance.now())}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload?: { requestId: string; team: PokemonSet[]; message?: string } };
      if (data && data.type === 'GENERATE_TRAINER_TEAM_RESPONSE' && data.payload?.requestId === requestId) {
        cleanWorkerListener(worker!, handler);
        resolve(data.payload.team);
      } else if (data && data.type === 'ERROR' && data.payload?.message) {
        cleanWorkerListener(worker!, handler);
        reject(new Error(`[ShowdownWorkerClient] Error generating trainer team: ${data.payload.message}`));
      }
    };
    worker!.addEventListener('message', handler);
    worker!.postMessage({
      type: 'GENERATE_TRAINER_TEAM',
      payload: {
        requestId,
        level: options.level,
        teamSize: options.teamSize,
        allowedSpecies: Array.from(options.allowedSpecies),
        aceSpeciesId: options.aceSpeciesId
      }
    });
  });
}

export async function requestRivalTeam(options: RequestRivalTeamOptions): Promise<PokemonSet[]> {
  if (teamGeneratorHandler) {
    return teamGeneratorHandler('RIVAL', options);
  }
  let worker = getShowdownWorker();
  if (!worker) {
    preloadShowdownWorker();
    worker = getShowdownWorker();
  }
  if (!worker) {
    throw new Error('[ShowdownWorkerClient] showdownWorker is null. Call preloadShowdownWorker or registerTeamGeneratorHandler.');
  }

  const requestId = `riv_${Math.floor(performance.now())}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload?: { requestId: string; team: PokemonSet[]; message?: string } };
      if (data && data.type === 'GENERATE_RIVAL_TEAM_RESPONSE' && data.payload?.requestId === requestId) {
        cleanWorkerListener(worker!, handler);
        resolve(data.payload.team);
      } else if (data && data.type === 'ERROR' && data.payload?.message) {
        cleanWorkerListener(worker!, handler);
        reject(new Error(`[ShowdownWorkerClient] Error generating rival team: ${data.payload.message}`));
      }
    };
    worker!.addEventListener('message', handler);
    worker!.postMessage({
      type: 'GENERATE_RIVAL_TEAM',
      payload: {
        requestId,
        level: options.level,
        teamSize: options.teamSize,
        aceSpeciesId: options.aceSpeciesId,
        allowedSpecies: options.allowedSpecies ? Array.from(options.allowedSpecies) : undefined
      }
    });
  });
}
