/**
 * tests/node/map/canonicalRegionPresets.test.ts
 *
 * TIER 1 TESTS FOR CANONICAL REGIONAL PRESETS (KANTO & JOHTO)
 *
 * Validates:
 *   1. Authentic Kanto geography: southern sea, Cinnabar island, northern mountains.
 *   2. 15 Canonical Kanto POI nodes in authentic geographic coordinates.
 *   3. Authentic Kanto routes including sea crossings (Routes 19, 20, 21).
 *   4. Authentic Johto geography and 12 canonical settlements.
 *   5. Proper urban layouts, transitable grid, and zero-copy preview buffer.
 */

import { describe, it, expect } from 'vitest';
import { buildCanonicalRegionMap } from '../../../src/logic/map/continent/canonicalRegionPresets.ts';

describe('canonicalRegionPresets', () => {
  it('generates authentic Kanto region with 15 canonical POIs and official routes', () => {
    const result = buildCanonicalRegionMap('kanto');

    expect(result.continent.width).toBe(256);
    expect(result.continent.height).toBe(256);
    expect(result.continent.seed).toBe(151);

    // Verify structured clone (Web Worker compatibility)
    expect(() => structuredClone(result.continent)).not.toThrow();
    expect(() => structuredClone(result.pois)).not.toThrow();
    expect(() => structuredClone(result.routeNetwork.edges)).not.toThrow();

    // 23 Canonical & Landmark Kanto POIs (settlements, landmarks, dual cave portals + Victory Road lower/upper cave portals + 1 coastal port dock)
    expect(result.pois.length).toBe(23);

    const port = result.pois.find((p) => p.id === 'vermilion_port');
    expect(port).toBeDefined();
    expect(port?.name).toBe('Puerto Carmín');
    expect(port?.type).toBe('port_dock');
    expect(port?.facing).toBe('south');
    expect(port?.buildingFile).toBe('poke_port_vermilion_gate.png');

    const pallet = result.pois.find((p) => p.id === 'pallet');
    expect(pallet).toBeDefined();
    expect(pallet?.name).toBe('Pueblo Paleta');
    expect(pallet?.gridX).toBe(67);
    expect(pallet?.gridY).toBe(166);
    expect(pallet?.urbanLayout?.buildings.length).toBeGreaterThan(0);

    const viridian = result.pois.find((p) => p.id === 'viridian');
    expect(viridian).toBeDefined();
    expect(viridian?.name).toBe('Ciudad Verde');
    expect(viridian?.hasGym).toBe(true);

    const cerulean = result.pois.find((p) => p.id === 'cerulean');
    expect(cerulean).toBeDefined();
    expect(cerulean?.name).toBe('Ciudad Celeste');
    expect(cerulean?.gridX).toBe(156);
    expect(cerulean?.gridY).toBe(46);

    const cinnabar = result.pois.find((p) => p.id === 'cinnabar');
    expect(cinnabar).toBeDefined();
    expect(cinnabar?.name).toBe('Isla Canela');
    expect(cinnabar?.gridY).toBe(216);
    expect(cinnabar?.roadMaterial).toBe('dirt');

    const indigo = result.pois.find((p) => p.id === 'indigo');
    expect(indigo).toBeDefined();
    expect(indigo?.name).toContain('Meseta Añil');
    expect(indigo?.elevation).toBe(1);

    // Kanto Route Network (24 canonical route edges including Victory Road subterranean link and Indigo avenue)
    const edges = result.routeNetwork.edges;
    expect(edges.length).toBe(24);

    // Route 1 connects Pallet to Viridian
    const r1 = edges.find((e) => e.fromNodeId === 'pallet' && e.toNodeId === 'viridian');
    expect(r1).toBeDefined();
    expect(r1?.routeType).toBe('road');

    // Water routes 19, 20, 21
    const r19 = edges.find((e) => e.id === 'kanto_r19');
    expect(r19?.isWaterCrossing).toBe(true);
    expect(r19?.routeType).toBe('water_crossing');

    const r20 = edges.find((e) => e.id === 'kanto_r20');
    expect(r20?.isWaterCrossing).toBe(true);

    const r21 = edges.find((e) => e.id === 'kanto_r21');
    expect(r21?.isWaterCrossing).toBe(true);

    // Terrain checks: South sea (water) and Cinnabar Island (grass)
    expect(result.continent.terrainMatrix[250]![50]).toBe('water');
    expect(result.continent.terrainMatrix[220]![55]).toBe('grass');

    // Preview buffer exists and is valid (256 x 256 x 4 bytes)
    expect(result.rawBuffer).toBeInstanceOf(ArrayBuffer);
    expect(result.rawBuffer?.byteLength).toBe(256 * 256 * 4);
  });

  it('generates authentic Johto region with 12 canonical POIs and official routes', () => {
    const result = buildCanonicalRegionMap('johto');

    expect(result.continent.width).toBe(128);
    expect(result.continent.height).toBe(128);
    expect(result.continent.seed).toBe(251);

    // 12 Canonical Johto POIs
    expect(result.pois.length).toBe(12);

    const newbark = result.pois.find((p) => p.id === 'newbark');
    expect(newbark).toBeDefined();
    expect(newbark?.name).toBe('Pueblo Primavera');
    expect(newbark?.gridX).toBe(106);

    const goldenrod = result.pois.find((p) => p.id === 'goldenrod');
    expect(goldenrod).toBeDefined();
    expect(goldenrod?.name).toBe('Ciudad Trigal');
    expect(goldenrod?.type).toBe('metropolis');

    const cianwood = result.pois.find((p) => p.id === 'cianwood');
    expect(cianwood).toBeDefined();
    expect(cianwood?.name).toBe('Ciudad Orquídea');
    expect(cianwood?.gridX).toBe(14);

    // Johto Water Crossing Route 40 & 41 (Olivine to Cianwood)
    const r40 = result.routeNetwork.edges.find((e) => e.id === 'johto_r40_41');
    expect(r40?.isWaterCrossing).toBe(true);
    expect(r40?.routeType).toBe('water_crossing');

    // Lake of Rage
    const lake = result.pois.find((p) => p.id === 'lakeofrage');
    expect(lake).toBeDefined();
    expect(lake?.name).toBe('Lago de la Furia');

    // Mt. Silver
    const silver = result.pois.find((p) => p.id === 'mtsilver');
    expect(silver).toBeDefined();
    expect(silver?.name).toBe('Monte Plateado');
  });
});
