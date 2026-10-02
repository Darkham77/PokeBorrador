-- auditor_fault_suite/triggers/bad_schema.sql
-- FAULT TRIGGER: Non-idempotent migrations and schema parity mismatch

-- Trigger: non-idempotent-migration (missing IF NOT EXISTS)
CREATE TABLE pokemon_unmigrated_entity (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

-- Trigger: select-star-prohibited
SELECT * FROM pokemon_unmigrated_entity;
