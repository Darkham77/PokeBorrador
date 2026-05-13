# Game Formulas and Mathematical Ratios Manual (Poké Vicio)

This manual documents the mathematical formulas and balance constants that govern the game engine. Any changes to these values must be reflected here to maintain design consistency.

## ⚙️ Global Generation Configuration

To support multi-generation mechanics and maintain the historical integrity of earlier games while supporting retro-modern environments, the engine uses a centralized formulas module (`battleFormulas.ts`) driven by two global constants:

- **`CURRENT_GENERATION`**: `2` (Default base for the database of species and moves).
- **`ACTIVE_RULE_SET`**: `2` (Determines the active battle calculations, critical hit calculations, and STAB modifiers).

The formulas module returns the specific formula based on the `ACTIVE_RULE_SET` as documented below.

---

## ⚔️ Combat Formulas

### 1. Common Base Damage Formula

Inspired by Gen 4 with modifications for web game balance. Regardless of generation, the foundational formula used is:

```text
Damage = Math.floor(((2 * Level / 5 + 2) * Power * (A / D)) / 50) + 2
```

_Where:_

- **A (Attack)**: Includes burn (x0.5) and Nature/Ability multipliers.
- **D (Defense)**: Includes Nature/Ability multipliers.
- **Final Modifiers**: `Damage * STAB * Effectiveness * Random_Factor (0.85-1.0) * Critical * Weather * Items`.

### 2. Generation 2 Rule Set

Used when `ACTIVE_RULE_SET === 2`. The calculations must apply the following specific canonical rules:

#### A. Category by Type

The category of a move (Physical or Special) is determined strictly by its **Type**, ignoring any individual move category metadata:

- **Physical Types**: `normal`, `fighting`, `flying`, `poison`, `ground`, `rock`, `bug`, `ghost`, `steel`.
- **Special Types**: `fire`, `water`, `grass`, `electric`, `psychic`, `ice`, `dragon`, `dark`.

#### B. Stat Modifiers (A & D)

- **A**: Attacker's Attack or Sp. Attack (reduced to 50% if the attacker is burned and the move is physical).
- **D**: Defender's Defense or Sp. Defense.

#### C. Critical Hits

- **Multiplier**: `2.0x`.
- **Stat Reset Rule**: If a critical hit is triggered, any stat drops on the attacker (`A`) are ignored, and any stat boosts on the defender (`D`) are ignored.
- **Base Probability**: 6.25% (`1/16`).

#### D. Final Multipliers

`Final Damage = floor(Damage * STAB * Effectiveness * Random)`

- **STAB**: `1.5x` if the move type matches the user's type.
- **Effectiveness**: `0x`, `0.25x`, `0.5x`, `1x`, `2x`, `4x` (Based on the Gen 2 type effectiveness chart).
- **Random**: Variation between `0.85` and `1.0` (inclusive).

### 3. Generation 4+ Rule Set

Used when `ACTIVE_RULE_SET === 4` or higher. Applies the following rules:

#### A. Direct Category

The category of a move is determined exclusively by the move's individual metadata: `physical`, `special`, or `status`.

#### B. Stat Modifiers (A & D)

- **A**: Attacker's Attack or Sp. Attack (reduced to 50% if the attacker is burned and the move is physical).
- **D**: Defender's Defense or Sp. Defense.

#### C. Critical Hits

- **Multiplier**:
  - Gen 4-5: `2.0x`.
  - Gen 6+: `1.5x`.
- **Rule**: Ignores any stat drops on the attacker and any stat boosts on the defender unconditionally.
- **Immunity**: Attacks against Pokémon with the `Shell Armor` or `Battle Armor` abilities cannot trigger a critical hit.

#### D. Final Multipliers

`Final Damage = floor(Damage * STAB * Ability * Effectiveness * Random * Critical * Weather * Item)`

- **STAB**: `1.5x` (`2.0x` with the **Adaptability** ability).
- **Effectiveness**: Modern type effectiveness chart.
- **Random**: Variation between `0.85` and `1.0` (inclusive).

### 4. Stage Multipliers (-6 to +6)

| Stage       | -6   | -5   | -4   | -3   | -2   | -1   | 0   | +1   | +2   | +3  | +4   | +5   | +6  |
| :---------- | :--- | :--- | :--- | :--- | :--- | :--- | :-- | :--- | :--- | :-- | :--- | :--- | :-- |
| **Stat**    | 0.25 | 0.28 | 0.33 | 0.40 | 0.50 | 0.66 | 1.0 | 1.5  | 2.0  | 2.5 | 3.0  | 3.5  | 4.0 |
| **Acc/Eva** | 0.33 | 0.37 | 0.43 | 0.50 | 0.60 | 0.75 | 1.0 | 1.33 | 1.66 | 2.0 | 2.33 | 2.66 | 3.0 |

---

## 🏃 Escape & Capture Math

### 1. Escape Chance Formula (Gen 2)

In wild battles, if the player chooses to run:

```text
F = ((A * 32) / (B / 4)) + 30 * C
```

- **A**: Player active Pokémon's current Speed.
- **B**: Wild Pokémon's current Speed.
- **C**: Number of times the player has attempted to escape in the same battle (starts at 0 on the first attempt).
- **Success Criteria**: If `F > 255`, the player successfully escapes. Otherwise, a random check between 0 and 255 is evaluated; if it is less than `F`, escape succeeds.

### 2. Escape Chance Formula (Gen 4+)

In wild battles, if the player chooses to run:

```text
F = ((A * 128) / B) + 30 * C
```

- **A**: Player active Pokémon's current Speed.
- **B**: Wild Pokémon's current Speed.
- **C**: Number of times the player has attempted to escape in the same battle (starts at 0 on the first attempt).
- **Success Criteria**: A random number between 0 and 255 is evaluated; if it is less than `F`, escape succeeds.

### 3. Capture Formula (Gen 3/4 Algorithm)

```text
HP_Factor = (3 * HP_Max - 2 * HP_Actual) / (3 * HP_Max)
a = Math.min(255, Math.floor(Base_Ratio * Ball_Multiplier * HP_Factor * Status_Multiplier))
b = Math.floor(65535 * (a / 255)^0.25)
Capture = 4 consecutive checks where Random(0-65535) < b
```

_Multipliers:_

- **Base_Ratio**: Species-specific `catchRate` from `pokemonDB.ts` (e.g., 255 for Rattata, 3 for Mewtwo).
- **Ball Multipliers**:
  - **Standard**: Poké (1.0x), Great (1.5x), Ultra (2.0x), Master (Guaranteed).
  - **Dusk Ball**: **3.0x** if the environment is `Night`, `Cave`, or `Fog`.
  - **Net Ball**: **3.5x** against Water/Bug types, or if the weather is `Rain` or `Storm`.
  - **Timer Ball**: Scales from **1.0x** to **4.0x** based on `turnCount` (Maxes at 10 turns).
- **Status**: Sleep/Freeze (2.0x), Other status conditions (1.5x).
- **Stacking**: Ball multipliers and event bonuses stack additively.

---

## 🌪️ Weather Effects Table

| Weather | Damage Boost | Damage Reduction | Defensive Boost | Residual Damage | Special Effects |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **Sun** | Fire (1.5x) | Water (0.5x) | - | - | Solar Beam (No charge), Synthesis (66%), Thunder/Hurricane (50% Acc) |
| **Rain** | Water (1.5x) | Fire (0.5x) | - | - | Thunder/Hurricane (100% Acc), Synthesis (25%) |
| **Sandstorm** | - | - | Rock (1.5x SpD) | 1/16 HP (Non-Rock/Ground/Steel) | Solar Beam (50% Pow), Synthesis (25%) |
| **Snow** | - | - | Ice (1.5x Def) | **NONE** | Blizzard (100% Acc), Synthesis (25%), Solar Beam (50% Pow) |
| **Hail** | - | - | - | 1/16 HP (Non-Ice) | Blizzard (100% Acc), Synthesis (25%), Solar Beam (50% Pow) |
| **Fog** | - | - | - | - | **Accuracy: 60% (All moves)**, Solar Beam (50% Pow), Synthesis (25%) |
| **Wind** | - | - | - | - | Activates wind-based abilities (Wind Power, Wind Rider). |
| **S. Winds** | - | - | - | - | **Delta Stream**: Removes weaknesses of Flying-type Pokémon. |
| **Mist/Bruma** | - | - | - | - | **Accuracy: 80% (All moves)**. Visual variant of Fog. |

### Extreme Weather Variants (Environment Only)

These variants apply the same core mechanics but with extreme multipliers for the opposing type:

- **Heatwave** (Sun variant): Water damage is reduced to **0x** (evaporated).
- **Storm** (Rain variant): Fire damage is reduced to **0x** (extinguished).

### 2. Day Cycle (Implicit Weather)

In the absence of active weather (or if it is "Clear"), the game cycle applies an implicit boost to specific types. This multiplier **does NOT stack** with standard Weather (Sun/Rain). Weather always takes precedence.

- **Morning/Day**: Fire-type moves receive a **1.2x boost**. **Thunder/Hurricane** accuracy is reduced to **50%**.
- **Dusk/Night**: Water-type moves receive a **1.2x boost**. **Thunder/Hurricane** accuracy is increased to **100%**.

---

---

## 🆙 Experience and Level Curve

### 1. Required Experience

The system uses a dynamic level-based scaling:

```text
Next_Level_XP = Math.floor(Current_XP * 1.2)
```

### 2. EXP Gain

```text
Exp = floor(BaseExp * Distribution * ClassMult * GlobalMult)
```

- **BaseExp**: `Enemy_Level * 4`.
- **Distribution**: 1.0 (Active), 0.5 (EXP Share).

---

## 🧬 Statistics (Stats)

- **Health Points (HP)**: `HP = floor((Base * 2 + IV) * Level / 100 + Level + 10)`
- **Combat Stats (Atk, Def, etc)**: `Stat = floor(floor((Base * 2 + IV) * Level / 100 + 5) * Nature)` _Nature_: Favorable (1.1), Unfavorable (0.9), Neutral (1.0).

---

## 🧬 Generación de Valores Individuales (IVs)

### 1. Fórmula Estándar

```text
IV = floor(Random(0, 31))
```

### 2. Algoritmo de Re-roll (Guardianes/Alfas)

Para entidades de alto nivel, el motor utiliza una tirada competitiva:

```text
IV_Final = max(ivFloor, max(Random(0, 31), Random(0, 31)))
```

_Donde `ivFloor` es 12 para Guardianes._

### 3. Aplicación de Suelos de Clase/Guerra

```text
IV_Efectivo = Math.max(Bono_Contextual, IV_Generado)
```

- **Bono_Contextual**: `15` (Dominancia), `Racha` (Cazabichos), o `N` (Misiones).

---

## 🪙 Black Market Prices (Rocket)

Valuation formula for selling Pokémon on the illegal market:

```text
Price = floor((Level * 50 + (TotalIVs / 186) * 500) * 0.8)
```

_Where_: `TotalIVs` is the sum of the 6 stats (max 186).

---

## 📈 Global Probability Ratios (`GAME_RATIOS`)

These constants define the base probability for world and combat events. They can be modified by event multipliers or map dominance.

- **Shiny Rate**: 1 in 3000 encounters (Base).
- **Rival (Blue)**: 0.1% probability on any map.
- **Legendaries (Active Ticket)**:
  - **Articuno**: 1% in Seafoam Islands.
  - **Mewtwo**: 0.1% in Cerulean Cave.
- **Fishing**: 10% base on water maps.
- **Wild Items**:
  - **Common**: 50% probability.
  - **Rare**: 5% probability.
- **Gym TMs**:
  - **Normal**: 3%.
  - **Hard**: 5%.

---

## ❄️ Deterministic System (Weather & PRNG)

### 1. Mulberry32 PRNG

A seed based on `hashString(mapId) + epochHour` is used to ensure the weather is the same for all players at the same hour and route.

### 2. Avalanche Protocol

To break the initial seed correlation, the engine **MUST** discard the first 3 values generated by the PRNG:

```js
const prng = mulberry32(seed);
prng(); // Discard 1
prng(); // Discard 2
prng(); // Discard 3
const finalValue = prng(); // Use this
```

---

## 📊 Stat Visualization & Transparency

To assist in debugging and provide player clarity, all stat-related UI elements MUST follow these transparency rules:

- **Stat Breakdowns**: Admin/Debug tooltips (e.g., `getStatBreakdown`) MUST display the full calculation path: `Base x Clima x Stage x Habilidad x Estado = Final`.
- **Percentage-based Stages**: Stage indicators (↑/↓) MUST display the exact percentage modifier (e.g., `+50%`, `-33%`, `+100%`) instead of just the stage level (+1, -1). This helps users visualize the real impact of the modifier.
- **Centralized Logic**: Always use `getEffectiveStat` as the Single Source of Truth for combat calculations to ensure the HUD breakdown matches the actual damage dealt.
