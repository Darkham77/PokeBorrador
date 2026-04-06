# Pokemon Move Validator Skill

This skill provides a mandatory checklist and reference for adding new Pokémon or Moves to the game. It ensures that move definitions in `js/02_pokemon_data.js` match the implementation logic in `js/07_battle.js`, preventing catastrophic calculation bugs.

## Core Schema for MOVE_DATA

Every entry in `MOVE_DATA` must follow this structure:

```javascript
"Llamarada": {
    power: 110,           // Number: 0 for status moves
    type: "fire",         // String: lowercase type name
    cat: "special",       // String: "physical", "special", or "status"
    acc: 85,              // Number: 1-100 (or null for always-hit)
    effect: "burn_10",    // String: (Optional) ID for applyMoveEffect
    hits: 1,              // Number: (Optional) 2 for double-hit, or table indices
    recoil: 3,            // Number: (Optional) 1/N damage taken (e.g. 3 = 1/3 recoil)
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
Before adding an `effect` string, verify it exists in `applyMoveEffect` (js/07_battle.js). Currently supported effects include:
- **Status**: `burn`, `paralyze`, `poison`, `bad_poison`, `sleep`, `confuse`, `freeze`.
- **Stat Boosts**: `stat_up_self_atk`, `stat_up_self_spa_2`, `stat_down_enemy_def`, etc.
- **Healing**: `heal_50`, `heal_weather`, `rest`.
- **Field**: `sun`, `rain`, `sandstorm`, `hail`, `reflect`, `light_screen`, `safeguard`.
- **Protection**: `protect`.
- **Trapping**: `bind`, `curse` (Ghost-type version).

### 3. Accuracy & Evasion
> [!NOTE]
> The game uses a 3/N scale (33% to 300%) for accuracy. Neutral is `acc * 1`.
> To make a move **always hit** (e.g. Swift), set `effect: "always_hits"`.

## Audit Checklist (Zero Defect Integration)

1. `[ ]` Is the `cat` correct for the move's type? (e.g. Electric is Special in Gen 1-3).
2. `[ ]` Does the `effect` string match an existing case in `js/07_battle.js`?
3. `[ ]` If the move is multi-hit, is `hits: 2` or `hits: true` set?
4. `[ ]` If adding a new Pokémon, do its moves exist in `MOVE_DATA`?
5. `[ ]` Does the move's power correctly reflect its "fixed damage" status (e.g. Sonic Boom should have `power: 0` and its own effect logic)?
