---
name: pokemon-move-validator
description: Validador de movimientos. Delega las reglas de negocio y schemas al manual `@/project-standards/references/validation_manual.md`.
---

# Skill: Validador de Movimientos

> [!IMPORTANT]
> Todo cambio en `MOVE_DATA` o en la lógica de combate DEBE ser validado siguiendo los protocolos del [Manual de Validación](../project-standards/references/validation_manual.md).

## Scripts de Validación

Ejecuta estos scripts después de modificar cualquier movimiento:

1. **Estructura**: `node .agents/skills/pokemon-move-validator/scripts/validator.js`
2. **PokeAPI Sync**: `node .agents/skills/pokemon-move-validator/scripts/pokeapi_sync.js`
3. **Integridad de Batalla**: `node .agents/skills/pokemon-move-validator/scripts/check_battle_integrity.js`

Para el schema detallado de `MOVE_DATA` y reglas de daño, consulta el manual de estándares.
