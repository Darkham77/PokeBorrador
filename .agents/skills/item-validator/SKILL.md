---
name: item-validator
description: Validador de ítems. Delega las reglas de negocio y schemas al manual `@/project-standards/references/item_system_manual.md`.
---

# Skill: Validador de Ítems

> [!IMPORTANT]
> Antes de agregar o modificar ítems, consulta el [Manual del Sistema de Ítems](../project-standards/references/item_system_manual.md) para conocer los schemas obligatorios.

## Uso del Validador

Ejecuta el script de validación para asegurar que los cambios en `src/data/items.js` no rompan la integridad del inventario o del combate:

```bash
node .agents/skills/item-validator/scripts/validate_items.js
```

### Qué verifica

- Existencia de campos obligatorios (`id`, `cat`, `sprite`, etc.).
- Coherencia entre `SHOP_ITEMS` y `HEALING_ITEMS`.
- Restricciones de uso en combate.

Para más detalles sobre las categorías y el comportamiento esperado, revisa el [Manual de Validación](../project-standards/references/validation_manual.md).
