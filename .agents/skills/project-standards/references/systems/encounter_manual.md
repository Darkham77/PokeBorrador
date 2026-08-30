# Encounter Systems Manual

## 1. Encounter Types

- **Wild**: Base probability according to the route.
- **Trainer**: Appear according to a "Pity" timer that increases by 5% every 2 minutes (max 20%).
- **Fishing**: Only on water routes, 10% base probability.
- **Defenders (Dominance Phase)**: 20% probability of finding a defender from the enemy faction on dominated maps during the weekend.

## 2. Guardians (Alpha Pokémon)

- **Spawn**: 1% probability on disputed maps.
- **Limit**: Only 1 guardian catch per map per day.

## 3. Repels and Incenses

- **Repel**: Blocks wild encounters whose levels are lower than the first Pokémon in the team. Increases the probability of Trainers to 30%.
- **Incense**: Filters the route's encounter pool to favor a specific **elemental type**.

## 4. Discovery & Pokedex Flags

The system uses two independent flags computed from the Pokédex state to determine visual representation:

1. **isSeen**: `seenPokedex.includes(id)`. Reveals name and types in tooltips.
2. **isCaught**: `pokedex.includes(id)`. Shows the actual sprite.
3. **Silhouette**: Unseen Pokémon (`isSeen = false`) show a solid black silhouette on the map to encourage exploration. In the Pokédex, they are shown as `???`.

---

## 5. Atmospheric & Temporal Influence

The appearance of Pokémon on the map is dynamically controlled by the intersection of the **Time Cycle** and **Weather Conditions**.

### 5.1 Combination Logic (Expandable Window)

To maximize player agency and world dynamism, the system uses an **OR (Additive)** logic:

- A Pokémon appears if the current **Time Phase** matches its schedule.
- **OR** if the current **Weather** favors its elemental type, even if it is outside its normal hours.

### 5.2 Source of Truth

All logic regarding weather generation, hierarchy, intensity tiers, and **spawn modifiers (Boost/Block)** is centralized in the [Time & Atmosphere Manual](../core/time_system_manual.md).

### 5.3 Advanced Weather Parity

Advanced weather types (Thunderstorm, Heatwave, blizzard, etc.) do NOT have automatic fallback to their base counterparts (Storm, Sun, Snow) in the encounter logic.

- **Mandatory Definition**: Every route with an advanced weather probability MUST have an explicit entry in `FIRE_RED_MAPS` weather configuration, or no visitors/exclusives will spawn during that event.
- **Legendary Patterns**: Extreme weather (L4) should be used as a trigger for legendary or pseudo-legendary "Exclusives" (1-5% chance) to reward exploration under dangerous conditions.

### 5.4 Dynamic Environmental Overlays & Biome Hierarchy

When resolving biome-specific combat overlays (e.g., dynamic bushes, rocks, boxes), highly specific biomes like `isArctic` MUST take precedence over generic biomes like `isCave` in the resolution hierarchy (`bushLibrary.ts`). This ensures that unique maps (such as Seafoam Islands / Islas Espuma) receive their correct specialized environmental assets and tinting.

### 5.5 Weather Multiplier Bypass for Exclusives

Pokémon designated as weather-exclusives in the location configuration must bypass the type-based weather block/debuff multipliers of their own active weather. This ensures type-restricted species (e.g. Zapdos, a Flying-type) can correctly spawn during the weather condition (e.g. Storm) that introduces them.

---

## 6. Encounter Quality (IVs and Potential)

IV generation is not purely random; it is heavily influenced by the encounter context.

### 6.1 Floor Logic (ivFloor)

The system applies a dynamic `ivFloor` before creation. The final IV for each stat is `Math.max(ivFloor, randomValue)`.

- **Bug Catcher (Streak)**: The floor equals the player's current catch streak.
- **Class Missions**:
  - 6h: Floor 5.
  - 12h: Floor 10.
  - 24h: Floor 15.

### 6.2 The Guardian Method (Double Roll)

Guardian Pokémon utilize a **Double Dice Roll** algorithm. Two random values are generated and the higher one is selected, shifting the probability curve toward higher values.

- **Fixed Floor**: Guardians have an immutable `ivFloor` of **12** across all stats.

### 6.3 War Bonuses (Dominance)

If a map is under the total control of the player's faction, the **Dominance Bonus** activates:

- **Effect**: All wild Pokémon caught on that map have a guaranteed floor of **15 IVs** across all stats.

## 7. Police and Criminality Encounters

For players belonging to the Team Rocket class, reaching maximum criminality (100% or higher) triggers combat encounters with the police:

- **Archetype and Sprite Selection**: The system utilizes the dedicated `policeman` archetype. Instead of fallback sprites (e.g., `tamer`), it dynamically selects a random sprite from the policeman catalog pool (`policeman`, `policeman-gen4`, `policeman-gen7`, `policeman-gen8`) to provide visual variety.
- **Encounter Stats**: Level scaling is derived from the map's base level plus an incremental level bonus scaled by criminality exceeding 100%.

---

## 8. Castform Weather Family Spawn Generation Standards

To prevent data drift and manual omissions when registering Castform in spawn tables, the map configurations MUST follow the `WEATHER_FAMILIES` grouping layout:

1. **Weather Family Mapping Rules:**
   - **Rain Family** (`rain`, `heavy_rain`, `storm`, `thunderstorm`): Castform MUST be blended as a weather-exclusive (`exclusive`) species on maps designated to have rainy environments.
   - **Sun Family** (`sun`, `sunny`, `heatwave`, `intense_sun`): Castform MUST be blended as a weather visitor (`visitors`) with a balanced relative weight (e.g., 30 to 50) on maps designated to have hot or desert environments.
   - **Snow Family** (`snow`, `blizzard`, `cold`, `hail`, `coldwave`): Castform MUST be blended as a weather visitor (`visitors`) with a balanced relative weight on maps designated to have snowy or mountain environments.

2. **Integration Constraint:**
   - Always mix Castform without overriding existing weather-exclusives or visitors.
   - Castform must always spawn in its base Normal Form when encountered wild.

---

## 9. Wild Spawn Calculation and Balance Rules

### 9.1 Unified Spawn Probability Calculation
To prevent desynchronization between combat generation and the UI spawn details modal, all ground encounter rates MUST be resolved using the unified `getFinalGroundRates` function. This function aggregates:
- Base location rates.
- Weather-specific multipliers (boost/block).
- Weather visitor quotas (allocating a proportional 10% of total native weight to weather visitors).
- Legendary probability capping.

### 9.2 Legendary Spawn Probability Cap (1%)
Under all circumstances, weather conditions, time cycles, and routes, a single legendary Pokémon's final spawn probability MUST NOT exceed exactly **1%** when other species exist in the active pool.
- **Dynamic Balancing Formula**: To cap a legendary's probability at 1% without altering the relative ratios of other species, calculate a dynamic weight cap:
  \[\text{cap} = \frac{\sum \text{Other Rates}}{99}\]
- If a legendary's rate exceeds this cap, reduce it to the cap value. This guarantees the final legendary probability remains exactly \(\le 1\%\), while the remaining \(\ge 99\%\) is dynamically shared by non-legendary species.
- Apply this capping to both ground pools (`getFinalGroundRates`) and fishing pools (`generateFishingEncounter`).

---

## 10. Coordinated Field Modifiers Pipeline (FieldRulesCoordinator)

All modifications to wild encounters, fishing weights, held item chances, and spawn pools are unified under `resolveFieldEncounterModifiers` in `src/logic/rules/fieldRulesCoordinator.ts`:

- **Nature Synchronization**: Sincronía forces 100% nature match in Gen 8+ (50% in Gen 3-7).
- **Gender Attraction**: Gran Encanto / Cute Charm forces 66.7% opposite gender on binary-gender wild species.
- **Held Item Boosts**: Ojo Compuesto / Compound Eyes and Afortunado / Super Luck increase wild common/rare held item rates (to 60% and 20%).
- **Elemental Attraction**: Imán (Steel), Elec. Estática & Pararrayos (Electric), Absorbe Fuego (Fire), Colector (Water), Cosecha (Grass) filter or heavily weight species of matching type.
- **Encounter Rate Multipliers**: Trampa Arena, Iluminación, Indefenso (2.0x); Hedor, Humo Blanco, Pies Rápidos, Velo Arena, Manto Níveo (0.5x).
- **Fishing Multipliers**: Ventosas & Viscosidad increase fishing encounter weight (1.5x - 2.0x).
- **Level Range Filtering**: Intimidación & Vista Lince avoid encounters $\le 5$ levels below leader; Presión, Espíritu Vital & Entusiasmo force max route level (50% chance).

---

## 11. Weather & Terrain Resolution Rules

### 11.1 Dual-Type Modifier Evaluation
When evaluating weather spawn modifiers (boosts, debuffs, or blocks in `getWeatherMultiplier`), calculations MUST evaluate both the primary type (`type`) and the secondary type (`type2`). Dual-type species (such as Pidgey, which is Normal/Flying) must be subject to blocks affecting either of their types (e.g. storm blocking Flying types) to prevent invalid encounters from appearing on the map or report list.

### 11.2 Comprehensive Terrain Tags Display
When presenting map terrain tags (under "Entorno" or similar details panel), avoid nesting ternaries in Vue templates which limit display to the first matching tag. Implement a computed list (e.g. `terrainTags`) to list all active environment flags (such as both Crystal Cave and Cave, or Volcano and Plains) simultaneously.


