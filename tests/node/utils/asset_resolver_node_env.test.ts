import { describe, it, expect } from 'vite-plus/test';

import { resolveAsset } from '../../../src/logic/utils/assetResolver.ts';

describe('Asset Resolver in Node.js environment', () => {
  it('should resolve assets without throwing when import.meta.env is undefined', () => {
    const originalEnv = import.meta.env;
    try {
      Reflect.set(import.meta, 'env', undefined);
      expect(() => resolveAsset('/sprites/pokemon/1.png')).not.toThrow();
      const result = resolveAsset('/sprites/pokemon/1.png');
      expect(result).toBe('/sprites/pokemon/1.png');
    } finally {
      Reflect.set(import.meta, 'env', originalEnv);
    }
  });

  it('should return empty string for empty input', () => {
    expect(resolveAsset('')).toBe('');
    expect(resolveAsset('   ')).toBe('');
  });

  it('should preserve external HTTP and HTTPS absolute URLs unchanged', () => {
    const httpsUrl =
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
    const httpUrl = 'http://example.com/assets/audio/bgm.mp3';

    expect(resolveAsset(httpsUrl)).toBe(httpsUrl);
    expect(resolveAsset(httpUrl)).toBe(httpUrl);
  });

  it('should normalize leading slash on relative path arguments', () => {
    const relAsset = 'assets/sprites/pokemon/pikachu.webp';
    const resolved = resolveAsset(relAsset);
    expect(resolved.startsWith('/')).toBe(true);
    expect(resolved).toContain('pikachu.webp');
  });

  it('should preserve already prefixed absolute root paths', () => {
    const absPath = '/assets/ui/icons/potion.png';
    const resolved = resolveAsset(absPath);
    expect(resolved).toBe(absPath);
  });

  it('handles data: URI schemes without modification', () => {
    const dataUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    expect(resolveAsset(dataUri)).toBe(dataUri);
  });

  it('handles query parameters and hash fragments cleanly in asset paths', () => {
    const pathWithQuery = '/assets/sounds/battle.mp3?v=1.2.3#loop';
    expect(resolveAsset(pathWithQuery)).toBe(pathWithQuery);
  });

  it('handles blob: internal browser object URL strings intact', () => {
    const blobUrl = 'blob:http://localhost:5173/550e8400-e29b-41d4-a716-446655440000';
    expect(resolveAsset(blobUrl)).toBe(blobUrl);
  });

  it('normalizes backslashes from Windows paths into canonical forward slashes', () => {
    const winPath = 'assets\\sprites\\pokemon\\bulbasaur.png';
    const resolved = resolveAsset(winPath);
    expect(resolved).not.toContain('\\');
    expect(resolved).toContain('bulbasaur.png');
  });
});
