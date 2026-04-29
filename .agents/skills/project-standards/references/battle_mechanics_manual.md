# Battle Mechanics Manual (Poké Vicio)

This manual documents the internal workings of the battle engine, from damage calculation to special abilities.

## ⚔️ Damage Calculation (Gen 4+)

### 1. Base Damage Formula

```text
Damage = floor(((2 * Level / 5 + 2) * Power * A / D) / 50) + 2
```

- **A**: Attack or Sp. Attack (reduced to 50% if the attacker is burned and the move is physical).
- **D**: Defense or Sp. Defense.

### 2. Final Multipliers

`Final Damage = floor(Damage * STAB * Ability * Effectiveness * Random * Critical * Weather * Item)`

- **STAB**: 1.5x (or 2.0x with **Adaptability** ability).
- **Effectiveness**: 0x, 0.25x, 0.5x, 1x, 2x, 4x.
- **Random**: Variation between **0.85 and 1.0**.
- **Critical**: 2.0x. Base probability 6% (12% with **Zoom Lens**, 25% after **Focus Energy**). Immune against **Shell Armor** or **Battle Armor**.

---

## 🌪️ Weather Influence

- **Sun**: 1.5x Fire Damage, 0.5x Water Damage.
- **Rain**: 1.5x Water Damage, 0.5x Fire Damage.

---

## 🧪 Critical Battle Abilities

### 1. On Entering Battle (Entry)

- **Intimidate**: Lowers the opponent's Attack by one stage.
- **Trace**: Copies the opponent's ability upon entering.

### 2. Defensive and Status

- **Sturdy**: Allows surviving with 1 HP against a lethal hit if the user had 100% HP.
- **Natural Cure**: Heals status problems when withdrawn from combat.
- **Synchronize**: If the user receives a status condition, it is automatically passed back to the attacker.

### 3. Contact (30% Probability)

Activated when receiving movements of the **Physical** category:

- **Static**: Paralysis.
- **Poison Point**: Poison.
- **Flame Body**: Burn.
- **Effect Spore**: Randomly causes sleep, paralysis, or poison.

### 4. Special Offensive

- **Technician**: 1.5x power for moves with base power <= 60.
- **Guts**: 1.5x Physical Attack if the user has a status problem.
- **Thick Fat**: Reduces damage taken from Fire or Ice type by 50%.
- **1/3 HP Boosters (1.5x)**: Blaze, Torrent, Overgrow, Swarm.

---

## 🏃 Speed and Priority

- **Paralysis**: Reduces actual speed to 50%.
- **Weather and Ability (2x Speed)**:
  - **Chlorophyll**: During Morning/Day.
  - **Swift Swim**: During Evening/Night.
- **Run Away**: 2x Speed if the user has a status problem.
