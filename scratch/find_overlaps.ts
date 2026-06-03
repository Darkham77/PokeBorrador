import { FIRE_RED_MAPS } from '../src/data/maps.ts';

interface MapData {
  id: string;
  name: string;
  wild?: Record<string, string[]>;
  fishing?: { pool?: string[] };
  archaeology?: { pool?: string[] };
  weather?: Record<string, { visitors?: Record<string, number> | string[], exclusive?: Record<string, number> | string[] }>;
}

const TYPED_MAPS = FIRE_RED_MAPS as unknown as MapData[];

console.log("=== Finding Spawning Overlaps ===");

let count = 0;
TYPED_MAPS.forEach(map => {
  const nativeSpawns = new Set<string>();
  
  if (map.wild) {
    Object.values(map.wild).forEach(list => {
      if (Array.isArray(list)) list.forEach(id => nativeSpawns.add(id));
    });
  }
  
  if (map.fishing?.pool) {
    map.fishing.pool.forEach(id => nativeSpawns.add(id));
  }
  
  if (map.archaeology?.pool) {
    map.archaeology.pool.forEach(id => nativeSpawns.add(id));
  }

  if (map.weather) {
    Object.entries(map.weather).forEach(([weatherType, cfg]) => {
      if (cfg.visitors) {
        const visitors = Array.isArray(cfg.visitors) ? cfg.visitors : Object.keys(cfg.visitors);
        visitors.forEach(v => {
          if (nativeSpawns.has(v)) {
            console.log(`[OVERLAP] Map: ${map.id} (${map.name}) | Weather: ${weatherType} | Visitor: "${v}" is also native.`);
            count++;
          }
        });
      }
      if (cfg.exclusive) {
        const exclusives = Array.isArray(cfg.exclusive) ? cfg.exclusive : Object.keys(cfg.exclusive);
        exclusives.forEach(e => {
          if (nativeSpawns.has(e)) {
            console.log(`[OVERLAP] Map: ${map.id} (${map.name}) | Weather: ${weatherType} | Exclusive: "${e}" is also native.`);
            count++;
          }
        });
      }
    });
  }
});

console.log(`Total overlaps found: ${count}`);
