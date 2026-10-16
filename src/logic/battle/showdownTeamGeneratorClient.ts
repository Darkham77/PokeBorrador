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

function getOrInitShowdownWorker(): Worker {
  let worker = getShowdownWorker();
  if (!worker) {
    preloadShowdownWorker();
    worker = getShowdownWorker();
  }
  if (!worker) {
    throw new Error(
      '[ShowdownWorkerClient] showdownWorker is null. Call preloadShowdownWorker or registerTeamGeneratorHandler.'
    );
  }
  return worker;
}

function requestWorkerTeam(
  requestType: 'GENERATE_TRAINER_TEAM' | 'GENERATE_RIVAL_TEAM',
  responseType: 'GENERATE_TRAINER_TEAM_RESPONSE' | 'GENERATE_RIVAL_TEAM_RESPONSE',
  idPrefix: string,
  teamLabel: string,
  payloadData: Record<string, unknown> // open-record: Generic key-value data dictionary container
): Promise<PokemonSet[]> {
  const worker = getOrInitShowdownWorker();
  const requestId = `${idPrefix}_${Math.floor(performance.now())}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const data = event.data as {
        type: string;
        payload?: { requestId: string; team: PokemonSet[]; message?: string };
      };
      if (data && data.type === responseType && data.payload?.requestId === requestId) {
        cleanWorkerListener(worker, handler);
        resolve(data.payload.team);
      } else if (data && data.type === 'ERROR' && data.payload?.message) {
        cleanWorkerListener(worker, handler);
        reject(
          new Error(`[ShowdownWorkerClient] Error generating ${teamLabel}: ${data.payload.message}`)
        );
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({
      type: requestType,
      payload: {
        requestId,
        ...payloadData
      }
    });
  });
}

export async function requestTrainerTeam(
  options: RequestTrainerTeamOptions
): Promise<PokemonSet[]> {
  if (teamGeneratorHandler) {
    return teamGeneratorHandler('TRAINER', options);
  }
  return requestWorkerTeam(
    'GENERATE_TRAINER_TEAM',
    'GENERATE_TRAINER_TEAM_RESPONSE',
    'tr',
    'trainer team',
    {
      level: options.level,
      teamSize: options.teamSize,
      allowedSpecies: Array.from(options.allowedSpecies),
      aceSpeciesId: options.aceSpeciesId
    }
  );
}

export async function requestRivalTeam(options: RequestRivalTeamOptions): Promise<PokemonSet[]> {
  if (teamGeneratorHandler) {
    return teamGeneratorHandler('RIVAL', options);
  }
  return requestWorkerTeam(
    'GENERATE_RIVAL_TEAM',
    'GENERATE_RIVAL_TEAM_RESPONSE',
    'riv',
    'rival team',
    {
      level: options.level,
      teamSize: options.teamSize,
      aceSpeciesId: options.aceSpeciesId,
      allowedSpecies: options.allowedSpecies ? Array.from(options.allowedSpecies) : undefined
    }
  );
}
