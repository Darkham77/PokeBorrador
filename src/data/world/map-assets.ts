export const MAP_ROUTE_MAPPING = {
  route1: 'ruta1',
  route2: 'ruta2',
  forest: 'bosqueviridian',
  route22: 'ruta22',
  route3: 'ruta3',
  mt_moon: 'mt.moon',
  route4: 'ruta4',
  route24: 'ruta24',
  route25: 'ruta25',
  route5: 'ruta5',
  route6: 'ruta6',
  route11: 'ruta11',
  diglett_cave: 'cuevadigglet',
  route9: 'ruta9',
  rock_tunnel: 'tunelroca',
  route10: 'ruta10',
  power_plant: 'centraldeenergia',
  route8: 'ruta8',
  pokemon_tower: 'torrepokemon',
  route12: 'ruta12',
  route13: 'ruta13',
  safari_zone: 'zonasafari',
  seafoam_islands: 'islasespuma',
  fishing_island: 'islasespuma',
  mansion: 'mansionpokemon',
  route23: 'ruta23',
  victory_road: 'callevictoria',
  cerulean_cave: 'cuevaceleste',
  
  // Kanto Cities (test aventura)
  pallet_town: '/test aventura/imagenes/Pallet_Town_FRLG.png',
  viridian_city: '/test aventura/imagenes/Viridian_City_FRLG.png',
  pewter_city: '/test aventura/imagenes/Pewter_City_FRLG.png',
  cerulean_city: '/test aventura/imagenes/Cerulean_City_FRLG.png',
  vermilion_city: '/test aventura/imagenes/Vermilion_City_FRLG.png',
  lavender_town: '/test aventura/imagenes/Lavender_Town_FRLG.png',
  celadon_city: '/test aventura/imagenes/Celadon_City_FRLG.png',
  saffron_city: '/test aventura/imagenes/Saffron_City_FRLG.png',
  fuchsia_city: '/test aventura/imagenes/Fuchsia_City_FRLG.png',
  cinnabar_island: '/test aventura/imagenes/Cinnabar_Island_FRLG.png',
  gym: 'gimnasio',
  pvp: 'gimnasio'
} as const;
export type MapRouteId = keyof typeof MAP_ROUTE_MAPPING;

export function isMapRouteId(value: string): value is MapRouteId {
  return value in MAP_ROUTE_MAPPING;
}

export function requireMapRouteId(value: string): MapRouteId {
  if (isMapRouteId(value)) return value;
  throw new Error(`Invalid map route id: ${value}`);
}

const MAPS_WITH_CYCLES = [
  'ruta1', 'ruta2', 'bosqueviridian', 'ruta22', 'ruta3', 'mt.moon', 'ruta4',
  'ruta24', 'ruta25', 'ruta5', 'ruta6', 'ruta11', 'ruta9', 'tunelroca',
  'ruta10', 'ruta8', 'torrepokemon', 'ruta12', 'ruta13', 'zonasafari',
  'islasespuma', 'mansionpokemon', 'ruta23', 'callevictoria'
] as const;
export type MapWithCycleId = (typeof MAPS_WITH_CYCLES)[number];

export function isMapWithCycleId(value: string): value is MapWithCycleId {
  return (MAPS_WITH_CYCLES as readonly string[]).includes(value); // domain-ok
}

const AVAILABLE_BATTLE_MAPS = [
  "bosqueviridian_amanecer",
  "bosqueviridian_atardecer",
  "bosqueviridian_dia",
  "bosqueviridian_noche",
  "callevictoria_amanecer",
  "callevictoria_atardecer",
  "callevictoria_dia",
  "callevictoria_noche",
  "centraldeenergia",
  "cuevaceleste",
  "cuevadigglet",
  "gimnasio",
  "islasespuma",
  "mansionpokemon_amanecer",
  "mansionpokemon_atardecer",
  "mansionpokemon_dia",
  "mansionpokemon_noche",
  "mt.moon",
  "ruta1_amanecer",
  "ruta1_atardecer",
  "ruta1_dia",
  "ruta1_noche",
  "ruta2_amanecer",
  "ruta2_atardecer",
  "ruta2_dia",
  "ruta2_noche",
  "ruta3_amanecer",
  "ruta3_atardecer",
  "ruta3_dia",
  "ruta3_noche",
  "ruta4_amanecer",
  "ruta4_atardecer",
  "ruta4_dia",
  "ruta4_noche",
  "ruta5_amanecer",
  "ruta5_atardecer",
  "ruta5_dia",
  "ruta5_noche",
  "ruta6_amanecer",
  "ruta6_atardecer",
  "ruta6_dia",
  "ruta6_noche",
  "ruta8_amanecer",
  "ruta8_atardecer",
  "ruta8_dia",
  "ruta8_noche",
  "ruta9_amanecer",
  "ruta9_atardecer",
  "ruta9_dia",
  "ruta9_noche",
  "ruta10_amanecer",
  "ruta10_atardecer",
  "ruta10_dia",
  "ruta10_noche",
  "ruta11_amanecer",
  "ruta11_atardecer",
  "ruta11_dia",
  "ruta11_noche",
  "ruta12_amanecer",
  "ruta12_atardecer",
  "ruta12_dia",
  "ruta12_noche",
  "ruta13_amanecer",
  "ruta13_atardecer",
  "ruta13_dia",
  "ruta13_noche",
  "ruta22_amanecer",
  "ruta22_atardecer",
  "ruta22_dia",
  "ruta22_noche",
  "ruta23_amanecer",
  "ruta23_atardecer",
  "ruta23_dia",
  "ruta23_noche",
  "ruta24_amanecer",
  "ruta24_atardecer",
  "ruta24_dia",
  "ruta24_noche",
  "ruta25_amanecer",
  "ruta25_atardecer",
  "ruta25_dia",
  "ruta25_noche",
  "torrepokemon",
  "tunelroca_amanecer",
  "tunelroca_atardecer",
  "tunelroca_dia",
  "tunelroca_noche",
  "zonasafari_amanecer",
  "zonasafari_atardecer",
  "zonasafari_dia",
  "zonasafari_noche"
] as const;
export type BattleMapAssetId = (typeof AVAILABLE_BATTLE_MAPS)[number];

export function isBattleMapAssetId(value: string): value is BattleMapAssetId {
  return AVAILABLE_BATTLE_MAPS.some(id => id === value);
}

export function requireBattleMapAssetId(value: string): BattleMapAssetId {
  if (isBattleMapAssetId(value)) return value;
  throw new Error(`Invalid battle map asset id: ${value}`);
}
