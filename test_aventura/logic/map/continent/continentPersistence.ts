/**
 * src/logic/map/continent/continentPersistence.ts
 *
 * CONTINENTAL PROJECT PERSISTENCE & REGIONAL PRESETS
 * Manages profile serialization in LocalStorage with in-memory fallback for testing,
 * and provides canonical region templates (Kanto, Johto, Archipelago, Glacial).
 */

import type {
  ContinentProject,
  ContinentDimensions,
  ContinentGenConfig,
  BiomeDistributionConfig,
  CanonicalPresetId,
  ContinentNode
} from '../../../types/map/continentTypes';
import { generateContinent } from './continentalEngine.ts';

export const CONTINENT_SCHEMA_VERSION = 3;
export const STORAGE_KEY_PROFILES = 'pokevicio_continent_projects_v3';
export const LEGACY_STORAGE_KEY_PROFILES = 'pokevicio_continent_projects_v2';

// In-memory fallback map for Node testing environment
const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      // ignore
    }
  }
  return memoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      // ignore
    }
  }
  memoryStore.set(key, value);
}

function removeStorageItem(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
      return;
    } catch {
      // ignore
    }
  }
  memoryStore.delete(key);
}

export const CANONICAL_PRESETS: Record<
  CanonicalPresetId,
  {
    readonly name: string;
    readonly dimensions: ContinentDimensions;
    readonly cityCount: number;
    readonly biomes: BiomeDistributionConfig;
    readonly seed: number;
  }
> = {
  kanto: {
    name: 'Región de Kanto (Canónica)',
    dimensions: { width: 3600, height: 4600, tileSize: 32 },
    cityCount: 10,
    biomes: {
      waterPercent: 20,
      forestPercent: 30,
      mountainPercent: 15,
      snowPercent: 5,
      beachPercent: 10
    },
    seed: 151
  },
  johto: {
    name: 'Región de Johto (Canónica)',
    dimensions: { width: 3600, height: 4600, tileSize: 32 },
    cityCount: 10,
    biomes: {
      waterPercent: 15,
      forestPercent: 35,
      mountainPercent: 25,
      snowPercent: 10,
      beachPercent: 5
    },
    seed: 251
  },
  archipelago: {
    name: 'Archipiélago Tropical (Islas)',
    dimensions: { width: 3200, height: 3200, tileSize: 32 },
    cityCount: 8,
    biomes: {
      waterPercent: 55,
      forestPercent: 15,
      mountainPercent: 5,
      snowPercent: 0,
      beachPercent: 25
    },
    seed: 384
  },
  glacial: {
    name: 'Tierras Glaciares (Nieve y Cumbres)',
    dimensions: { width: 3200, height: 3200, tileSize: 32 },
    cityCount: 8,
    biomes: {
      waterPercent: 10,
      forestPercent: 15,
      mountainPercent: 25,
      snowPercent: 45,
      beachPercent: 5
    },
    seed: 493
  }
};

/**
 * Creates an empty blank continent project.
 */
export function createBlankProject(name: string, dimensions?: ContinentDimensions): ContinentProject {
  const dims = dimensions ?? { width: 3200, height: 3200, tileSize: 32 };
  const now = Date.now();
  const id = `project_${now}_${Math.floor(Math.random() * 1000)}`;

  const config: ContinentGenConfig = {
    seed: Math.floor(Math.random() * 999999),
    dimensions: dims,
    cityCount: 6,
    biomes: {
      waterPercent: 20,
      forestPercent: 25,
      mountainPercent: 15,
      snowPercent: 5,
      beachPercent: 10
    },
    roadWidth: 1
  };

  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    config,
    nodes: {},
    connections: [],
    customTerrain: {},
    placedSprites: [],
    schemaVersion: CONTINENT_SCHEMA_VERSION
  };
}

export const CANONICAL_KANTO_NODES: Record<string, ContinentNode> = {
  pallet: { id: 'pallet', name: 'Pueblo Paleta', x: 1250, y: 3500, scale: 'village', amenities: ['center'] },
  viridian: { id: 'viridian', name: 'Ciudad Verde', x: 1250, y: 2750, scale: 'city', amenities: ['center', 'mart'] },
  pewter: { id: 'pewter', name: 'Ciudad Plateada', x: 1250, y: 1000, scale: 'city', amenities: ['center', 'mart'] },
  cerulean: { id: 'cerulean', name: 'Ciudad Celeste', x: 2000, y: 1625, scale: 'city', amenities: ['center', 'mart'] },
  vermilion: { id: 'vermilion', name: 'Ciudad Carmín', x: 2000, y: 3125, scale: 'city', amenities: ['center', 'mart'] },
  lavender: { id: 'lavender', name: 'Pueblo Lavanda', x: 2750, y: 2375, scale: 'town', amenities: ['center', 'mart'] },
  celadon: { id: 'celadon', name: 'Ciudad Azulona', x: 1375, y: 2375, scale: 'metropolis', amenities: ['center', 'mart'] },
  saffron: { id: 'saffron', name: 'Ciudad Azafrán', x: 2000, y: 2375, scale: 'metropolis', amenities: ['center', 'mart'] },
  fuchsia: { id: 'fuchsia', name: 'Ciudad Fucsia', x: 2000, y: 3750, scale: 'city', amenities: ['center', 'mart'] },
  cinnabar: { id: 'cinnabar', name: 'Isla Canela', x: 875, y: 4000, scale: 'town', amenities: ['center', 'mart'] }
};

export const CANONICAL_KANTO_CONNECTIONS: readonly (readonly [string, string])[] = [
  ['pallet', 'viridian'],
  ['viridian', 'pewter'],
  ['pewter', 'cerulean'],
  ['cerulean', 'saffron'],
  ['saffron', 'vermilion'],
  ['saffron', 'celadon'],
  ['saffron', 'lavender'],
  ['cerulean', 'lavender'],
  ['vermilion', 'fuchsia'],
  ['celadon', 'fuchsia'],
  ['fuchsia', 'cinnabar'],
  ['cinnabar', 'pallet']
];

/**
 * Creates and populates a continent project from a canonical preset template.
 */
export function createPresetProject(presetId: CanonicalPresetId): ContinentProject {
  const preset = CANONICAL_PRESETS[presetId];
  const now = Date.now();
  const id = `${presetId}_${now}`;

  const config: ContinentGenConfig = {
    seed: preset.seed,
    dimensions: preset.dimensions,
    cityCount: preset.cityCount,
    biomes: preset.biomes,
    roadWidth: 1,
    presetId
  };

  if (presetId === 'kanto') {
    return {
      id,
      name: preset.name,
      createdAt: now,
      updatedAt: now,
      config,
      nodes: { ...CANONICAL_KANTO_NODES },
      connections: CANONICAL_KANTO_CONNECTIONS.map(([u, v]) => [u, v]),
      customTerrain: {},
      placedSprites: [],
      schemaVersion: CONTINENT_SCHEMA_VERSION
    };
  }

  const genResult = generateContinent(config);

  return {
    id,
    name: preset.name,
    createdAt: now,
    updatedAt: now,
    config,
    nodes: genResult.nodes,
    connections: genResult.connections,
    customTerrain: {},
    placedSprites: [],
    schemaVersion: CONTINENT_SCHEMA_VERSION
  };
}

/**
 * Saves a continent project to storage.
 */
export function saveProjectProfile(project: ContinentProject): void {
  const allProfiles = getAllStoredProjects();
  allProfiles[project.id] = {
    ...project,
    updatedAt: Date.now()
  };
  setStorageItem(STORAGE_KEY_PROFILES, JSON.stringify(allProfiles));
}

/**
 * Loads a continent project by its ID from storage.
 */
export function loadProjectProfile(id: string): ContinentProject | null {
  const allProfiles = getAllStoredProjects();
  return allProfiles[id] ?? null;
}

/**
 * Returns a list of saved project profiles sorted by last updated timestamp.
 */
export function listProjectProfiles(): readonly { id: string; name: string; updatedAt: number }[] {
  const allProfiles = getAllStoredProjects();
  return Object.values(allProfiles)
    .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Deletes a project profile from storage.
 */
export function deleteProjectProfile(id: string): boolean {
  const allProfiles = getAllStoredProjects();
  if (!allProfiles[id]) return false;
  delete allProfiles[id];
  setStorageItem(STORAGE_KEY_PROFILES, JSON.stringify(allProfiles));
  return true;
}

/**
 * Clears all profiles (strictly for test isolation).
 */
export function clearAllProfilesForTesting(): void {
  removeStorageItem(STORAGE_KEY_PROFILES);
  memoryStore.clear();
}

function getAllStoredProjects(): Record<string, ContinentProject> {
  const raw = getStorageItem(STORAGE_KEY_PROFILES);
  if (!raw) {
    const legacyRaw = getStorageItem(LEGACY_STORAGE_KEY_PROFILES);
    if (legacyRaw) {
      removeStorageItem(LEGACY_STORAGE_KEY_PROFILES);
    }
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, ContinentProject>; // open-record: Estructura o identificador procedural de aventura
    const migrated: Record<string, ContinentProject> = {};
    let needsSave = false;

    for (const [id, p] of Object.entries(parsed)) {
      if (!p || (p.schemaVersion ?? 0) < CONTINENT_SCHEMA_VERSION) {
        needsSave = true;
        if (p?.config?.presetId) {
          const fresh = createPresetProject(p.config.presetId);
          migrated[id] = { ...fresh, id, name: p.name || fresh.name };
        } else if (p) {
          migrated[id] = { ...p, schemaVersion: CONTINENT_SCHEMA_VERSION };
        }
      } else {
        migrated[id] = p;
      }
    }

    if (needsSave) {
      setStorageItem(STORAGE_KEY_PROFILES, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return {};
  }
}
