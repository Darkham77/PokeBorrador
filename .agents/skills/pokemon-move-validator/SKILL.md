---
description: Validates Pokémon move databases and battle logic
---
# Pokemon Move Validator Skill

This skill provides a mandatory checklist and reference for adding new Pokémon or Moves to the game. It ensures that move definitions in `js/02_pokemon_data.js` match the implementation logic in `js/07_battle.js`, preventing catastrophic calculation bugs.

## Automated Validation

When working with moves, you **MUST** run the automated validation script to ensure no Pokémon is assigned a move that isn't defined in the database:

```bash
node .agents/skills/pokemon-move-validator/validator.js
```

If the script outputs missing moves, you must add them to the `MOVE_DATA` block in `js/02_pokemon_data.js` and, if they have unique effects, update `js/07_battle.js` and `getMoveDescription`.

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

## Implementation Rules

### 1. Category-Stat Alignment
> [!IMPORTANT]
> The battle engine automates stat selection based on the `cat` property.
> - `cat: "special"`: Uses `spa` (Attacker) vs `spd` (Defender).
> - `cat: "physical"`: Uses `atk` (Attacker) vs `def` (Defender).
> If a move is Special but defined as `physical` (or vice-versa), it will result in incorrect damage.

### 2. Effect String Registry
Before adding an `effect` string, verify it exists in `applyMoveEffect` (js/07_battle.js). Supported effects include:
- **Status**: `burn`, `paralyze`, `poison`, `bad_poison`, `sleep`, `confuse`, `freeze`.
- **Stat Buffs/Debuffs**: `stat_up_self_atk`, `stat_up_self_spa_2`, `stat_up_self_def_spd`, `stat_down_enemy_def`, `stat_down_enemy_spe_2`, etc.
- **Healing**: `heal_50`, `heal_weather`, `rest`.
- **Field**: `sun`, `rain`, `sandstorm`, `hail`, `reflect`, `light_screen`, `safeguard`.
- **Protection & Evasion**: `protect`, `roar`.
- **Trapping**: `bind`, `trap`, `curse` (Ghost-type version).
- **Special Mechanics**: `always_hits` (Swift), `fixedDmg` (Dragon Rage), `magnitude` (Magnitude), `tri_attack` (Tri Attack).

### 3. Accuracy & Evasion
> [!NOTE]
> The game uses a 3/N scale (33% to 300%) for accuracy. Neutral is `acc * 1`.
> To make a move **always hit** (e.g. Swift), set `acc: 1000` and `effect: "always_hits"`.

## Audit Checklist (Zero Defect Integration)

1. `[ ]` Have you run `node .agents/skills/pokemon-move-validator/validator.js` and confirmed 0 missing moves?
2. `[ ]` Is the `cat` correct for the move's type? (e.g. Electric is Special in Gen 1-3).
3. `[ ]` Does the `effect` string match an existing case in `js/07_battle.js` (`applyMoveEffect` or the battle switch flow)?
4. `[ ]` If the move is multi-hit, is `hits: 2` or `hits: '2-5'` set?
5. `[ ]` If adding a new Pokémon, do its moves exist in `MOVE_DATA`?
6. `[ ]` Are the descriptions for new effects properly translated in `getMoveDescription`?
