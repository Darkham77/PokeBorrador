/**
 * src/config/mapStructures.ts
 *
 * CANONICAL MULTITILE STRUCTURE TEMPLATES SYSTEM
 *
 * Centralized declarative registry of composite overworld structures (buildings,
 * landmarks, houses, centers) with exact 16x16 tile matrices and local collision masks.
 */

export type StructureTheme = 'firered' | 'emerald' | 'ruby_sapphire' | 'universal';

export interface StructureFootprint {
  readonly width: number;
  readonly height: number;
}

export type StructureCollisionType = 0 | 1 | 2;

export interface StructureTemplate {
  readonly id: string;
  readonly name: string;
  readonly theme: StructureTheme;
  readonly footprint: StructureFootprint;
  readonly tiles: readonly (readonly string[])[];
  readonly collisionMask: readonly (readonly StructureCollisionType[])[];
  readonly interiorMapId?: string;
  readonly defaultSpawnId?: string;
}

/**
 * 1. Pallet Town House (5x5)
 * Canonical red-roof wooden house from FireRed / LeafGreen.
 * Full 5x5 footprint:
 * - Row 0: Roof apex with transparent corners
 * - Row 1: Mid-slope roof shingles
 * - Row 2: Eaves & gutter overhang
 * - Row 3: 2nd floor wall with 2 windows
 * - Row 4: 1st floor wall with wooden entrance door at col 1 & foundation base
 * Walkable entrance door at col 1, row 4.
 */
export const KANTO_HOUSE_SMALL: StructureTemplate = {
  id: 'kanto_house_small',
  name: 'Pallet Town House',
  theme: 'firered',
  interiorMapId: 'interior_kanto_house',
  defaultSpawnId: 'spawn_door',
  footprint: { width: 5, height: 5 },
  tiles: [
    [
      'tile_structures_house_r0_c0_b01cc2e309',
      'tile_structures_house_r0_c1_f74b84b59e',
      'tile_structures_house_r0_c2_f74b84b59e',
      'tile_structures_house_r0_c3_f74b84b59e',
      'tile_structures_house_r0_c4_25d17c13c2'
    ],
    [
      'tile_structures_house_r1_c0_eaa8aacc21',
      'tile_structures_house_r1_c1_ce7d4fc925',
      'tile_structures_house_r1_c2_ce7d4fc925',
      'tile_structures_house_r1_c3_ce7d4fc925',
      'tile_structures_house_r1_c4_0f1f2c0801'
    ],
    [
      'tile_structures_house_r2_c0_d6d5b25bac',
      'tile_structures_house_r2_c1_0220d79b44',
      'tile_structures_house_r2_c2_0220d79b44',
      'tile_structures_house_r2_c3_0220d79b44',
      'tile_structures_house_r2_c4_ae8310096a'
    ],
    [
      'tile_structures_house_r3_c0_4f9939a49d',
      'tile_structures_house_r3_c1_250d4d8956',
      'tile_structures_house_r3_c2_45ae64db09',
      'tile_structures_house_r3_c3_8e0de9413b',
      'tile_structures_house_r3_c4_7a173e79e7'
    ],
    [
      'tile_structures_house_r4_c0_58e77a02c9',
      'tile_structures_house_r4_c1_d1371f9252',
      'tile_structures_house_r4_c2_fa79f48131',
      'tile_structures_house_r4_c3_3a6e06b848',
      'tile_structures_house_r4_c4_d36c4212f2'
    ]
  ],
  collisionMask: [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1] // Col 1 (door) is walkable (0)
  ]
};

/**
 * 2. Poké Mart (4x4)
 * Canonical blue-roof Poké Mart from FireRed / LeafGreen.
 * Walkable glass sliding entrance door at col 2, row 3.
 */
export const POKEMART: StructureTemplate = {
  id: 'pokemart',
  name: 'Poké Mart',
  theme: 'firered',
  interiorMapId: 'interior_pokemart',
  defaultSpawnId: 'spawn_door',
  footprint: { width: 4, height: 4 },
  tiles: [
    [
      'tile_structures_mart_r0_c0',
      'tile_structures_mart_r0_c1',
      'tile_structures_mart_r0_c2',
      'tile_structures_mart_r0_c3'
    ],
    [
      'tile_structures_mart_r1_c0',
      'tile_structures_mart_r1_c1',
      'tile_structures_mart_r1_c2',
      'tile_structures_mart_r1_c3'
    ],
    [
      'tile_structures_mart_r2_c0',
      'tile_structures_mart_r2_c1',
      'tile_structures_mart_r2_c2',
      'tile_structures_mart_r2_c3'
    ],
    [
      'tile_structures_mart_r3_c0',
      'tile_structures_mart_r3_c1',
      'tile_structures_mart_r3_c2',
      'tile_structures_mart_r3_c3'
    ]
  ],
  collisionMask: [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 0, 1] // Col 2 (sliding door) is walkable (0)
  ]
};

/**
 * 3. Pokémon Center (5x5)
 * Canonical red-roof Pokémon Center from FireRed / LeafGreen.
 * Walkable glass sliding entrance door at col 2, row 4.
 */
export const POKEMON_CENTER: StructureTemplate = {
  id: 'pokemon_center',
  name: 'Pokémon Center',
  theme: 'firered',
  interiorMapId: 'interior_pokemon_center',
  defaultSpawnId: 'spawn_door',
  footprint: { width: 5, height: 5 },
  tiles: [
    [
      'tile_structures_pc_a4476060e7',
      'tile_structures_pc_0bbacc75d6',
      'tile_structures_pc_6e737d4521',
      'tile_structures_pc_d8e6e086bc',
      'tile_structures_pc_ed593e05ef'
    ],
    [
      'tile_structures_pc_d42ac47233',
      'tile_structures_pc_9f4a6ab76f',
      'tile_structures_pc_0c489137dc',
      'tile_structures_pc_e252e639d4',
      'tile_structures_pc_3d3bdec24f'
    ],
    [
      'tile_structures_pc_81b027ea55',
      'tile_structures_pc_a5be3f24f2',
      'tile_structures_pc_996342be65',
      'tile_structures_pc_3e366672d0',
      'tile_structures_pc_870e140121'
    ],
    [
      'tile_structures_pc_6c42625997',
      'tile_structures_pc_2977623322',
      'tile_structures_pc_7bca45d611',
      'tile_structures_pc_62fe540d22',
      'tile_structures_pc_0835de42bd'
    ],
    [
      'tile_structures_pc_9307c0c745',
      'tile_structures_pc_bd297f0b30',
      'tile_structures_pc_9203e42c9f',
      'tile_structures_pc_05dc02b9f6',
      'tile_structures_pc_de5e97f252'
    ]
  ],
  collisionMask: [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 0, 1, 1] // Col 2 (sliding door) is walkable (0)
  ]
};

/**
 * 4. Kanto Blue House (5x5)
 * Blue roof residential variant.
 * Walkable entrance door at col 1, row 4.
 */
export const KANTO_HOUSE_BLUE: StructureTemplate = {
  id: 'kanto_house_blue',
  name: 'Blue Roof House',
  theme: 'firered',
  interiorMapId: 'interior_kanto_house_blue',
  defaultSpawnId: 'spawn_door',
  footprint: { width: 5, height: 5 },
  tiles: [
    [
      'tile_structures_mart_r0_c0',
      'tile_structures_mart_r0_c1',
      'tile_structures_mart_r0_c2',
      'tile_structures_mart_r0_c2',
      'tile_structures_mart_r0_c3'
    ],
    [
      'tile_structures_mart_r1_c0',
      'tile_structures_mart_r1_c1',
      'tile_structures_mart_r1_c2',
      'tile_structures_mart_r1_c2',
      'tile_structures_mart_r1_c3'
    ],
    [
      'tile_structures_house_r2_c0_d6d5b25bac',
      'tile_structures_house_r2_c1_0220d79b44',
      'tile_structures_house_r2_c2_0220d79b44',
      'tile_structures_house_r2_c3_0220d79b44',
      'tile_structures_house_r2_c4_ae8310096a'
    ],
    [
      'tile_structures_house_r3_c0_4f9939a49d',
      'tile_structures_house_r3_c1_250d4d8956',
      'tile_structures_house_r3_c2_45ae64db09',
      'tile_structures_house_r3_c3_8e0de9413b',
      'tile_structures_house_r3_c4_7a173e79e7'
    ],
    [
      'tile_structures_house_r4_c0_58e77a02c9',
      'tile_structures_house_r4_c1_d1371f9252',
      'tile_structures_house_r4_c2_fa79f48131',
      'tile_structures_house_r4_c3_3a6e06b848',
      'tile_structures_house_r4_c4_d36c4212f2'
    ]
  ],
  collisionMask: [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1] // Col 1 (door) is walkable (0)
  ]
};

/**
 * 5. Oak's Research Lab (7x5)
 * Large research facility with metallic/wide roof and central double entrance.
 * Walkable entrance door at col 3, row 4.
 */
export const KANTO_LAB: StructureTemplate = {
  id: 'kanto_lab',
  name: "Oak's Research Lab",
  theme: 'firered',
  interiorMapId: 'interior_oak_lab',
  defaultSpawnId: 'spawn_door',
  footprint: { width: 6, height: 5 },
  tiles: [
    [
      'tile_structures_pc_a4476060e7',
      'tile_structures_pc_0bbacc75d6',
      'tile_structures_pc_6e737d4521',
      'tile_structures_pc_6e737d4521',
      'tile_structures_pc_d8e6e086bc',
      'tile_structures_pc_ed593e05ef'
    ],
    [
      'tile_structures_pc_d42ac47233',
      'tile_structures_pc_9f4a6ab76f',
      'tile_structures_pc_0c489137dc',
      'tile_structures_pc_0c489137dc',
      'tile_structures_pc_e252e639d4',
      'tile_structures_pc_3d3bdec24f'
    ],
    [
      'tile_structures_pc_81b027ea55',
      'tile_structures_pc_a5be3f24f2',
      'tile_structures_pc_996342be65',
      'tile_structures_pc_996342be65',
      'tile_structures_pc_3e366672d0',
      'tile_structures_pc_870e140121'
    ],
    [
      'tile_structures_pc_6c42625997',
      'tile_structures_pc_2977623322',
      'tile_structures_house_r3_c2_45ae64db09',
      'tile_structures_pc_7bca45d611',
      'tile_structures_pc_62fe540d22',
      'tile_structures_pc_0835de42bd'
    ],
    [
      'tile_structures_pc_9307c0c745',
      'tile_structures_pc_bd297f0b30',
      'tile_structures_house_r4_c1_d1371f9252',
      'tile_structures_pc_9203e42c9f',
      'tile_structures_pc_05dc02b9f6',
      'tile_structures_pc_de5e97f252'
    ]
  ],
  collisionMask: [
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 0, 1, 1, 1] // Col 2 (door) is walkable (0)
  ]
};

/**
 * 6. Official Pokémon Gym (6x5)
 * Classical stone pillars with pediment facade and entrance.
 * Walkable entrance doors at col 2 & 3, row 4.
 */
export const KANTO_GYM: StructureTemplate = {
  id: 'kanto_gym',
  name: 'Official Pokémon Gym',
  theme: 'firered',
  interiorMapId: 'interior_gym',
  defaultSpawnId: 'spawn_door',
  footprint: { width: 6, height: 5 },
  tiles: [
    [
      'tile_structures_pc_a4476060e7',
      'tile_structures_pc_0bbacc75d6',
      'tile_structures_pc_6e737d4521',
      'tile_structures_pc_6e737d4521',
      'tile_structures_pc_d8e6e086bc',
      'tile_structures_pc_ed593e05ef'
    ],
    [
      'tile_structures_pc_d42ac47233',
      'tile_structures_pc_9f4a6ab76f',
      'tile_structures_pc_0c489137dc',
      'tile_structures_pc_0c489137dc',
      'tile_structures_pc_e252e639d4',
      'tile_structures_pc_3d3bdec24f'
    ],
    [
      'tile_structures_pc_81b027ea55',
      'tile_structures_pc_a5be3f24f2',
      'tile_structures_pc_996342be65',
      'tile_structures_pc_996342be65',
      'tile_structures_pc_3e366672d0',
      'tile_structures_pc_870e140121'
    ],
    [
      'tile_structures_pc_6c42625997',
      'tile_structures_pc_2977623322',
      'tile_structures_pc_7bca45d611',
      'tile_structures_pc_7bca45d611',
      'tile_structures_pc_62fe540d22',
      'tile_structures_pc_0835de42bd'
    ],
    [
      'tile_structures_pc_9307c0c745',
      'tile_structures_pc_bd297f0b30',
      'tile_structures_house_r4_c1_d1371f9252',
      'tile_structures_house_r4_c1_d1371f9252',
      'tile_structures_pc_05dc02b9f6',
      'tile_structures_pc_de5e97f252'
    ]
  ],
  collisionMask: [
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 0, 0, 1, 1] // Col 2 & 3 are walkable doors (0)
  ]
};

/**
 * 7. Plaza Fountain (3x3)
 * Ornamental stone fountain with central water basin.
 */
export const PLAZA_FOUNTAIN: StructureTemplate = {
  id: 'plaza_fountain',
  name: 'Plaza Fountain',
  theme: 'universal',
  footprint: { width: 3, height: 3 },
  tiles: [
    ['tile_structures_mart_r0_c0', 'tile_structures_mart_r0_c1', 'tile_structures_mart_r0_c3'],
    ['tile_structures_mart_r1_c0', 'tile_structures_pc_0c489137dc', 'tile_structures_mart_r1_c3'],
    ['tile_structures_mart_r3_c0', 'tile_structures_mart_r3_c1', 'tile_structures_mart_r3_c3']
  ],
  collisionMask: [
    [1, 1, 1],
    [1, 2, 1], // Center is water (2)
    [1, 1, 1]
  ]
};

/**
 * 8. Plaza Urban Park (4x4)
 * Green pocket park with flower borders and walkable brick paths.
 */
export const PLAZA_PARK: StructureTemplate = {
  id: 'plaza_park',
  name: 'Urban Park',
  theme: 'universal',
  footprint: { width: 4, height: 4 },
  tiles: [
    ['tile_structures_house_r2_c0_d6d5b25bac', 'tile_structures_house_r2_c1_0220d79b44', 'tile_structures_house_r2_c3_0220d79b44', 'tile_structures_house_r2_c4_ae8310096a'],
    ['tile_structures_house_r3_c0_4f9939a49d', 'tile_structures_house_r3_c2_45ae64db09', 'tile_structures_house_r3_c2_45ae64db09', 'tile_structures_house_r3_c4_7a173e79e7'],
    ['tile_structures_house_r3_c0_4f9939a49d', 'tile_structures_house_r3_c2_45ae64db09', 'tile_structures_house_r3_c2_45ae64db09', 'tile_structures_house_r3_c4_7a173e79e7'],
    ['tile_structures_house_r4_c0_58e77a02c9', 'tile_structures_house_r4_c2_fa79f48131', 'tile_structures_house_r4_c3_3a6e06b848', 'tile_structures_house_r4_c4_d36c4212f2']
  ],
  collisionMask: [
    [1, 0, 0, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [1, 0, 0, 1]
  ]
};

/**
 * Registry dictionary for O(1) lookup of structure templates.
 */
export const STRUCTURE_TEMPLATES: Record<string, StructureTemplate> = {
  [KANTO_HOUSE_SMALL.id]: KANTO_HOUSE_SMALL,
  [KANTO_HOUSE_BLUE.id]: KANTO_HOUSE_BLUE,
  [POKEMART.id]: POKEMART,
  [POKEMON_CENTER.id]: POKEMON_CENTER,
  [KANTO_LAB.id]: KANTO_LAB,
  [KANTO_GYM.id]: KANTO_GYM,
  [PLAZA_FOUNTAIN.id]: PLAZA_FOUNTAIN,
  [PLAZA_PARK.id]: PLAZA_PARK
};

/**
 * Helper to fetch a structure template by ID.
 */
export function getStructureTemplate(id: string): StructureTemplate | undefined { // domain-ok: Identificador o estructura procedural de aventura
  return STRUCTURE_TEMPLATES[id];
}

/**
 * Helper to fetch all structure templates filtered by theme.
 */
export function getStructureTemplatesByTheme(theme: StructureTheme): readonly StructureTemplate[] {
  return Object.values(STRUCTURE_TEMPLATES).filter(
    s => s.theme === theme || s.theme === 'universal'
  );
}

/**
 * Registers a new structure template dynamically.
 */
export function registerStructureTemplate(template: StructureTemplate): void {
  STRUCTURE_TEMPLATES[template.id] = template;
}

/**
 * Retrieves all registered structure templates as an array.
 */
export function getAllStructureTemplates(): readonly StructureTemplate[] {
  return Object.values(STRUCTURE_TEMPLATES);
}

