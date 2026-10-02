/**
 * auditor_fault_suite/triggers/bad_pokedex.ts
 *
 * FAULT TRIGGER: Spanish IDs, unknown moves/abilities and unwhitelisted spawns.
 */

// Trigger: non-english-canonical-id (Spanish identifiers in domain constants)
export const MOVIMIENTO_ESP = 'placaje_electrico';
export const HABILIDAD_ESP = 'mar_llamas';

// Trigger: unknown-move-id, unknown-ability-id
export const FAKE_MOVE_ENTRY = {
  id: 'non_existent_fake_move_9999',
  power: 999
};

export const FAKE_ABILITY_ENTRY = {
  id: 'non_existent_fake_ability_9999'
};
