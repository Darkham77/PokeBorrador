import { readFileSync, existsSync } from 'node:fs';

/**
 * Script de Auditoría de Clima y Terreno vs Showdown
 */
export interface WeatherTerrainResult {
  unhandledWeatherTokens: string[];
}

export function auditWeatherTerrainParity(bridgeFieldPath: string): WeatherTerrainResult {
  const unhandledWeatherTokens: string[] = []; // no-domain
  if (!existsSync(bridgeFieldPath)) return { unhandledWeatherTokens };

  const content = readFileSync(bridgeFieldPath, 'utf-8');
  const requiredTokens = ['rain', 'sunnyday', 'sandstorm', 'hail', 'snow', 'electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain']; // no-domain

  for (const token of requiredTokens) {
    if (!content.toLowerCase().includes(token)) {
      unhandledWeatherTokens.push(token);
    }
  }

  return { unhandledWeatherTokens };
}
