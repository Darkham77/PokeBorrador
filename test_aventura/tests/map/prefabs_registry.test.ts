/**
 * tests/node/map/prefabs_registry.test.ts
 *
 * Tier 1 Unit Test: Validates PrefabsRegistryService O(1) lookups,
 * manifest loading, categorization, and stamp engine contract compliance.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { PrefabsRegistryService } from '../../logic/map/prefabsRegistry';
import type { PrefabsManifest } from '../../logic/map/prefabsRegistry';

describe('PrefabsRegistryService', () => {
  let service: PrefabsRegistryService;

  const mockManifest: PrefabsManifest = {
    version: '2.0.0',
    generatedAt: '2026-09-07T07:25:34.067Z',
    totalPrefabs: 3,
    categories: {
      buildings: 1,
      vegetation: 1,
      props: 1,
      elevation: 0,
      infrastructure: 0
    },
    prefabs: [
      {
        id: 'house_blue',
        name: 'Casa (blue)',
        category: 'buildings',
        width: 80,
        height: 56,
        file_path: '/assets/studio/kanto/prefabs/house_blue.png',
        source: 'pokegba_clean'
      },
      {
        id: 'tree_poke',
        name: 'Árbol Kanto (GBA)',
        category: 'vegetation',
        width: 32,
        height: 48,
        file_path: '/assets/studio/kanto/prefabs/tree_poke.png',
        source: 'pokegba_clean'
      },
      {
        id: 'street_lamp',
        name: 'Farola Urbana',
        category: 'props',
        width: 16,
        height: 48,
        file_path: '/assets/studio/kanto/prefabs/street_lamp.png',
        source: 'pokegba_clean'
      }
    ]
  };

  beforeEach(() => {
    service = new PrefabsRegistryService();
  });

  it('initializes with fallback prefabs before manifest is loaded', () => {
    const all = service.getAllPrefabs();
    expect(all.length).toBeGreaterThan(0);
    expect(service.getPrefabById('house_blue')).toBeDefined();
    expect(service.getPrefabById('tree_poke')).toBeDefined();
  });

  it('loads manifest and updates O(1) registries cleanly', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => mockManifest
    } as unknown as Response);

    try {
      const loaded = await service.loadManifest('/mock/manifest.json');
      expect(loaded).not.toBeNull();
      expect(loaded?.version).toBe('2.0.0');
      expect(service.getAllPrefabs().length).toBe(3);

      const house = service.getPrefabById('house_blue');
      expect(house).toBeDefined();
      expect(house?.category).toBe('buildings');
      expect(house?.width).toBe(80);
      expect(house?.height).toBe(56);
      expect(house?.file_path).toBe('/assets/studio/kanto/prefabs/house_blue.png');

      const tree = service.getPrefabById('tree_poke');
      expect(tree).toBeDefined();
      expect(tree?.category).toBe('vegetation');

      const lamp = service.getPrefabById('street_lamp');
      expect(lamp).toBeDefined();
      expect(lamp?.category).toBe('props');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('filters prefabs by category with O(1) performance', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => mockManifest
    } as unknown as Response);

    try {
      await service.loadManifest();
      const buildings = service.getPrefabsByCategory('buildings');
      expect(buildings.length).toBe(1);
      expect(buildings[0]?.id).toBe('house_blue');

      const veg = service.getPrefabsByCategory('vegetation');
      expect(veg.length).toBe(1);
      expect(veg[0]?.id).toBe('tree_poke');

      const props = service.getPrefabsByCategory('props');
      expect(props.length).toBe(1);
      expect(props[0]?.id).toBe('street_lamp');

      const all = service.getPrefabsByCategory('all');
      expect(all.length).toBe(3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns undefined for non-existent prefab IDs', () => {
    expect(service.getPrefabById('non_existent_building_xyz')).toBeUndefined();
  });

  it('handles fetch failure gracefully by preserving fallback cache', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 404
    } as unknown as Response);

    try {
      const loaded = await service.loadManifest('/non_existent/manifest.json');
      expect(loaded).toBeNull();
      expect(service.getAllPrefabs().length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('validates public/assets/prefabs/manifest.json against disk and verifies new zone prefabs', () => {
    const manifestPath = path.resolve('public/assets/prefabs/manifest.json');
    expect(fs.existsSync(manifestPath), 'manifest.json must exist').toBe(true);
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as { version: string; prefabs: Array<{ id: string; name: string; category: string; width: number; height: number; file: string }> };

    expect(manifest.version).toBeTruthy();
    expect(manifest.prefabs.length).toBeGreaterThanOrEqual(15);

    // Verify uniqueness of IDs
    const ids = new Set<string>();
    for (const p of manifest.prefabs) {
      expect(ids.has(p.id), `Duplicate prefab ID detected: ${p.id}`).toBe(false);
      ids.add(p.id);

      // Verify file exists on disk
      const fullPath = path.resolve('public/assets/prefabs', p.category, p.file);
      expect(fs.existsSync(fullPath), `Prefab file must exist: ${fullPath}`).toBe(true);
    }

    // Verify new zone prefabs exist
    expect(ids.has('pewter_museum')).toBe(true);
    expect(ids.has('mansion_school')).toBe(true);
    expect(ids.has('house_pewter_slate')).toBe(true);
    expect(ids.has('gatehouse_route')).toBe(true);
    expect(ids.has('tree_viridian_forest')).toBe(true);
  });

  it('verifies 0 duplicate files exist in public/assets/tiles/ across categories', () => {
    const tilesDir = path.resolve('public/assets/tiles');
    const fileToCategoryMap = new Map<string, string>();

    for (const category of fs.readdirSync(tilesDir)) {
      const catDir = path.join(tilesDir, category);
      if (fs.statSync(catDir).isDirectory()) {
        for (const file of fs.readdirSync(catDir)) {
          if (file.endsWith('.png')) {
            const previousCategory = fileToCategoryMap.get(file);
            expect(previousCategory, `Duplicate tile file "${file}" found in both "${previousCategory}" and "${category}"`).toBeUndefined();
            fileToCategoryMap.set(file, category);
          }
        }
      }
    }
  });
});

