# Game Formulas and Mathematical Ratios Manual (Poké Vicio)

This manual documents the mathematical formulas and balance constants that govern the game engine. Any changes to these values must be reflected here to maintain design consistency.

## ⚙️ Global Generation Configuration

To support multi-generation mechanics and maintain the historical integrity of earlier games while supporting retro-modern environments, the engine uses a centralized formulas module (`battleFormulas.ts`) driven by two global constants:

- **`CURRENT_GENERATION`**: `9` (Default base for the database of species and moves).
- **`ACTIVE_RULE_SET`**: `9` (Determines the active battle calculations, critical hit calculations, and STAB modifiers).

The formulas module returns the specific formula based on the `ACTIVE_RULE_SET` as documented below.

### 🚨 Bridge Integrity (Parameter Drift Prevention)

The bridge between the UI and the math core (`battleFormulas.ts`) MUST pass all context parameters (stages, weather, cycle) explicitly to the pure core.

- **Warning**: Never assume that `calculateDamagePure` will infer state. If a new parameter (like `atkStages`) is added to the core, it MUST be updated in the bridge immediately to prevent silent failures in combat logic.
- **Verification**: Any change to the bridge MUST be validated with the `battle.spec.ts` suite to ensure no parameters are being dropped.

---

## ⚔️ Combat Formulas

Standard combat calculations, category-by-type rules (Gen 2 vs Gen 4+), critical hit multipliers, and formula parameters are detailed in the standard battle manuals:
- **Battle Math & Core Rules**: See [Battle Mechanics](./../battle/battle.md) and [Battling Basics](./../battle/battling-basics.md).
- **Status Ailments**: See [Status Ailments](./../battle/status-ailments.md).

---

### 4. Stage Multipliers (-6 to +6)

Stat and Accuracy/Evasion stage multipliers have been moved to the canonical reference:
- **Stat Stage Details**: See [Stat Stages](./../systems/stat-stages.md) for the exact multipliers, mechanics, and generation changes.

---

## 🏃 Escape & Capture Math

All equations and rules regarding escaping wild battles and capturing wild Pokémon are detailed in the corresponding generation-specific references:
- **Escape Chance**: Calculated dynamically based on generation speed checks (Gen 2 vs Gen 4+).
- **Capture Formulas**: Documented in [Gen I Capturing](./../systems/gen-i-capturing.md) through [Gen IX Capturing](./../systems/gen-ix-capturing.md), including specialized zones like [Gen I Safari Zone](./../systems/gen-i-safari-zone.md) and custom ball multipliers.

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
| **T. Eléctrica** | Electric/Dragon (1.5x) | - | - | - | **Thunder/Hurricane: 100% Acc**. Dry Storm (No fire penalty). |

### Extreme Weather Variants (Environment Only)

These variants apply the same core mechanics but with extreme multipliers for the opposing type:

- **Heatwave** (Sun variant): Water damage is reduced to **0x** (evaporated).
- **Storm** (Rain variant): Fire damage is reduced to **0x** (extinguished).

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

### 3. Level Limit & Experience Cap

- **`MAX_POKEMON_LEVEL`**: Single Source of Truth centralized in `src/data/system/constants.ts` (currently `100`).
- **Cap Behavior**: When a Pokémon reaches `MAX_POKEMON_LEVEL`, its current experience (`exp`) is set to `0`, and its experience needed (`expNeeded`) becomes `Infinity`. No additional experience can be gained.

## 🧬 Statistics (Stats)

Standard calculations for HP and combat stats (including EVs, IVs, and Nature effects) have been moved to the canonical reference:
- **Stat Formulas**: See [Stat Mechanics](../systems/stats.md) for full details, examples, and generation history.

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

---

## 🎮 Minigame Formulas

Minigames (like Fishing) scale their difficulty parameters dynamically based on the encounter's spawn rate or rarity. These formulas are encapsulated in `src/logic/minigames/minigameMath.ts`.

To ensure that rare Pokémon (low spawn percentage / rarity) are more challenging, the engine calculates difficulty using the inverted rarity factor:

```text
Difficulty_Factor = 101 - Rarity
```

### 1. Fishing Note Count

Calculates the number of rhythm notes players must hit during a fishing minigame:

```text
Total_Notes = Math.min(22, 5 + Math.floor(Difficulty_Factor / 7))
```

- **Rarity**: The Pokemon's spawn percentage (1 to 100).
- **Bounds**: Always returns an integer between `5` (easiest, rarity 100%) and `22` (hardest, rarity 1%).

### 2. Fishing Ring Speed

Calculates the base duration (in milliseconds) for the ring to collapse from its outer bound to the perfect target:

```text
Speed_Base = Math.round(Math.max(380, 1100 - (Difficulty_Factor * 7.5)) * 1.1)
```

- **Bounds**: Always returns a duration between `418ms` (for rarity 1%, making it collapse extremely fast) and `1202ms` (for rarity 100%).

### 3. Fishing Hit Window

Calculates the precision timing tolerance window (in milliseconds) around the perfect target frame:

```text
Hit_Window = Math.max(100, 190 - (Difficulty_Factor / 1.3))
```

- **Bounds**: Always returns a tolerance window between `113ms` (for rarity 1%, narrowest timing) and `189ms` (for rarity 100%, widest timing).

---

## ⛏️ Archaeology and Fossil Cloning

### 1. Archaeology Encounter Rate

Determines the probability of triggering an archaeological excavation when walking on a route based on its geographical tags:

- **Caves** (`isCave`): **10%** (0.10)
- **Mountains** (`isMountain && !isCave`): **5%** (0.05)
- **Others**: **0%** (0.0)

### 2. Archaeology Reward Distribution

Upon winning the excavation minigame, the unburied item follows this distribution:

- **Fossils (45%)**: Proportional weight based on the map's pool.
- **Evolutionary Stones (25%)**: Equiprobable selection between Fire, Water, Thunder, Leaf, Moon, or Sun Stone.
- **Ores and Gems (30%)**:
  - **Common (20%)**: Selection between Pearl, Stardust, Coal, Copper, or Iron Ore.
  - **Rare/Premium (10%)**: Nugget, Big Pearl, Star Piece, or raw Silver, Gold, Tungsten, Uranium, Ruby, Sapphire, Emerald, Topaz, or Diamond Ore.

### 3. Daycare Cloning Cost

Calculates the total cost in coins to perform a genetic cloning process in the Daycare using sacrifice fossils:

```text
Cost = 3000 + 1000 * N
```

_Where `N` is the amount of extra fossils sacrificed (clamped between 0 and 6)._

### 4. Cloning IV Rerolls

Calculates the number of independent IV rolls (selecting the highest value):

- **Base rolls**: `1 + floor(N / 2)`
- **Odd roll chance**: If `N` is odd (1, 3, 5), grants a **50% chance** of receiving an additional roll (`Math.random() < 0.5`).

### 5. Cloning Shiny Multiplier

Calculates the final Shiny rate inherited by the ancestral fossil egg:

```text
Shiny_Probability = (1 + 0.25 * N) / 4096
```

- **Cap**: The multiplier reaches up to **2.5x** (compared to the `1/4096` base rate) when sacrificing `6` additional fossils.
