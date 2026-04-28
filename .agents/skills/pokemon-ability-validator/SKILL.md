---
name: pokemon-ability-validator
description: Validador de habilidades. Delega las reglas de negocio al manual `@/project-standards/references/validation_manual.md`.
---

# Skill: Validador de Habilidades

> [!IMPORTANT]
> Antes de agregar habilidades, consulta el [Manual de Validación](../project-standards/references/validation_manual.md) para los estándares de descripción y lógica.

## Uso del Validador

Ejecuta el script para verificar la integridad de `ABILITY_DATA` y su implementación en el motor de batalla:

```bash
node .agents/skills/pokemon-ability-validator/scripts/validator.js
```

### Qué verifica

- Existencia de descripciones en español.
- Paridad con PokeAPI.
- Implementación de lógica en `battleAbilities.js`.
