/**
 * tests/node/map/continentPersistence.test.ts
 *
 * TIER 1 ISOLATED UNIT TEST: CONTINENT PERSISTENCE & PRESETS
 * Verifies profile saving, loading, listing, deletion, and canonical preset initialization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveProjectProfile,
  loadProjectProfile,
  listProjectProfiles,
  deleteProjectProfile,
  createBlankProject,
  createPresetProject,
  clearAllProfilesForTesting
} from '../../logic/map/continent/continentPersistence';

describe('continentPersistence', () => {
  beforeEach(() => {
    clearAllProfilesForTesting();
  });

  it('creates a blank project with valid default structure', () => {
    const blank = createBlankProject('Mi Region');
    expect(blank.id.length).toBeGreaterThan(0);
    expect(blank.name).toBe('Mi Region');
    expect(Object.keys(blank.nodes).length).toBe(0);
    expect(blank.connections.length).toBe(0);
  });

  it('creates canonical preset projects with populated geography and cities', () => {
    const kanto = createPresetProject('kanto');
    expect(kanto.name).toContain('Kanto');
    expect(Object.keys(kanto.nodes).length).toBeGreaterThan(4);
    expect(kanto.connections.length).toBeGreaterThan(4);

    const archipelago = createPresetProject('archipelago');
    expect(archipelago.config.biomes.waterPercent).toBeGreaterThan(40);
  });

  it('saves and loads a project profile cleanly', () => {
    const project = createPresetProject('johto');
    saveProjectProfile(project);

    const loaded = loadProjectProfile(project.id);
    expect(loaded).toBeDefined();
    expect(loaded?.id).toBe(project.id);
    expect(loaded?.name).toBe(project.name);
    expect(loaded?.nodes).toEqual(project.nodes);
    expect(loaded?.connections).toEqual(project.connections);
  });

  it('lists saved project profiles with correct metadata', () => {
    const p1 = createBlankProject('Region Alfa');
    const p2 = createPresetProject('glacial');

    saveProjectProfile(p1);
    saveProjectProfile(p2);

    const profiles = listProjectProfiles();
    expect(profiles.length).toBe(2);
    expect(profiles.some((p) => p.id === p1.id)).toBe(true);
    expect(profiles.some((p) => p.id === p2.id)).toBe(true);
  });

  it('deletes a project profile cleanly', () => {
    const project = createBlankProject('Para Borrar');
    saveProjectProfile(project);

    expect(loadProjectProfile(project.id)).toBeDefined();

    const ok = deleteProjectProfile(project.id);
    expect(ok).toBe(true);
    expect(loadProjectProfile(project.id)).toBeNull();
  });
});
