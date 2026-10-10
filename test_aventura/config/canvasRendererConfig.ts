/**
 * test_aventura/config/canvasRendererConfig.ts
 *
 * SSoT Named constants for 2.5D Canvas tile rendering, z-ordering, and viewport culling.
 */

export const CANVAS_RENDERER = {
  // Plateau rock hash multipliers & threshold
  PLATEAU_HASH_X: 17.13,
  PLATEAU_HASH_Y: 31.41,
  PLATEAU_ROCK_THRESHOLD: 0.65,

  // Z-priority ordering layers
  Z_PRIORITY_LOWEST: 10,
  Z_PRIORITY_MARITIME: 12,
  Z_PRIORITY_OBSTACLES: 15,
  Z_PRIORITY_BUILDINGS: 20,
  Z_PRIORITY_URBAN_PROPS: 30,

  // Entity height spans (tiles)
  HEIGHT_SPAN_FOUNTAIN: 3,
  HEIGHT_SPAN_CARGO: 2,
  HEIGHT_SPAN_TREE: 2,

  // Summit rubble noise hash & offsets
  RUBBLE_HASH_X: 12.9898,
  RUBBLE_HASH_Y: 78.233,
  RUBBLE_HASH_MULT: 43758.5453,
  BOULDER_THRESHOLD: 0.94,
  RUBBLE_THRESHOLD: 0.86,
  RUBBLE_CENTER_OFFSET_PX: 8,

  // Urban prop pixel offsets
  STATUE_Y_OFFSET_PX: 32,
  LAMP_Y_OFFSET_PX: 64,
  MAILBOX_Y_OFFSET_PX: 32,

  // Viewport culling buffer
  VIEWPORT_CULL_PADDING_PX: 128,

  // Area reservation offsets
  LEAGUE_RESERVE_TOP_ROWS: 6,
  LEAGUE_RESERVE_BOTTOM_OFFSET_Y: 6,
  LEAGUE_RESERVE_RIGHT_WING_OFFSET_X: 7,
  PORT_DOCK_RESERVE_OFFSET_X: 7
} as const;
