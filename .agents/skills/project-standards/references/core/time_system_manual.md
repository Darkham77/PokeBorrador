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
- **SQLite ISO Format**: Standard SQLite `datetime('now')` produces non-ISO strings. You MUST use `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')` for all `DEFAULT` values in `schema.ts` to ensure compatibility with `Temporal.Instant.from()`.
- **Centralized Formatting**: UI components MUST NOT implement local date formatting. Use `formatDisplayDate(ts)` from `src/logic/timeUtils.ts` to handle robust parsing of legacy strings and automated timezone adjustment (standardized to GMT-3 for display).
- **24-Hour Time Format Mandate**: All in-game clocks, chat timestamps, and logs MUST use a strict 24-hour format (`HH:mm`) without AM/PM tags. Use the centralized `formatTime(ts)` utility from `src/logic/timeUtils.ts` (which guarantees formatting with `hour12: false` and timezone normalization under `GAME_TIMEZONE`) instead of local `.toLocaleString()` browser calls that vary depending on the client's locale.
- **Persistence & Standardization**: To ensure absolute consistency between clients and persistence layers, all timestamps MUST be stored in **ISO 8601** format (e.g., `YYYY-MM-DDTHH:MM:SSZ`). Legacy database records MUST be migrated to this format to prevent parsing failures in the Temporal API.
- **Temporal API Parsing & Mocking Safety**: `Temporal.Instant.from()` strictly requires an ISO 8601 string with a timezone offset or UTC `Z` designator. When accepting user input, debug strings, or wall-clock datetimes from HTML `<input type="datetime-local">` (which lacks timezone offsets, e.g. `YYYY-MM-DDTHH:mm`), parsing MUST NOT rely solely on `Temporal.Instant.from()`. Boundary parsers and time mocking utilities (`DBRouter.setMockTime`) must fallback to `Temporal.PlainDateTime.from(str).toZonedDateTime(GAME_TIMEZONE).toInstant()` to guarantee safe time conversion under the configured game timezone without throwing `Required fields missing from Instant string`. UI debug pickers MUST initialize with `getGMT3Date().toPlainDateTime()` rather than slicing raw UTC instant strings.

---

## 4. Climate Hierarchy (Intensity Tiers)

The system organizes weather into levels of intensity. High-level weather (Extremes) typically includes **Block** mechanics.

|Family|Level 1 (Normal)|Level 2 (Enhanced)|Level 3 (Extreme)|Level 4 (Catastrophic)|Biome Restrictions|
|:--|:--|:--|:--|:--|:--|
|**Heat**|Sun (☀️)|Intense Sun (🔆)|Heatwave (🔥)|--|L1, L2: `isIndoors`, `isCave` (Banned)|
|**Cold**|Cold (🧊)|Coldwave (🥶)|--|--|None (Allowed in all biomes)|
|**Rain**|Rain (🌧️)|Heavy Rain (☔)|Storm (⛈️)|Thunderstorm (🌩️)|L1-L4: `isIndoors`, `isCave` (Banned)|
|**Ice**|Snow (❄️)|Hail (🌨️)|Blizzard (🌬️)|--|L1-L3: `isIndoors`, `isCave` (Banned)|
|**Wind**|Wind (🍃)|Strong Winds (🌀)|--|--|L1, L2: `isIndoors`, `isCave` (Banned)|
|**Atmos.**|Mist (💨)|Fog (🌫️)|--|--|None (Allowed in all biomes)|
|**Earth**|Sandstorm (🏜️)|Dust Storm (🌪️)|--|--|L1, L2: `isIndoors`, `isCave` (Banned)|

---

## 5. Structural Constraints (Biome Audit Mandate)

To maintain structural consistency, it is **STRICTLY FORBIDDEN** to generate weather states that require open sky access or high-velocity atmospheric currents inside enclosed environments.

- **`isIndoors`**: Represents buildings, houses, and labs.
  - **Allowed**: `clear`, `mist`, `fog`, `heatwave` (L3), `cold` (L1), `coldwave` (L2).
  - **Forbidden**: Rain (all levels), Ice (all levels), Wind (all levels), Direct Sun (L1, L2), Sand/Dust Storms (all levels).
- **`isCave`**: Represents underground areas.
  - **Allowed**: `mist`, `fog`, `heatwave` (L3), `cold` (L1), `coldwave` (L2), `clear`.
  - **Forbidden**: Rain (all levels), Ice (all levels), Wind (all levels), Direct Sun (L1, L2), Sand/Dust Storms (all levels).
- **Rationale**: Atmospheric temperature extremes (Heatwave/Coldwave) are allowed as they represent ambient environment/machinery, whereas precipitation, wind, and sandstorms require atmospheric exposure or high-velocity currents impossible in static underground biomes.

---

## 6. Weather Decision Algorithm (3-Step Guideline)

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

The current season shifts the rarity curve of its "favored" families, making extreme levels significantly more likely.

|Season|Favored Families|Amplified Curve (L1 / L2 / L3 / L4)|
|:--|:--|:--|
|**Spring**|Atmosphere (Mist/Fog)|60% / 30% / 9% / 1%|
|**Summer**|Heat (Sun/Heatwave)|**50% / 35% / 14%** / 1%|
|**Autumn**|Rain, Wind|60% / 25% / 14% / 1%|
|**Winter**|Cold, Ice|**50% / 30% / 19%** / 1%|

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
- **Custom Hybrid Weather System Preservation**: When updating or modernizing the climate lists, always preserve custom Poké Vicio hybrid configurations (such as the custom Tier 2 `hail` (Hail) / Tier 1 `snow` (Snow) coexistence in Kanto's climate hierarchy) rather than blindly aligning with official 9th Generation standards that phase out specific conditions.

---

## 7. Astronomical Constraints (Cycle Sensitivity)

To maintain logical immersion, certain weathers are restricted based on the in-game time cycle.

### 🌙 Night Cycle Restrictions (20:00 - 06:00)

It is **STRICTLY FORBIDDEN** to use light-based weather states during the night cycle.

- **Prohibited IDs**: `sun` (L1 Heat), `intense_sun` (L2 Heat).
- **Substitutions**:
  - If the **Heat** family is selected at night (common in Summer), use `heatwave` (L3) to represent thermal persistence or high night temperatures.
  - Alternatively, increase the weight of `clear` or `fog/mist`.
- **Mechanical Rule**: Abilities or moves that summon sun (Drizzle/Rain Dance equivalent) will still work visually as a "magical/temporary" effect, but the **Map Base State** must never be sun at night.

### 🗃️ Cycle-Weather Matrix

|Cycle|Prohibited Weather|Rationale|
|:--|:--|:--|
|**Morning**|None|All atmospheric states possible during sunrise.|
|**Day**|None|Full visibility allow all states.|
|**Dusk**|None|Sunset allows all atmospheric states.|
|**Night**|`sun`, `intense_sun`|No direct solar radiation available after 20:00.|

---

## 8. Combat & Spawn Modifiers (Full Matrix)

|Family|Weather|Icon|Mechanical Effects (Combat)|Spawn Modifiers (Boost/Block)|
|:--|:--|:--|:--|:--|
|**Heat**|Sun|☀️|🔼 Fire/Grass. 🔽 Water/Ice.|🔼 Fire, Grass, Ground. 🔽 Water, Ice.|
||Intense Sun|🔆|🚫 Water, Ice. 🔼 Grass/Fire (2x).|🔼 Fire, Grass. 🚫 Water, Ice.|
||Heatwave|🔥|🚫 Ice, Grass. 🔼 Fire/Ground.|🔼 Fire, Ground. 🚫 Ice, Grass.|
|**Cold**|Cold|🧊|🔼 Ice. 🔽 Bug, Grass.|🔼 Ice. 🔽 Bug, Grass.|
||Coldwave|🥶|**Speed -50%** (Non-Ice). 🚫 Bug, Grass.|🔼 Ice. 🚫 Bug, Grass.|
|**Water**|Rain|🌧️|🔼 Water/Elec. 🔽 Fire/Rock/Ground.|🔼 Water, Bug, Electric. 🔽 Fire, Rock, Ground.|
||Heavy Rain|☔|🚫 Fire. 🔼 Water (2x).|🔼 Water. 🚫 Fire. 🔽 Rock, Ground.|
||Storm|⛈️|🚫 Fire, Flying, Bug.|🔼 Water, Electric, Dragon. 🚫 Fire, Flying.|
||Thunderstorm|🌩️|🔼 Electric (1.5x), Dragon (1.5x). Perfect Thunder.|🔼 Electric (2x), Dragon. 🚫 Flying.|
|**Ice**|Snow|❄️|🔼 Physical Def Ice (+50%).|🔼 Ice, Steel. 🔽 Fire, Bug, Flying.|
||Hail|🌨️|**Residual Damage**.|🔼 Ice. 🔽 Grass, Fire, Bug, Flying.|
||Blizzard|🌬️|🚫 Fire, Grass, Bug, Flying.|🔼 Ice. 🚫 Fire, Grass, Bug, Flying.|
|**Atmos.**|Fog|🌫️|🔼 Ghost/Dark. 🔽 Flying. Acc 60%.|🔼 Ghost, Dark. 🔽 Flying.|
||Mist|💨|🔼 Fairy, Water. 🔽 Fire.|🔼 Fairy, Water. 🔽 Fire.|
|**Wind**|Wind|🍃|🔼 Flying, Bug. 🔽 Ground.|🔼 Flying, Bug, Psychic. 🔽 Ground.|
||Strong Winds|🌀|**No Fly Weakness**. 🔼 Flying/Dragon.|🔼 Flying, Dragon. 🚫 Bug, Ground.|
|**Earth**|Sandstorm|🏜️|🔼 Special Def Rock (+50%). Damage.|🔼 Rock, Ground, Steel. 🔽 Fire, Flying, Bug.|
||Dust Storm|🌪️|🚫 Flying. 🔼 Rock/Ground.|🔼 Rock, Ground. 🚫 Flying. 🔽 Bug.|

---

## 9. Influence on Encounters (Spawns)

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

- **Parity Specs**: Radial-Gradient circle (0.9 opacity at center, Transparent at 70%), Blur(1.5px), Scale Range `0.1 - 2.0`.
- **Counter-Pulse**: Cyan Halo (Weather) and Red Aura (Rare) MUST pulse in counter-phase:
  - **Red Aura**: Scale 0.1 (Min) -> Scale 2.0 (Max).
  - **Cyan Halo**: Scale 2.0 (Max) -> Scale 0.1 (Min).
  - Both share a 2s cycle based on `var(--spawn-seed)`.

---

## 10. Visual Standards (AtmosphereLayer)

- **Normal States**: Subtle radial gradients and color pulses.
- **Extreme States**: Strong vignettes, pulse signatures, and GSAP-driven particle intensity.
- **Filter Cleanup**: Temporary visual effects MUST use GSAP's `onComplete` with `clearProps: "filter"` to ensure no residual layers remain.
- **Filter Reset Pattern**: Always include the `filter` property itself in `clearProps` alongside custom variables (e.g., `--fx-main-glow`).

---

## 11. Atmospheric Filter Segregation (Cycle vs Weather)

To preserve the artistic integrity of the original pixel-art backgrounds, the system distinguishes between **Day Cycle** changes (handled via textures) and **Weather** effects (handled via post-processing).

### 9.1 Segregation Matrix

|Target Element|Cycle Filter (Brightness/Hue)|Weather Filter (Rain/Arena)|Implementation Detail|
|:--|:-:|:-:|:--|
|**Map Backgrounds**|❌|✅|Relies on dedicated textures (e.g., `_noche`).|
|**Map Spawns (Pokémon)**|❌|❌|Isolated from climate filters to preserve color integrity.|
|**Battle Backgrounds**|❌|✅|Uses cycle-specific battle arena assets.|
|**Battle Combatants**|✅|✅|Pokémon sprites must tint to integrate with the hour.|
|**Battle Deco (Bushes/Rocks)**|✅|✅|Environmental objects must match lighting.|

1. **`weatherOnlyFilter`**: strictly isolates weather post-processing. It ignores cycle base values (e.g., it will NOT apply `Brightness(0.6)` during night).
2. **`atmosphereFilter` (Full)**: the combined mix of Cycle + Weather. Used for mobile actors and dynamic objects.

### 9.3 The Isolation Wrapper Pattern

To prevent glowing FX (Shiny sparkles, Guardian auras, Status particles) and UI elements (Debug layers, arrows) from being darkened or tinted, the atmospheric filter MUST be applied via a dedicated **Internal Wrapper** around the base sprite, rather than on the parent container.

- **Implementation**: Wrap the base sprite `img` in a `<div class="pokemon-atmosphere-wrapper">` (or similar) and apply the filter to that div.
- **Result**: Particles, glows, and debug overlays rendered as siblings of the wrapper remain at 100% brightness and full color fidelity, regardless of the map's time or weather. This prevents "color pollution" on non-environmental effects.

> [!IMPORTANT] Background images MUST NEVER be touched by cycle-based post-processing. If a map looks too bright at night, the solution is to adjust the `_noche.webp` texture, NOT the CSS filter.

### 9.4 Cave and Interior Visual Bypass

In battle views (e.g. `BattleArenaView`), if the active battle location is a cave (`isCave` or `isCrystalCave`), all visual atmosphere filters (cycles, weather effects, and weather animations) must be completely bypassed to prevent outdoor environmental lighting and climate rendering inside underground/enclosed spaces.

---

## 12. Biome Classification System

To ensure atmospheric variety and geographical consistency, all maps must be tagged with a primary biome. These tags dictate default weather weights and specialized restrictions.

|Biome Tag|Description|Favored Weather|Forbidden Weather|
|:--|:--|:--|:--|
|**`isPlains`**|Standard routes, meadows.|`clear`, `sun`, `rain` (L1).|None.|
|**`isCoastal`**|Beaches, islands, sea routes.|`mist`, `fog`, `heavy_rain`.|`sandstorm`, `snow`.|
|**`isForest`**|Woods, jungles, thickets.|`mist`, `rain`, `thunderstorm`.|`sandstorm`, `dust_storm`.|
|**`isMountain`**|High altitude, peaks, cliffs.|`wind`, `snow`, `blizzard`, `hail`.|`heatwave` (Summer only).|
|**`isDesert`**|Arid zones, ruins, dunes.|`sun`, `sandstorm`, `dust_storm`.|`rain`, `snow`, `hail`.|
|**`isUrban`**|Cities, towns, villages.|`clear`, `heatwave` (L3).|`blizzard`, `dust_storm`.|
|**`isVolcanic`**|Magma chambers, fire mountains.|`heatwave`, `fog` (ash), `dust_storm`.|`snow`, `hail`, `rain`.|
|**`isSwamp`**|Marshes, mires, bogs.|`fog`, `heavy_rain`, `storm`.|`clear` (Rare).|
|**`isArctic`**|Frozen wastelands, ice caves.|`coldwave`, `snow`, `blizzard`.|`sun`, `heatwave`.|

### Implementation Rules

1. **Inheritance**: A map can have multiple tags (e.g., `isCave` + `isMountain`). In such cases, the MOST restrictive rule applies (e.g., `isCave` bans `snow` even if `isMountain` favors it).
2. **Probability Bias**: Regional weather tables MUST prioritize "Favored Weather" weights during the corresponding favored season (e.g., `isMountain` during Winter).
3. **Data Source**: Tags are defined in `src/data/maps.ts`.

---

## 13. Targeted Biome Tinting System

When applying CSS atmospheric filters (like hue-rotate, sepia, or brightness overlays) to biomes (e.g., cave brown, desert yellow), restrict the tint class only to specific asset families (e.g., `rock` or `tree`) instead of applying them globally to all scenery. This prevents visual saturation or excessive darkening, and keeps other colorful elements (like crystals or snow grass) clean and vibrant.
