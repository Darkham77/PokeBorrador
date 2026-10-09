/**
 * src/config/mapProps.ts
 *
 * CANONICAL MAP PROPS & SCENIC FURNITURE REGISTRY (SSoT)
 *
 * Centralized typed catalog of decorative props, urban furniture, signs,
 * fences, and nature elements for retro-modern GBA maps.
 * Props render on the 'decorations' layer and define local collision masks.
 */

export type PropCategory = 'furniture' | 'nature' | 'civic' | 'boundary';

export interface MapPropDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: PropCategory;
  readonly width: number;
  readonly height: number;
  readonly layer: 'decorations';
  readonly tiles: readonly (readonly string[])[]; // [row][col] tileIds
  readonly collisionMask: readonly (readonly (0 | 1)[])[]; // 0: walkable, 1: solid
  readonly description?: string;
}

/**
 * 1. Street Lamp (1x2)
 * Rhythmic avenue lamp: Top lantern is walkable/overhead, base post is solid obstacle.
 */
export const STREET_LAMP: MapPropDefinition = {
  id: 'prop_street_lamp',
  name: 'Farola Urbana GBA',
  category: 'furniture',
  width: 1,
  height: 2,
  layer: 'decorations',
  tiles: [
    ['tile_objects_props_873cabc657'], // row 0: lantern top
    ['tile_objects_props_c305f4c3fd']  // row 1: pole base
  ],
  collisionMask: [
    [0], // lantern top is walkable
    [1]  // pole base is solid
  ],
  description: 'Farola de iluminación urbana para bulevares y aceras peatonales.'
};

/**
 * 2. Residential Mailbox (1x1)
 * Authentic GBA red/wooden mailbox placed beside residential doorways.
 */
export const MAILBOX: MapPropDefinition = {
  id: 'prop_mailbox',
  name: 'Buzón Residencial',
  category: 'furniture',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_water_77167d265c']
  ],
  collisionMask: [
    [1]
  ],
  description: 'Buzón de correo postal para viviendas residenciales.'
};

/**
 * 3. Wooden Bench (2x1)
 * Horizontal park and sidewalk bench with left and right seat segments.
 */
export const BENCH_WOODEN: MapPropDefinition = {
  id: 'prop_bench_wooden',
  name: 'Banco de Madera',
  category: 'furniture',
  width: 2,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_terrain_d2ff41d6a1', 'tile_terrain_5065b9bc0d']
  ],
  collisionMask: [
    [1, 1]
  ],
  description: 'Banco de madera para plazas y parques públicos.'
};

/**
 * 4. Stone Bench (2x1)
 * Sturdy civic stone bench.
 */
export const BENCH_STONE: MapPropDefinition = {
  id: 'prop_bench_stone',
  name: 'Banco de Piedra',
  category: 'furniture',
  width: 2,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_terrain_d2ff41d6a1', 'tile_terrain_5065b9bc0d']
  ],
  collisionMask: [
    [1, 1]
  ],
  description: 'Banco cívico de piedra para plazas monumentales.'
};

/**
 * 5. Ceramic Flower Pot (1x1)
 * Ornamental potted plant for shop entrances and civic plazas.
 */
export const FLOWER_POT: MapPropDefinition = {
  id: 'prop_flower_pot',
  name: 'Maceta Ornamental',
  category: 'furniture',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_water_eacfe78863']
  ],
  collisionMask: [
    [1]
  ],
  description: 'Maceta decorativa para accesos y esquinas de plazas.'
};

/**
 * 6. Signpost (1x1)
 * Wooden directional / informational notice board.
 */
export const SIGNPOST: MapPropDefinition = {
  id: 'prop_signpost',
  name: 'Cartel de Ruta / Señal',
  category: 'civic',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_uncategorized_fc044b0dfa']
  ],
  collisionMask: [
    [1]
  ],
  description: 'Cartel indicador de madera para cruces de caminos y edificios.'
};

/**
 * 7. White Picket Fence (1x1)
 * Residential white fence post.
 */
export const FENCE_WHITE: MapPropDefinition = {
  id: 'prop_fence_white',
  name: 'Valla Blanca',
  category: 'boundary',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_structures_3ec4411b84']
  ],
  collisionMask: [
    [1]
  ],
  description: 'Valla blanca ornamental para delimitar jardines urbanos.'
};

/**
 * 8. Rustic Wood Fence (1x1)
 * Countryside wood post fence.
 */
export const FENCE_WOOD: MapPropDefinition = {
  id: 'prop_fence_wood',
  name: 'Valla Rústica de Madera',
  category: 'boundary',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_structures_49093abef3']
  ],
  collisionMask: [
    [1]
  ],
  description: 'Valla rústica para senderos, desniveles y rutas silvestres.'
};

/**
 * 9. Trash Bin (1x1)
 * Sidewalk waste bin.
 */
export const TRASH_BIN: MapPropDefinition = {
  id: 'prop_trash_bin',
  name: 'Papelera Urbana',
  category: 'furniture',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_objects_props_66454cdc8a']
  ],
  collisionMask: [
    [1]
  ],
  description: 'Papelera de metal para esquinas y paseos urbanos.'
};

/**
 * 10. Red Flowers (1x1)
 * Walkable decorative wildflower patch.
 */
export const FLOWERS_RED: MapPropDefinition = {
  id: 'prop_flowers_red',
  name: 'Flores Rojas',
  category: 'nature',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_vegetation_bd659dae6f']
  ],
  collisionMask: [
    [0]
  ],
  description: 'Flores silvestres rojas transitables.'
};

/**
 * 11. Yellow Flowers (1x1)
 * Walkable decorative yellow flower patch.
 */
export const FLOWERS_YELLOW: MapPropDefinition = {
  id: 'prop_flowers_yellow',
  name: 'Flores Amarillas',
  category: 'nature',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_vegetation_6d432cbe6d']
  ],
  collisionMask: [
    [0]
  ],
  description: 'Flores silvestres amarillas transitables.'
};

/**
 * 12. Blue Flowers / Tufts (1x1)
 * Walkable decorative blue flower tufts.
 */
export const FLOWERS_BLUE: MapPropDefinition = {
  id: 'prop_flowers_blue',
  name: 'Flores Azules',
  category: 'nature',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_vegetation_13f0a9ea38']
  ],
  collisionMask: [
    [0]
  ],
  description: 'Brotes y flores azules transitables.'
};

/**
 * 13. Wood Stump (1x1)
 * Cut tree stump obstacle.
 */
export const WOOD_STUMP: MapPropDefinition = {
  id: 'prop_wood_stump',
  name: 'Tocón de Madera',
  category: 'nature',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_objects_props_7256ee1de0']
  ],
  collisionMask: [
    [1]
  ],
  description: 'Tocón de árbol talado para pastos y bosques.'
};

/**
 * 14. Trimmed Hedge (1x1)
 * Square manicured garden hedge.
 */
export const TRIMMED_HEDGE: MapPropDefinition = {
  id: 'prop_trimmed_hedge',
  name: 'Seto Podado',
  category: 'boundary',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_vegetation_77ac70f502']
  ],
  collisionMask: [
    [1]
  ],
  description: 'Seto verde recortado para perímetro de solares y jardines.'
};

/**
 * 15. Field Rock (1x1)
 * Small field boulder obstacle.
 */
export const FIELD_ROCK: MapPropDefinition = {
  id: 'prop_field_rock',
  name: 'Roca de Campo',
  category: 'nature',
  width: 1,
  height: 1,
  layer: 'decorations',
  tiles: [
    ['tile_objects_props_d9240538d8']
  ],
  collisionMask: [
    [1]
  ],
  description: 'Pequeño peñasco de campo para rutas y claros.'
};

/**
 * Canonical O(1) Map Props Registry
 */
export const MAP_PROPS_REGISTRY: Record<string, MapPropDefinition> = {
  [STREET_LAMP.id]: STREET_LAMP,
  [MAILBOX.id]: MAILBOX,
  [BENCH_WOODEN.id]: BENCH_WOODEN,
  [BENCH_STONE.id]: BENCH_STONE,
  [FLOWER_POT.id]: FLOWER_POT,
  [SIGNPOST.id]: SIGNPOST,
  [FENCE_WHITE.id]: FENCE_WHITE,
  [FENCE_WOOD.id]: FENCE_WOOD,
  [TRASH_BIN.id]: TRASH_BIN,
  [FLOWERS_RED.id]: FLOWERS_RED,
  [FLOWERS_YELLOW.id]: FLOWERS_YELLOW,
  [FLOWERS_BLUE.id]: FLOWERS_BLUE,
  [WOOD_STUMP.id]: WOOD_STUMP,
  [TRIMMED_HEDGE.id]: TRIMMED_HEDGE,
  [FIELD_ROCK.id]: FIELD_ROCK
};

export const ALL_MAP_PROPS: readonly MapPropDefinition[] = Object.values(MAP_PROPS_REGISTRY);

export const URBAN_PROPS: readonly MapPropDefinition[] = ALL_MAP_PROPS.filter(
  p => p.category === 'furniture' || p.category === 'civic' || p.category === 'boundary'
);

export const NATURE_PROPS: readonly MapPropDefinition[] = ALL_MAP_PROPS.filter(
  p => p.category === 'nature'
);

export function getPropDefinition(id: string): MapPropDefinition | undefined { // domain-ok: Identificador o estructura procedural de aventura
  return MAP_PROPS_REGISTRY[id];
}
