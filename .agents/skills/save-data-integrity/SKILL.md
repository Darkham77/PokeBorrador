---
name: save-data-integrity
description: Ensures the integrity of save data. Delegates technical rules to the `@/project-standards/references/save_system_manual.md` manual.
---

# Skill: Save Integrity

> [!IMPORTANT]
> Any change in Pinia Stores or persistence logic MUST follow the rules in the [Save System Manual](../project-standards/references/save_system_manual.md).

## Skill Focus

- **Compatibility**: Ensure that legacy users do not lose progress after an update.
- **Synchronization**: Verify parity between Supabase and local storage (WASM SQLite).
- **Atomicity**: Avoid partial or corrupt saves during massive operations.

For specific protocols on database migrations and schema parity, consult the standards manual.
