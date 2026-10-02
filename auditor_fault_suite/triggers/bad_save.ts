/**
 * auditor_fault_suite/triggers/bad_save.ts
 *
 * FAULT TRIGGER: Desync between SQLite local storage and Supabase remote schema.
 */

export interface BadLocalPlayerSave {
  playerId: string;
  // Trigger: save-sqlite-supabase-desync (Field exists in SQLite but missing in remote table)
  localOnlyUnsyncedColumn: string;
  party: string[];
}
