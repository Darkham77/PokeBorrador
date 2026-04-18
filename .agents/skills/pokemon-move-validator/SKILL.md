---
name: pokemon-move-validator
description: MANDATORY skill for validating Pokémon move databases and battle logic implementation. Use this skill whenever a move is added, modified, or when troubleshooting battle mechanics in src/logic/battle/ or src/data/moves.js. You MUST run the validation scripts even if the user doesn't explicitly ask for verification to ensure data integrity and avoid calculation bugs.
---

# Pokemon Move Validator Skill

This skill ensures that move definitions in `MOVE_DATA` are semantically correct and that their implementation logic in the battle engine is consistent, preventing catastrophic bugs.

## Automated Validation

When working with moves, you **MUST** run the following automated validation scripts to ensure consistency:

### 1. Structural & Semantic Check

```bash
node .agents/skills/pokemon-move-validator/scripts/validator.js
```

Checks for missing moves in `MOVE_DATA`, duplicates, and common semantic errors (e.g., status moves with power).

### 2. PokeAPI Semantic Sync

```bash
node .agents/skills/pokemon-move-validator/scripts/pokeapi_sync.js
```

Compares local `MOVE_DATA` with PokeAPI to detect missing effects, category mismatches, or incorrect `effect_chance`.

### 3. Battle Integrity Check

```bash
node .agents/skills/pokemon-move-validator/scripts/check_battle_integrity.js
```

Ensures every `effect` string in `MOVE_DATA` has a corresponding implementation in `src/logic/battle/battleMoves.js`.

## Core Schema for MOVE_DATA

Every entry in `MOVE_DATA` must follow this mandatory structure:

```javascript
"Movimiento": {
    power: 0-150,         // 0 for status moves
    type: "string",      // lowercase type name
    cat: "string",       // "physical", "special", or "status"
    acc: 1-100,          // 1-100 (or 1000 for always-hit)
    effect: "string",    // Optional: ID for applyMoveEffect
    hits: number|string, // Optional: 2 for double-hit, or "2-5"
    recoil: boolean,     // Optional: Takes recoil damage
    drain: boolean,      // Optional: Heals 50% of damage dealt
    halfHP: boolean,     // Optional: Targets loses 50% current HP
    ohko: boolean,       // Optional: One-Hit KO
    levelDmg: boolean,   // Optional: Damage equals user level
    counter: boolean,    // Optional: 2x Physical damage received
    selfKO: boolean      // Optional: User faints
}
```

## Implementation Protocol

1. **Category-Stat Alignment**:
   > [!IMPORTANT]
   > The battle engine automates stat selection based on the `cat` property.
   > - `special`: Uses `spa` (Attacker) vs `spd` (Defender).
   > - `physical`: Uses `atk` (Attacker) vs `def` (Defender).

2. **Effect String Registry**: Before adding an `effect` string to `MOVE_DATA`, verify it exists in `applyMoveEffect` (src/logic/battle/battleMoves.js).

3. **Verification**: After implementation, you **MUST**:
   - Run `node backup_legacy_code/unit_test_battle.js` to verify general logic.
   - Check that `getMoveDescription` in `src/data/moves.js` properly describes the new effect.

## Audit Checklist (Zero Defect Integration)

1. `[x]` Run `node .agents/skills/pokemon-move-validator/scripts/validator.js` (0 errors).
2. `[x]` Run `node .agents/skills/pokemon-move-validator/scripts/pokeapi_sync.js` (verified consistency).
3. `[x]` Run `node .agents/skills/pokemon-move-validator/scripts/check_battle_integrity.js` (no orphan effects).
4. `[ ]` For multi-hit moves: is `hits: 2` or `hits: '2-5'` set correctly?
5. `[ ]` Are the descriptions properly translated in `getMoveDescription`?
6. `[ ]` **Unit Test**: Have you simulated the move in `backup_legacy_code/unit_test_battle.js`?
