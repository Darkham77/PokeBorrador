# Time System & Atmosphere Persistence Manual

## 1. Time Cycle and Seasons

- **Speed**: 1 real day (24h) is equivalent to **3 in-game days** (8h cycles).
- **Phases (2h each)**: Morning, Day, Evening, Night.
- **Seasons**: Change every **Real Week** (7 days) in sequence: Spring -> Summer -> Autumn -> Winter.
- **Synchronization**: Strictly based on continuous _Epoch Time_ to guarantee parity among all players without querying the DB.

## 2. Weather Persistence & Priority

The system uses a hierarchical approach to determine the active weather and ensure it correctly reverts after temporary effects:

- **Base State**: The map weather defines the battlefield's atmospheric condition.
- **Combat Overrides**: Moves (Rain Dance) or Abilities (Drizzle) override the map weather for **5 turns**.
- **Cycle Restoration**: After combat, the engine MUST RESTORE the original map/route weather (e.g., if it was raining on the route, it returns to rain, not "clear").
- **Permanent States**: If a route has a permanent weather (turns: -1), it remains active for the entire battle duration unless manually overridden.

---

## 3. Implementation Standard (Node.js 26+)

- **Temporal API Mandate**: The legacy `Date` object is FORBIDDEN for logic related to cycles, seasons, or event durations.
- **Time Zone**: Always use `America/Argentina/Buenos_Aires` as the reference for server-time synchronization.
- **Precision**: Use `Temporal.Instant` for absolute timestamps and `Temporal.Duration` for calculations.

---

## 4. Climate Hierarchy (Intensity Tiers)

The system organizes weather into levels of intensity. High-level weather (Extremes) typically includes **Block** mechanics.

| Family     | Level 1 (Normal) | Level 2 (Enhanced) | Level 3 (Extreme) | Level 4 (Catastrophic) |
| :--------- | :--------------- | :----------------- | :---------------- | :--------------------- |
| **Heat**   | Sun (☀️)         | Intense Sun (🔆)   | Heatwave (🔥)     | --                     |
| **Cold**   | Cold (🧊)        | Coldwave (🥶)      | --                | --                     |
| **Rain**   | Rain (🌧️)        | Heavy Rain (☔)    | Storm (⛈️)        | Thunderstorm (🌩️)      |
| **Ice**    | Snow (❄️)        | Hail (🌨️)          | Blizzard (🌬️)     | --                     |
| **Wind**   | Wind (🍃)        | Strong Winds (🌀)  | --                | --                     |
| **Atmos.** | Mist (💨)        | Fog (🌫️)           | --                | --                     |
| **Earth**  | Sandstorm (🏜️)   | Dust Storm (🌪️)    | --                | --                     |

---

## 5. Weather Decision Algorithm (3-Step Guideline)

> [!NOTE] This algorithm acts as a **GUIDE** for creating generic behaviors. Specialized routes (e.g., "Lightning Valley" with 50% Thunderstorm) may bypass these rules, but the **1% Floor** rule remains absolute.

### Step 1: Family Selection

Identify valid groups for the Route/Season/Cycle.

- _Example (Generic Route - Summer/Evening)_: Valid families = `Clear`, `Heat`, `Rain`.

### Step 2: Global Family Weights

Allocate total probability percentages to each selected family.

- _Example_: `Clear: 70%`, `Heat: 20%`, `Rain: 10%`.

### Step 3: Intensity Split & Seasonal Scaling

Distribute the family's total weight among its internal intensity levels (L1 to L4).

#### 📊 Baseline Rarity Curve (Standard)

For families NOT favored by the current season:

- **L1**: 80% | **L2**: 15% | **L3**: 4% | **L4**: 1%

#### 🌡️ Seasonal Amplification (Dynamic Scaling)

The current season shifts the rarity curve of its "favored" families, making extreme niveles significantly more likely.

| Season     | Favored Families      | Amplified Curve (L1 / L2 / L3 / L4) |
| :--------- | :-------------------- | :---------------------------------- |
| **Spring** | Atmosphere (Mist/Fog) | 60% / 30% / 9% / 1%                 |
| **Summer** | Heat (Sun/Heatwave)   | **50% / 35% / 14%** / 1%            |
| **Autumn** | Rain, Wind            | 60% / 25% / 14% / 1%                |
| **Winter** | Cold, Ice             | **50% / 30% / 19%** / 1%            |

#### 🧮 Calculation Example (Summer Heatwave)

If Family **Heat** has a 20% global weight in Summer:

- **L1 (Sun)**: 10% (50% of the 20% quota)
- **L2 (Intense Sun)**: 7% (35% of the 20% quota)
- **L3 (Heatwave)**: 3% (15% of the 20% quota)
- **Mandatory Floor**: No specific weather can be lower than **1%**. If the calculation results in <1%, it MUST be clamped to 1%.

### Step 4: Global Availability Check

After the generation of all weather tables across all routes, seasons, and cycles, a **Global Audit** MUST be performed.

- **Rule of Existence**: It is STRICTLY FORBIDDEN for any of the 18 weather types to have a 0% global presence.
- **Verification**: Every weather defined in the hierarchy MUST appear in at least one route's probability table in at least one season/cycle combination.
- **Redundancy**: Even the most catastrophic weathers (L4) must be discoverable somewhere in the world to ensure all "Exclusive" spawns and mechanical effects are accessible to the player.

---

## 6. Astronomical Constraints (Cycle Sensitivity)

To maintain logical immersion, certain weathers are restricted based on the in-game time cycle.

### 🌙 Night Cycle Restrictions (20:00 - 06:00)

It is **STRICTLY FORBIDDEN** to use light-based weather states during the night cycle.

- **Prohibited IDs**: `sun` (L1 Heat), `intense_sun` (L2 Heat).
- **Substitutions**:
  - If the **Heat** family is selected at night (common in Summer), use `heatwave` (L3) to represent thermal persistence or high night temperatures.
  - Alternatively, increase the weight of `clear` or `fog/mist`.
- **Mechanical Rule**: Abilities or moves that summon sun (Drizzle/Rain Dance equivalent) will still work visually as a "magical/temporary" effect, but the **Map Base State** must never be sun at night.

---

## 6. Combat & Spawn Modifiers (Full Matrix)

| Family | Weather | Icon | Mechanical Effects (Combat) | Spawn Modifiers (Boost/Block) |
| :--- | :--- | :--- | :--- | :--- |
| **Heat** | Sun | ☀️ | 🔼 Fire/Grass. 🔽 Water/Ice. | 🔼 Fire, Grass, Earth. 🔽 Water, Ice. |
| | Intense Sun | 🔆 | 🚫 Water, Ice. 🔼 Grass/Fire (2x). | 🔼 Fire, Grass. 🚫 Water, Ice. |
| | Heatwave | 🔥 | 🚫 Ice, Grass. 🔼 Fire/Earth. | 🔼 Fire, Ground. 🚫 Ice, Grass. |
| **Cold** | Cold | 🧊 | 🔼 Ice. 🔽 Bug, Grass. | 🔼 Ice. 🔽 Bug, Plant. |
| | Coldwave | 🥶 | **Speed -50%** (Non-Ice). 🚫 Bug, Grass. | 🔼 Ice. 🚫 Bug, Plant. |
| **Water** | Rain | 🌧️ | 🔼 Water/Elec. 🔽 Fire/Rock/Earth. | 🔼 Agua, Bicho, Elec. 🔽 Fuego, Roca, Tierra. |
| | Heavy Rain | ☔ | 🚫 Fire. 🔼 Water (2x). | 🔼 Agua. 🚫 Fuego. 🔽 Roca, Tierra. |
| | Storm | ⛈️ | 🚫 Fire, Flying, Bug. | 🔼 Agua, Elec, Dragon. 🚫 Fuego, Volador. |
| | Thunderstorm | 🌩️ | 🔼 Elec (1.5x), Dragon (1.5x). Perfect Thunder. | 🔼 Elec (2x), Dragon. 🚫 Volador. |
| **Ice** | Snow | ❄️ | 🔼 Def. Física Hielo (+50%). | 🔼 Hielo, Acero. 🔽 Fuego, Bicho, Volador. |
| | Hail | 🌨️ | **Residual Damage**. | 🔼 Hielo. 🔽 Planta, Fuego, Bicho, Volador. |
| | Blizzard | 🌬️ | 🚫 Fire, Grass, Bug, Fly. | 🔼 Hielo. 🚫 Fuego, Planta, Bicho, Volador. |
| **Atmos.** | Fog | 🌫️ | 🔼 Ghost/Dark. 🔽 Flying. Acc 60%. | 🔼 Fantasma, Siniestro. 🔽 Volador. |
| | Mist | 💨 | 🔼 Fairy, Water. 🔽 Fire. | 🔼 Hada, Agua. 🔽 Fuego. |
| **Wind** | Wind | 🍃 | 🔼 Flying, Bug. 🔽 Earth. | 🔼 Volador, Bicho, Psíquico. 🔽 Tierra. |
| | Strong Winds | 🌀 | **No Fly Weakness**. 🔼 Fly/Dragon. | 🔼 Volador, Dragon. 🚫 Bicho, Tierra. |
| **Earth** | Sandstorm | 🏜️ | 🔼 Def. Esp Roca (+50%). Damage. | 🔼 Roca, Tierra, Acero. 🔽 Fuego, Volador, Bicho. |
| | Dust Storm | 🌪️ | 🚫 Flying. 🔼 Rock/Earth. | 🔼 Roca, Tierra. 🚫 Volador. 🔽 Bicho. |

---

## 7. Influence on Encounters (Spawns)

### 7.1 Combination Logic (Additive Window)

A Pokémon appears if the current **Time Phase** matches its schedule **OR** if the current **Weather** favors its elemental type.

- _Example_: A Staryu (Night) can appear during the _Day_ if it is _Raining_.

### 7.2 Weather Invasions (10% Quota)

When an atmospheric condition is active, the encounter pool includes non-native Pokémon:

- **Weighted Quota**: All visitors and exclusives for a weather condition share a combined **10% probability** of the total pool.
- **Internal Rarity**: Within that 10%, species follow relative weights (e.g., `{ pikachu: 95, zapdos: 5 }`).
- **Exclusives**: Species like _Castform_ ONLY appear if their specific weather is active, ignoring time cycles.

### 7.3 Visual Feedback (Halo Cian FX & Coordinated Pulse)

Pokémon synchronized with the weather display a vibrant cyan glow via `PVSpriteFX`.

- **Parity Specs**: Inset `-2%`, `Blur(2px)`, Opacity `0.6`, Scale Max `1.05`.
- **Counter-Pulse**: Cyan Halo (Weather) and Red Aura (Rare) MUST pulse in counter-phase:
  - **Red Aura**: 0% Small -> 50% Big/Bright.
  - **Cyan Halo**: 0% Big/Bright -> 50% Small.
  - Both share a 2s cycle based on `var(--spawn-seed)`.

---

## 8. Visual Standards (AtmosphereLayer)

- **Normal States**: Subtle radial gradients and color pulses.
- **Extreme States**: Strong vignettes, pulse signatures, and GSAP-driven particle intensity.
- **Filter Cleanup**: Temporary visual effects MUST use GSAP's `onComplete` with `clearProps: "filter"` to ensure no residual layers remain.
- **Filter Reset Pattern**: Always include the `filter` property itself in `clearProps` alongside custom variables (e.g., `--fx-main-glow`).

---

## 9. Atmospheric Filter Segregation (Cycle vs Weather)

To preserve the artistic integrity of the original pixel-art backgrounds, the system distinguishes between **Day Cycle** changes (handled via textures) and **Weather** effects (handled via post-processing).

### 9.1 Segregation Matrix

| Target Element | Cycle Filter (Brightness/Hue) | Weather Filter (Rain/Arena) | Implementation Detail |
| :--- | :---: | :---: | :--- |
| **Map Backgrounds** | ❌ | ✅ | Relies on dedicated textures (e.g., `_noche`). |
| **Map Spawns (Pokémon)** | ❌ | ❌ | Isolated from climate filters to preserve color integrity. |
| **Battle Backgrounds** | ❌ | ✅ | Uses cycle-specific battle arena assets. |
| **Battle Combatants** | ✅ | ✅ | Pokémon sprites must tint to integrate with the hour. |
| **Battle Deco (Bushes/Rocks)** | ✅ | ✅ | Environmental objects must match lighting. |

1. **`weatherOnlyFilter`**: strictly isolates weather post-processing. It ignores cycle base values (e.g., it will NOT apply `Brightness(0.6)` during night).
2. **`atmosphereFilter` (Full)**: the combined mix of Cycle + Weather. Used for mobile actors and dynamic objects.

### 9.3 The Isolation Wrapper Pattern

To prevent glowing FX (Shiny sparkles, Guardian auras, Status particles) and UI elements (Debug layers, arrows) from being darkened or tinted, the atmospheric filter MUST be applied via a dedicated **Internal Wrapper** around the base sprite, rather than on the parent container.

- **Implementation**: Wrap the base sprite `img` in a `<div class="pokemon-atmosphere-wrapper">` (or similar) and apply the filter to that div.
- **Result**: Particles, glows, and debug overlays rendered as siblings of the wrapper remain at 100% brightness and full color fidelity, regardless of the map's time or weather. This prevents "color pollution" on non-environmental effects.

> [!IMPORTANT]
> Background images MUST NEVER be touched by cycle-based post-processing. If a map looks too bright at night, the solution is to adjust the `_noche.webp` texture, NOT the CSS filter.
