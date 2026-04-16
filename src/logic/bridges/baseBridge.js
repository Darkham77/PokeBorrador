import { POKEMON_DB } from '@/data/pokemonDB'
import { MOVE_DATA } from '@/data/moves'
import { TYPE_CHART, SECONDARY_TYPES } from '@/data/types'
import { NATURE_DATA } from '@/data/natures'
import { ABILITY_DATA } from '@/data/abilities'
import { FIRE_RED_MAPS } from '@/data/maps'
import { GYMS } from '@/data/gyms'
import { STAGE_MULT, ACC_STAGE_MULT } from '@/data/constants'
import { SHOP_ITEMS, ITEM_CATEGORIES, CATEGORY_LABELS } from '@/data/items'

import { 
  getSpeciesHistory, 
  getMovesAtLevel, 
  getTypeEffectivenessMsg,
  getMoveDescription,
  getPokemonTier
} from '@/logic/pokemonUtils'
import { getSpriteUrl, getBackSpriteUrl } from '@/logic/sprites';
import { getGMT3Date, getTimePeriod } from '@/logic/time';
import { GAME_RATIOS } from '@/logic/ratios';

import { generateEncounter } from '@/logic/encounters';
import { triggerRivalSequence, showFishingIntro, startFishingMinigame } from '@/logic/encounterUI';

export function initBaseBridge() {
  // Data Bindings
  window.POKEMON_DB = POKEMON_DB
  window.MOVE_DATA = MOVE_DATA
  window.TYPE_CHART = TYPE_CHART
  window.SECONDARY_TYPES = SECONDARY_TYPES
  window.NATURE_DATA = NATURE_DATA
  window.ABILITY_DATA = ABILITY_DATA
  window.FIRE_RED_MAPS = FIRE_RED_MAPS
  window.GYMS = GYMS
  window.STAGE_MULT = STAGE_MULT
  window.ACC_STAGE_MULT = ACC_STAGE_MULT
  window.SHOP_ITEMS = SHOP_ITEMS
  window.ITEM_CATEGORIES = ITEM_CATEGORIES
  window.CATEGORY_LABELS = CATEGORY_LABELS

  // Helper Bindings
  window.getSpeciesHistory = getSpeciesHistory
  window.getMovesAtLevel = getMovesAtLevel
  window.getTypeEffectivenessMsg = getTypeEffectivenessMsg
  window.getMoveDescription = getMoveDescription
  window.getSpriteUrl = getSpriteUrl
  window.getBackSpriteUrl = getBackSpriteUrl
  window.getPokemonTier = getPokemonTier
  window.GAME_RATIOS = GAME_RATIOS
  
  // Time Utils
  window.getGMT3Date = getGMT3Date;
  window.getTimePeriod = getTimePeriod;
  window.getDayCycle = getTimePeriod; // Legacy alias

  // Encounters
  window.generateEncounter = generateEncounter;
  window.triggerRivalSequence = triggerRivalSequence;
  window.showFishingIntro = showFishingIntro;
  window.startFishingMinigame = startFishingMinigame;

  console.log('[BaseBridge] Static data and encounter helpers initialized.')
}
