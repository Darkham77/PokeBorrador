-- auditor_fault_suite/triggers/bad_migration.sql
-- FAULT TRIGGER: SQL anti-patterns, missing schema qualification, select-star.

-- Trigger: unqualified-schema-table (missing public. prefix)
CREATE TABLE unverified_table (
  id uuid PRIMARY KEY,
  client_id uuid
);

-- Trigger: select-star-prohibited
SELECT * FROM unverified_table;

-- Trigger: unindexed-foreign-key
ALTER TABLE unverified_table ADD CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES clients(id);

-- Trigger: drop-table-without-guard
DROP TABLE obsolete_users;
