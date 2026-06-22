/**
 * src/logic/environment/bushCatalog.ts
 * 
 * ARCHIVO AUTOGENERADO POR scripts/convert_assets.ts - NO EDITAR MANUALMENTE
 * 
 * Contiene el inventario descubierto de assets ambientales para coberturas de combate.
 */

export const BUSH_FAMILIES = {
  "box": [
    "box-1",
    "box-2",
    "box-3",
    "box-4"
  ],
  "bush": [
    "bush-1",
    "bush-2"
  ],
  "bushautum": [
    "bushautum-1"
  ],
  "bushflower": [
    "bushflower-1",
    "bushflower-2",
    "bushflower-3",
    "bushflower-4"
  ],
  "bushsnow": [
    "bushsnow-1"
  ],
  "cactus": [
    "cactus-1",
    "cactus-2"
  ],
  "crystaldarkred": [
    "crystaldarkred-1"
  ],
  "crystalgreen": [
    "crystalgreen-1"
  ],
  "crystalblack": [
    "crystalblack-1"
  ],
  "crystalblue": [
    "crystalblue-1"
  ],
  "crystalpink": [
    "crystalpink-1"
  ],
  "crystalviolet": [
    "crystalviolet-1"
  ],
  "crystalred": [
    "crystalred-1"
  ],
  "crystalwhite": [
    "crystalwhite-1"
  ],
  "crystalyellow": [
    "crystalyellow-1"
  ],
  "crystalyellowgreen": [
    "crystalyellowgreen-1"
  ],
  "fern": [
    "fern-1",
    "fern-2"
  ],
  "grass": [
    "grass-1"
  ],
  "rock": [
    "rock-1",
    "rock-2",
    "rock-3",
    "rock-4"
  ],
  "grassflower": [
    "grassflower-1"
  ],
  "treebroken": [
    "treebroken-1",
    "treebroken-2",
    "treebroken-3"
  ]
} as const;

export type BushFamily = keyof typeof BUSH_FAMILIES;
