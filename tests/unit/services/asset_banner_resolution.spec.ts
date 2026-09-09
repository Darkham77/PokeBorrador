/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { SEASONAL_ANNUAL_THEMES } from '@/data/system/rankedData';

describe('Asset Banner Resolution & GitHub Pages Parity', () => {
  const originalBaseUrl = import.meta.env.BASE_URL;

  afterEach(() => {
    import.meta.env.BASE_URL = originalBaseUrl;
  });

  it('resolves canonical banner ID cleanly to /assets/ui/events/<id>.webp', () => {
    const url = getAssetUrl(ASSET_TYPES.BANNER, 'tournament_johto_kanto_frontier_full');
    expect(url).toBe('/assets/ui/events/tournament_johto_kanto_frontier_full.webp');
  });

  it('sanitizes legacy path input without creating duplicate prefixes', () => {
    const legacyInput = '/assets/ui/events/tournament_johto_kanto_frontier_full.webp';
    const url = getAssetUrl(ASSET_TYPES.BANNER, legacyInput);
    expect(url).toBe('/assets/ui/events/tournament_johto_kanto_frontier_full.webp');
    expect(url).not.toContain('//');
    expect(url).not.toContain('/assets/ui/events/assets/ui/events');
  });

  it('prepends BASE_URL correctly when deployed on subdirectories like GitHub Pages (/PokeBorrador/)', () => {
    import.meta.env.BASE_URL = '/PokeBorrador/';
    const url = getAssetUrl(ASSET_TYPES.BANNER, 'tournament_johto_kanto_frontier_full');
    expect(url).toBe('/PokeBorrador/assets/ui/events/tournament_johto_kanto_frontier_full.webp');
  });

  it('resolves pokecenter banner prefix correctly', () => {
    const url = getAssetUrl(ASSET_TYPES.BANNER, 'pokecenter_healing');
    expect(url).toBe('/assets/ui/pokecenter/healing.webp');
  });

  it('guarantees that all 12 seasonal tournament themes store canonical IDs without hardcoded /assets/ prefix', () => {
    expect(SEASONAL_ANNUAL_THEMES.length).toBe(12);
    for (const theme of SEASONAL_ANNUAL_THEMES) {
      expect(theme.bannerImage).not.toContain('/assets/');
      expect(theme.bannerImage).not.toContain('.webp');
      expect(theme.bannerImage).not.toContain('.png');
    }
  });

  it('verifies that all 12 seasonal tournament banners physically exist on disk in public/assets/ui/events/', () => {
    const eventsDir = path.resolve(process.cwd(), 'public/assets/ui/events');
    expect(fs.existsSync(eventsDir)).toBe(true);

    for (const theme of SEASONAL_ANNUAL_THEMES) {
      const canonicalId = theme.bannerImage.replace(/^\/?assets\/ui\/events\//, '').replace(/\.webp$/, '');
      const expectedPath = path.join(eventsDir, `${canonicalId}.webp`);
      expect(
        fs.existsSync(expectedPath),
        `Banner physical file missing on disk: ${expectedPath} (theme: ${theme.id})`
      ).toBe(true);
    }
  });
});
