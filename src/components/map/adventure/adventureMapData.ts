// Static Kanto Map Data & Canonical Mappings for Adventure World Map

export interface MapFarm {
  t: number
  w: number
  m: number
  f: number
}

export interface MapNode {
  name: string
  type: string
  x: number
  y: number
  hasCenter: boolean
  farm: MapFarm
  requiresMO?: string
  blockMsg?: string
  hasEvent?: boolean
  weather?: string
}

export type AdventureDirection = 'up' | 'down' | 'left' | 'right' // string-ok
export type AdventureTerrain = 'land' | 'water' // string-ok

export interface DijkstraPath {
  nodes: string[] // no-domain
  cost: number
  isFly?: boolean
}

export const rawNodes: Record<string, MapNode> = {
  'indigo': { name: 'Meseta Añil', type: 'league', x: 300, y: 350, hasCenter: true, farm: {t:100, w:0, m:0, f:0} },
  'victoryroad': { name: 'Calle Victoria', type: 'poi', x: 300, y: 600, hasCenter: false, requiresMO: 'Medallas', blockMsg: '¡Alto ahí! Necesitas las 8 Medallas de Gimnasio para pasar.', farm: {t:80, w:60, m:40, f:0} },
  'route23': { name: 'Ruta 23', type: 'route', x: 300, y: 850, hasCenter: false, farm: {t:40, w:50, m:0, f:30} },
  'route24': { name: 'Ruta 24', type: 'route', x: 750, y: 300, hasCenter: false, farm: {t:70, w:30, m:0, f:20} },
  'route25': { name: 'Ruta 25', type: 'route', x: 900, y: 300, hasCenter: false, farm: {t:60, w:40, m:0, f:0} },
  'billshouse': { name: 'Casa de Bill', type: 'poi', x: 1050, y: 300, hasCenter: false, farm: {t:0, w:0, m:0, f:0} },
  'pewter': { name: 'Cd. Plateada', type: 'city', x: 500, y: 400, hasCenter: true, farm: {t:0, w:0, m:0, f:0} },
  'route3': { name: 'Ruta 3', type: 'route', x: 650, y: 400, hasCenter: false, hasEvent: true, farm: {t:80, w:20, m:10, f:0} },
  'mtmoon': { name: 'Mt. Moon', type: 'poi', x: 800, y: 400, hasCenter: true, farm: {t:30, w:70, m:90, f:0} }, 
  'route4': { name: 'Ruta 4', type: 'route', x: 800, y: 530, hasCenter: false, farm: {t:20, w:40, m:0, f:0} },
  'cerulean': { name: 'Cd. Celeste', type: 'city', x: 800, y: 650, hasCenter: true, farm: {t:0, w:0, m:0, f:0} },
  'route9': { name: 'Ruta 9', type: 'route', x: 950, y: 650, hasCenter: false, requiresMO: 'Corte', blockMsg: 'Este árbol parece que se puede cortar.', farm: {t:50, w:40, m:0, f:0} },
  'route10': { name: 'Ruta 10', type: 'route', x: 1100, y: 650, hasCenter: true, farm: {t:40, w:50, m:0, f:40} },
  'powerplant': { name: 'Central Energía', type: 'poi', x: 1250, y: 650, hasCenter: false, farm: {t:0, w:90, m:0, f:0} },
  'rocktunnel': { name: 'Túnel Roca', type: 'poi', x: 1100, y: 800, hasCenter: false, farm: {t:50, w:60, m:70, f:0} },
  'route2_n': { name: 'Ruta 2 (N)', type: 'route', x: 500, y: 550, hasCenter: false, farm: {t:10, w:40, m:0, f:0} },
  'viridianforest': { name: 'Bosque Verde', type: 'poi', x: 500, y: 700, hasCenter: false, hasEvent: true, farm: {t:30, w:80, m:0, f:0} }, 
  'route2_s': { name: 'Ruta 2 (S)', type: 'route', x: 500, y: 850, hasCenter: false, farm: {t:10, w:30, m:0, f:0} },
  'route5': { name: 'Ruta 5', type: 'route', x: 800, y: 800, hasCenter: false, farm: {t:0, w:50, m:0, f:0} },
  'celadon': { name: 'Cd. Azulona', type: 'city', x: 550, y: 950, hasCenter: true, farm: {t:0, w:0, m:0, f:0} },
  'route7': { name: 'Ruta 7', type: 'route', x: 680, y: 950, hasCenter: false, farm: {t:0, w:40, m:0, f:0} },
  'saffron': { name: 'Cd. Azafrán', type: 'city', x: 800, y: 950, hasCenter: true, farm: {t:0, w:0, m:0, f:0} },
  'route8': { name: 'Ruta 8', type: 'route', x: 950, y: 950, hasCenter: false, farm: {t:60, w:30, m:0, f:0} },
  'lavender': { name: 'Pueblo Lavanda', type: 'city', x: 1100, y: 950, hasCenter: true, weather: 'fog', farm: {t:0, w:0, m:0, f:0} },
  'pokemontower': { name: 'Torre Pokémon', type: 'poi', x: 1250, y: 950, hasCenter: false, weather: 'fog', farm: {t:40, w:80, m:0, f:0} },
  'viridian': { name: 'Ciudad Verde', type: 'city', x: 500, y: 1100, hasCenter: true, farm: {t:0, w:0, m:0, f:0} },
  'route22': { name: 'Ruta 22', type: 'route', x: 350, y: 1100, hasCenter: false, farm: {t:30, w:30, m:0, f:10} },
  'route6': { name: 'Ruta 6', type: 'route', x: 800, y: 1100, hasCenter: false, farm: {t:40, w:30, m:0, f:20} },
  'vermilion': { name: 'Cd. Carmín', type: 'city', x: 800, y: 1250, hasCenter: true, farm: {t:0, w:0, m:0, f:40} },
  'diglettcave': { name: 'Cueva Diglett', type: 'poi', x: 650, y: 1250, hasCenter: false, farm: {t:0, w:90, m:60, f:0} },
  'route11': { name: 'Ruta 11', type: 'route', x: 950, y: 1250, hasCenter: false, farm: {t:70, w:30, m:0, f:0} },
  'route12': { name: 'Ruta 12', type: 'route', x: 1100, y: 1100, hasCenter: false, requiresMO: 'Flauta', blockMsg: 'Un Pokémon dormido bloquea el camino.', farm: {t:60, w:20, m:0, f:80} },
  'route13': { name: 'Ruta 13', type: 'route', x: 1100, y: 1250, hasCenter: false, farm: {t:50, w:30, m:0, f:60} },
  'route14': { name: 'Ruta 14', type: 'route', x: 1100, y: 1400, hasCenter: false, farm: {t:60, w:30, m:0, f:0} },
  'route15': { name: 'Ruta 15', type: 'route', x: 950, y: 1500, hasCenter: false, farm: {t:70, w:20, m:0, f:0} },
  'route1': { name: 'Ruta 1', type: 'route', x: 500, y: 1250, hasCenter: false, farm: {t:0, w:40, m:0, f:0} },
  'pallet': { name: 'Pueblo Paleta', type: 'city', x: 500, y: 1400, hasCenter: true, farm: {t:0, w:0, m:0, f:10} },
  'route16': { name: 'Ruta 16', type: 'route', x: 350, y: 950, hasCenter: false, requiresMO: 'Flauta', blockMsg: 'Un Pokémon dormido bloquea el camino.', farm: {t:30, w:40, m:0, f:0} },
  'route17': { name: 'Camino Bicis', type: 'route', x: 250, y: 1200, hasCenter: false, farm: {t:90, w:0, m:0, f:0} },
  'route18': { name: 'Ruta 18', type: 'route', x: 250, y: 1500, hasCenter: false, farm: {t:30, w:30, m:0, f:0} },
  'fuchsia': { name: 'Cd. Fucsia', type: 'city', x: 800, y: 1500, hasCenter: true, farm: {t:0, w:0, m:0, f:30} },
  'safarizone': { name: 'Zona Safari', type: 'poi', x: 800, y: 1380, hasCenter: false, farm: {t:0, w:100, m:0, f:60} },
  'route21': { name: 'Ruta 21', type: 'route_water', x: 500, y: 1500, hasCenter: false, requiresMO: 'Surf', blockMsg: 'El agua es profunda. Necesitas MO Surf.', farm: {t:40, w:60, m:0, f:80} },
  'route19': { name: 'Ruta 19', type: 'route_water', x: 800, y: 1550, hasCenter: false, requiresMO: 'Surf', blockMsg: 'El agua es profunda. Necesitas MO Surf.', farm: {t:40, w:60, m:0, f:80} },
  'seafoam': { name: 'Islas Espuma', type: 'poi', x: 650, y: 1600, hasCenter: false, requiresMO: 'Surf', blockMsg: 'El agua es profunda. Necesitas MO Surf.', farm: {t:20, w:80, m:30, f:50} },
  'route20': { name: 'Ruta 20', type: 'route_water', x: 500, y: 1600, hasCenter: false, requiresMO: 'Surf', blockMsg: 'El agua es profunda. Necesitas MO Surf.', farm: {t:40, w:60, m:0, f:80} },
  'cinnabar': { name: 'Isla Canela', type: 'city', x: 350, y: 1600, hasCenter: true, farm: {t:0, w:0, m:0, f:0} },
  'mansion': { name: 'Mansión Pkmn', type: 'poi', x: 200, y: 1600, hasCenter: false, farm: {t:30, w:70, m:0, f:0} },
}

export const connections: [string, string][] = [
  ['indigo', 'victoryroad'], ['victoryroad', 'route23'], ['route23', 'route22'], ['route22', 'viridian'],
  ['pallet', 'route1'], ['route1', 'viridian'], ['viridian', 'route2_s'],
  ['route2_s', 'viridianforest'], ['viridianforest', 'route2_n'], ['route2_n', 'pewter'],
  ['pewter', 'route3'], ['route3', 'mtmoon'], ['mtmoon', 'route4'], ['route4', 'cerulean'],
  ['cerulean', 'route24'], ['route24', 'route25'], ['route25', 'billshouse'],
  ['cerulean', 'route9'], ['route9', 'route10'], ['route10', 'rocktunnel'], ['rocktunnel', 'lavender'],
  ['route10', 'powerplant'],
  ['cerulean', 'route5'], ['route5', 'saffron'],
  ['saffron', 'route6'], ['route6', 'vermilion'],
  ['saffron', 'route7'], ['route7', 'celadon'],
  ['saffron', 'route8'], ['route8', 'lavender'],
  ['diglettcave', 'vermilion'], ['vermilion', 'route11'], ['route11', 'route12'], 
  ['lavender', 'pokemontower'],
  ['lavender', 'route12'], ['route12', 'route13'], ['route13', 'route14'], ['route14', 'route15'], ['route15', 'fuchsia'],
  ['celadon', 'route16'], ['route16', 'route17'], ['route17', 'route18'], ['route18', 'fuchsia'],
  ['fuchsia', 'safarizone'],
  ['fuchsia', 'route19'], ['route19', 'seafoam'], ['seafoam', 'route20'], ['route20', 'cinnabar'],
  ['cinnabar', 'mansion'],
  ['cinnabar', 'route21'], ['route21', 'pallet']
]

export const officialMapIdMap: Record<string, string> = {
  'pallet': 'pallet_town',
  'viridian': 'viridian_city',
  'pewter': 'pewter_city',
  'cerulean': 'cerulean_city',
  'vermilion': 'vermilion_city',
  'lavender': 'lavender_town',
  'celadon': 'celadon_city',
  'saffron': 'saffron_city',
  'fuchsia': 'fuchsia_city',
  'cinnabar': 'cinnabar_island',
  'indigo': 'victory_road',
  'route1': 'route1',
  'route2_s': 'route2',
  'route2_n': 'route2',
  'viridianforest': 'forest',
  'route3': 'route3',
  'mtmoon': 'mt_moon',
  'route4': 'route4',
  'route5': 'route5',
  'route6': 'route6',
  'route7': 'route7',
  'route8': 'route8',
  'route9': 'route9',
  'route10': 'route10',
  'route11': 'route11',
  'route12': 'route12',
  'route13': 'route13',
  'route14': 'route14',
  'route15': 'route15',
  'route16': 'route16',
  'route17': 'route17',
  'route18': 'route18',
  'route19': 'route19',
  'route20': 'route20',
  'route21': 'route21',
  'route22': 'route22',
  'route23': 'route23',
  'route24': 'route24',
  'route25': 'route25',
  'billshouse': 'route25',
  'rocktunnel': 'rock_tunnel',
  'powerplant': 'power_plant',
  'pokemontower': 'pokemon_tower',
  'diglettcave': 'diglett_cave',
  'safarizone': 'safari_zone',
  'seafoam': 'seafoam_islands',
  'mansion': 'mansion',
  'victoryroad': 'victory_road'
}

export const REVERSE_OFFICIAL_MAP_ID_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(officialMapIdMap).map(([localId, officialId]) => [officialId, localId])
)
