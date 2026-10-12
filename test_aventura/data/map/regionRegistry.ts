/**
 * test_aventura/data/map/regionRegistry.ts
 *
 * CANONICAL STAMPING PREFABS CATALOG (SSoT)
 * Pure static catalog of GBA buildings, structures, and props for regional map stamping.
 */

import type { StampingPrefabDefinition } from '../../types/map/adventureWorldTypes.ts';

// ---------------------------------------------------------------------------
// Named Prefab Dimensions (GBA 32px Standard Multiples)
// ---------------------------------------------------------------------------

const PREFAB_DIMENSIONS = {
  POKECENTER: { width: 160, height: 160 },
  POKEMART: { width: 128, height: 128 },
  GYM: { width: 192, height: 160 },
  LAB_OAK: { width: 224, height: 192 },
  HOUSE_STANDARD: { width: 160, height: 160 },
  SILPH_TOWER: { width: 288, height: 320 },
  POKEMON_LEAGUE: { width: 352, height: 256 },
  POWER_PLANT: { width: 320, height: 208 },
  GAME_CORNER: { width: 224, height: 160 },
  MANSION_SCHOOL: { width: 224, height: 192 },

  PROP_SNORLAX: { width: 48, height: 48 },
  PROP_1X1: { width: 32, height: 32 },
  PROP_LAMP: { width: 16, height: 32 },
  PROP_HALF: { width: 16, height: 16 },
  PROP_PIER: { width: 64, height: 96 }
} as const;

export const STAMPING_PREFABS_CATALOG: readonly StampingPrefabDefinition[] = [
  // Buildings
  { id: 'pokecenter', name: 'Centro Pokémon', category: 'buildings', style: 'pokecenter', ...PREFAB_DIMENSIONS.POKECENTER },
  { id: 'pokemart', name: 'Tienda PokéMart', category: 'buildings', style: 'pokemart', ...PREFAB_DIMENSIONS.POKEMART },
  { id: 'gym', name: 'Gimnasio Oficial', category: 'buildings', style: 'gym', ...PREFAB_DIMENSIONS.GYM },
  { id: 'gym_gold', name: 'Gimnasio Dorado', category: 'buildings', style: 'gym_gold', ...PREFAB_DIMENSIONS.GYM },
  { id: 'lab_oak', name: 'Laboratorio de Oak', category: 'buildings', style: 'lab_oak', ...PREFAB_DIMENSIONS.LAB_OAK },
  { id: 'house_red', name: 'Casa Tejado Rojo', category: 'buildings', style: 'house_red', ...PREFAB_DIMENSIONS.HOUSE_STANDARD },
  { id: 'house_blue', name: 'Casa Tejado Azul', category: 'buildings', style: 'house_blue', ...PREFAB_DIMENSIONS.HOUSE_STANDARD },
  { id: 'house_green', name: 'Casa Tejado Verde', category: 'buildings', style: 'house_green', ...PREFAB_DIMENSIONS.HOUSE_STANDARD },
  { id: 'house_orange', name: 'Casa Tejado Naranja', category: 'buildings', style: 'house_orange', ...PREFAB_DIMENSIONS.HOUSE_STANDARD },
  { id: 'silph_tower', name: 'Torre Silph / Radio', category: 'buildings', style: 'silph_tower', ...PREFAB_DIMENSIONS.SILPH_TOWER },
  { id: 'pokemon_league', name: 'Liga Pokémon', category: 'buildings', style: 'pokemon_league', ...PREFAB_DIMENSIONS.POKEMON_LEAGUE },
  { id: 'power_plant', name: 'Central de Energía', category: 'buildings', style: 'power_plant', ...PREFAB_DIMENSIONS.POWER_PLANT },
  { id: 'game_corner', name: 'Casino de Juego', category: 'buildings', style: 'game_corner', ...PREFAB_DIMENSIONS.GAME_CORNER },
  { id: 'mansion_school', name: 'Mansión / Escuela', category: 'buildings', style: 'mansion_school', ...PREFAB_DIMENSIONS.MANSION_SCHOOL },

  // Props & Obstacles
  { id: 'poke_snorlax', name: 'Snorlax Dormido', category: 'props', style: 'poke_snorlax', ...PREFAB_DIMENSIONS.PROP_SNORLAX },
  { id: 'tree_cuttable', name: 'Árbol Cortable (MO)', category: 'props', style: 'tree_cuttable', ...PREFAB_DIMENSIONS.PROP_1X1 },
  { id: 'street_lamp', name: 'Farola Urbana', category: 'props', style: 'street_lamp', ...PREFAB_DIMENSIONS.PROP_LAMP },
  { id: 'fence_picket', name: 'Valla de Madera', category: 'props', style: 'fence_picket', ...PREFAB_DIMENSIONS.PROP_1X1 },
  { id: 'flowers_red', name: 'Flores Rojas', category: 'props', style: 'flowers_red', ...PREFAB_DIMENSIONS.PROP_1X1 },
  { id: 'mailbox', name: 'Buzón Canónico', category: 'props', style: 'mailbox', ...PREFAB_DIMENSIONS.PROP_HALF },
  { id: 'diglett', name: 'Diglett Asomado', category: 'props', style: 'diglett', ...PREFAB_DIMENSIONS.PROP_1X1 },
  { id: 'pier', name: 'Muelle de Madera', category: 'props', style: 'pier', ...PREFAB_DIMENSIONS.PROP_PIER }
];
