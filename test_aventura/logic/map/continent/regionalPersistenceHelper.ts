/**
 * src/logic/map/continent/regionalPersistenceHelper.ts
 *
 * STORAGE & JSON SERIALIZATION ENGINE FOR REGIONAL CONTINENT STUDIO
 */

import type { POINode, RouteEdge } from '../../../types/map/poiTypes.ts';

export const STORAGE_PROJECT_PREFIX = 'pokevicio_continent_project_';
export const STORAGE_PROFILES_KEY = 'pokevicio_continent_profiles_v3';

export interface SavedProfileMeta {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: number;
}

export interface ContinentProjectExportPayload {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: number;
  readonly seed: number;
  readonly mapDimension: number;
  readonly oceanWaterPercentage: number;
  readonly mountainPercentage: number;
  readonly lakeCount: number;
  readonly poiTargetCount: number;
  readonly allowBridges: boolean;
  readonly pois: readonly POINode[];
  readonly routes: readonly RouteEdge[];
}

export function loadProfileListFromStorage(): SavedProfileMeta[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PROFILES_KEY);
    return raw ? (JSON.parse(raw) as SavedProfileMeta[]) : [];
  } catch {
    return [];
  }
}

export function saveProjectToStorage(payload: ContinentProjectExportPayload): SavedProfileMeta[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    window.localStorage.setItem(STORAGE_PROJECT_PREFIX + payload.id, JSON.stringify(payload));
    const meta: SavedProfileMeta = {
      id: payload.id,
      name: payload.name,
      updatedAt: payload.updatedAt
    };
    const currentList = loadProfileListFromStorage().filter((p) => p.id !== payload.id);
    currentList.unshift(meta);
    window.localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(currentList));
    return currentList;
  } catch (e) {
    console.error('[regionalPersistenceHelper] Error saving project:', e);
    return [];
  }
}

export function loadProjectFromStorage(id: string): ContinentProjectExportPayload | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PROJECT_PREFIX + id);
    return raw ? (JSON.parse(raw) as ContinentProjectExportPayload) : null;
  } catch {
    return null;
  }
}

export function deleteProjectFromStorage(id: string): SavedProfileMeta[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    window.localStorage.removeItem(STORAGE_PROJECT_PREFIX + id);
    const nextList = loadProfileListFromStorage().filter((p) => p.id !== id);
    window.localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(nextList));
    return nextList;
  } catch {
    return [];
  }
}

export function serializeProjectJson(payload: ContinentProjectExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function parseProjectJson(jsonStr: string): ContinentProjectExportPayload | null {
  try {
    const payload = JSON.parse(jsonStr) as ContinentProjectExportPayload;
    if (!payload || !payload.pois || !payload.routes) return null;
    return payload;
  } catch {
    return null;
  }
}

