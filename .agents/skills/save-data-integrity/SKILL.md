---
name: save-data-integrity
description: Garantiza la integridad de los datos de guardado. Delega las reglas técnicas al manual `@/project-standards/references/save_system_manual.md`.
---

# Skill: Integridad de Guardado

> [!IMPORTANT]
> Todo cambio en los Stores de Pinia o en la lógica de persistencia DEBE seguir las reglas del [Manual del Sistema de Guardado](../project-standards/references/save_system_manual.md).

## Foco de la Skill

- **Compatibilidad**: Asegurar que los usuarios antiguos no pierdan progreso tras una actualización.
- **Sincronización**: Verificar la paridad entre Supabase y el almacenamiento local (WASM SQLite).
- **Atocimidad**: Evitar guardados parciales o corruptos durante operaciones masivas.

Para protocolos específicos sobre migraciones de base de datos y paridad de esquemas, consulta el manual de estándares.
