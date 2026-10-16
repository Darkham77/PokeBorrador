/**
 * src/logic/map/continent/regionalPersistenceHelper.ts
 *
 * STORAGE & JSON SERIALIZATION ENGINE FOR REGIONAL CONTINENT STUDIO
 */

import type { POINode, RouteEdge } from '../../../types/map/poiTypes.ts';

const STORAGE_PROJECT_PREFIX = 'pokevicio_continent_project_';
const STORAGE_PROFILES_KEY = 'pokevicio_continent_profiles_v3';

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
    // catch-ok: Fallback to empty array when storage is blocked or corrupted
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
    // catch-ok: Fallback to null when project data in storage is malformed
    return null;
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
    // catch-ok: Fallback to null when external json payload is invalid
    return null;
  }
}
