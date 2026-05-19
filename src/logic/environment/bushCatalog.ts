/**
 * src/logic/environment/bushCatalog.ts
 * 
 * ARCHIVO AUTOGENERADO POR scripts/convert_assets.ts - NO EDITAR MANUALMENTE
 * 
 * Contiene el inventario descubierto de assets ambientales para coberturas de combate.
 */

export const BUSH_FAMILIES = {
  "grass": [
    "grass-1"
  ],
  "box": [
    "box-1",
    "box-2",
    "box-3",
    "box-4"
  ],
  "rock": [
    "rock-1",
    "rock-2",
    "rock-3",
    "rock-4"
  ]
} as const;

export type BushFamily = keyof typeof BUSH_FAMILIES;
