import { ROUTE_WEATHER_TABLES } from '../src/data/weather-tables.ts';
import { FIRE_RED_MAPS } from '../src/data/maps.ts';

const mapById = new Map<string, any>();
FIRE_RED_MAPS.forEach(map => {
  mapById.set(map.id, map);
});

console.log('=== ESTUDIO: COBERTURA DE CLIMAS POR MAPA ===');

const missingConfigs: { routeId: string; mapName: string; weather: string }[] = [];

for (const routeId in ROUTE_WEATHER_TABLES) {
  const map = mapById.get(routeId);
  if (!map) {
    console.warn(`Advertencia: Ruta ${routeId} en weather-tables no existe en FIRE_RED_MAPS`);
    continue;
  }

  // Collect all possible weathers for this route with prob > 0
  const possibleWeathers = new Set<string>();
  const seasons = ROUTE_WEATHER_TABLES[routeId] || {};
  for (const season in seasons) {
    const phases = seasons[season] || {};
    for (const phase in phases) {
      const weatherProbs = phases[phase] || {};
      for (const wKey in weatherProbs) {
        const prob = weatherProbs[wKey];
        if (prob !== undefined && prob > 0) {
          const norm = wKey.toLowerCase().trim();
          if (norm !== 'clear' && norm !== 'null' && norm !== 'none') {
            possibleWeathers.add(wKey);
          }
        }
      }
    }
  }

  // Verify map.weather has these keys populated
  const weatherCfg = map.weather || {};
  possibleWeathers.forEach(wKey => {
    const cfg = weatherCfg[wKey];
    const hasTerrestrial = cfg?.visitors && Object.keys(cfg.visitors).length > 0;
    const hasTerrestrialExcl = cfg?.exclusive && Object.keys(cfg.exclusive).length > 0;
    const hasFishing = cfg?.fishingVisitors && Object.keys(cfg.fishingVisitors).length > 0;
    const hasFishingExcl = cfg?.fishingExclusive && Object.keys(cfg.fishingExclusive).length > 0;

    const hasAny = hasTerrestrial || hasTerrestrialExcl || hasFishing || hasFishingExcl;

    if (!hasAny) {
      missingConfigs.push({
        routeId,
        mapName: map.name,
        weather: wKey
      });
    }
  });
}

console.log(`Total de omisiones detectadas: ${missingConfigs.length}`);
if (missingConfigs.length > 0) {
  console.log('\nClimas posibles sin visitantes/exclusivos configurados en el mapa:');
  console.log(JSON.stringify(missingConfigs, null, 2));
} else {
  console.log('\n¡Perfecto! Todos los climas posibles en cada mapa tienen configurado al menos un visitante o exclusivo.');
}
