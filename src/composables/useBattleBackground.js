import { computed } from 'vue'

/**
 * Maps each location to a biome key.
 * Biomes: bosque | montana | playa | puente | ruta | pvp | tower | safari | mansion | celeste | espuma | central
 */
const BIOME_MAP = {
  // Forest / jungle
  forest: 'bosque', route2: 'bosque', route25: 'puente',
  // Mountain / cave
  cave: 'montana', mt_moon: 'montana', rock_tunnel: 'montana',
  victory_road: 'montana', diglett_cave: 'montana',
  cerulean_cave: 'celeste',
  // Water / beach
  water: 'playa', seafoam_islands: 'espuma',
  // Safaris & Mansions
  safari_zone: 'safari', mansion: 'mansion',
  // Bridge routes
  route24: 'puente', route12: 'puente',
  // Pokemon Tower
  pokemon_tower: 'tower',
  // Gym / pvp
  gym: 'pvp', pvp: 'pvp',
  // Central / Power Plant
  power_plant: 'central',
  // Default routes → ruta
}

const BG_ASSETS = {
  bosque: ['dawn', 'day', 'night'],
  montana: ['dawn', 'day', 'dusk', 'night'],
  playa: ['dawn', 'day', 'night'],
  puente: ['dawn', 'day', 'dusk', 'night'],
  ruta: ['dawn', 'day', 'night'],
  pvp: ['dawn', 'day', 'night'],
  // Special ones with single image or specific names
  tower: 'pokemon_tower_bg',
  safari: 'zonasafari',
  mansion: 'mansionpokemon',
  celeste: 'cuevaceleste',
  espuma: 'islasespuma',
  central: 'centralenergía',
  fishing: 'bg_fishing'
}

export function useBattleBackground() {
  /**
   * Returns the asset URL for a given location and time of day.
   * @param {string} locationId 
   * @param {string} cycle - dawn | day | dusk | night
   * @param {boolean} isFishing 
   */
  function getBackgroundUrl(locationId, cycle = 'day', isFishing = false) {
    if (isFishing) return new URL('@/assets/sprites/battle/bg_fishing.webp', import.meta.url).href

    const biome = BIOME_MAP[locationId] || 'ruta'
    const assetDef = BG_ASSETS[biome]

    let fileName = ''
    if (Array.isArray(assetDef)) {
      // Check if the specific cycle exists for this biome, fallback to 'day'
      const variant = assetDef.includes(cycle) ? cycle : 'day'
      fileName = `${biome}_${variant}`
    } else {
      // Static biome image
      fileName = assetDef
    }

    // Using Vite's dynamic asset import pattern
    return new URL(`../assets/sprites/battle/${fileName}.webp`, import.meta.url).href
  }

  return {
    getBackgroundUrl
  }
}
