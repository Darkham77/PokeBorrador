---
description: Validates Pokémon move databases and battle logic with semantic and functional checks
---
# Pokemon Move Validator Skill

This skill provides a mandatory checklist and reference for adding new Pokémon or Moves to the game. It ensures that move definitions in `js/02_pokemon_data.js` match the implementation logic in `js/07_battle.js`, preventing catastrophic calculation bugs.

## Automated Validation

When working with moves, you **MUST** run the automated validation scripts to ensure no Pokémon is assigned a move that isn't defined in the database and that the logic is consistent:

### 1. Structural & Semantic Check
```bash
node .agents/skills/pokemon-move-validator/validator.js
```
Checks for missing moves in `MOVE_DATA`, duplicates, and common semantic errors (e.g., status moves with power).

### 2. PokeAPI Semantic Sync
```bash
node .agents/skills/pokemon-move-validator/pokeapi_sync.js
```
Compares local `MOVE_DATA` with PokeAPI to detect missing effects, category mismatches, or incorrect `effect_chance`.

### 3. Battle Integrity Check
```bash
node .agents/skills/pokemon-move-validator/check_battle_integrity.js
```
Ensures every `effect` string in `MOVE_DATA` has a corresponding `case` in `js/07_battle.js`.

## Core Schema for MOVE_DATA

Every entry in `MOVE_DATA` must follow this structure:

```javascript
"Llamarada": {
    power: 110,           // Number: 0 for status moves
    type: "fire",         // String: lowercase type name
    cat: "special",       // String: "physical", "special", or "status"
    acc: 85,              // Number: 1-100 (or 1000 for always-hit)
    effect: "burn_10",    // String: (Optional) ID for applyMoveEffect
    hits: 1,              // Number or String: (Optional) 2 for double-hit, or "2-5"
    recoil: true,         // Boolean: (Optional) Takes recoil damage
    drain: true,          // Boolean: (Optional) Heals 50% of damage dealt
    halfHP: true,         // Boolean: (Optional) Targets loses 50% current HP (Super Fang)
    ohko: true,           // Boolean: (Optional) One-Hit KO (Level check applies)
    levelDmg: true,       // Boolean: (Optional) Damage equals user level (Seismic Toss)
    counter: true,        // Boolean: (Optional) 2x Physical damage received this turn
    selfKO: true          // Boolean: (Optional) User faints (Self-Destruct)
}
```

## Implementation Protocol

### 1. Category-Stat Alignment
> [!IMPORTANT]
> The battle engine automates stat selection based on the `cat` property.
> - `cat: "special"`: Uses `spa` (Attacker) vs `spd` (Defender).
> - `cat: "physical"`: Uses `atk` (Attacker) vs `def` (Defender).

### 2. Effect String Registry
Before adding an `effect` string, verify it exists in `applyMoveEffect` (js/07_battle.js).

### 3. Verification Protocol
Before considering a move implemented, the agent **MUST**:
1. Run `node unit_test_battle.js` to verify general battle logic.
2. Verify that if a move is fixed damage (e.g., `halfHP`), the final damage variable is not overwritten by the standard formula.
3. Check that `getMoveDescription` in `js/02_pokemon_data.js` properly describes the new effect.

## Audit Checklist (Zero Defect Integration)

1. `[ ]` Have you run `node .agents/skills/pokemon-move-validator/validator.js` and confirmed 0 errors?
2. `[ ]` Have you run `node .agents/skills/pokemon-move-validator/pokeapi_sync.js` and verified effect consistency?
3. `[ ]` Have you run `node .agents/skills/pokemon-move-validator/check_battle_integrity.js` to ensure no orphan effects?
4. `[ ]` If the move is multi-hit, is `hits: 2` or `hits: '2-5'` set?
5. `[ ]` Are the descriptions for new effects properly translated in `getMoveDescription`?
6. `[ ]` **Unit Test**: Have you simulated the move in `unit_test_battle.js`?
