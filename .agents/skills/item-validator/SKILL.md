---
name: item-validator
description: Item validator. Delegates business rules and schemas to the `@/project-standards/references/item_system_manual.md` manual.
---

# Skill: Item Validator

> [!IMPORTANT]
> Before adding or modifying items, consult the [Item System Manual](../project-standards/references/item_system_manual.md) for mandatory schemas.

## Validator Usage

Run the validation script to ensure that changes in `src/data/items.js` do not break inventory or combat integrity:

```bash
node .agents/skills/item-validator/scripts/validate_items.js
```

### What it checks

- Existence of mandatory fields (`id`, `cat`, `sprite`, etc.).
- Consistency between `SHOP_ITEMS` and `HEALING_ITEMS`.
- Usage restrictions in combat.

For more details on categories and expected behavior, review the [Validation Manual](../project-standards/references/validation_manual.md).
