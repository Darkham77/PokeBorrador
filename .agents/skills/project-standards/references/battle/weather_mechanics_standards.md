# Weather Mechanics Standards

This technical manual unifies advanced combat weather rules (from Core Series, Pokemon Masters EX, and Pokemon Mystery Dungeon) to be used by the Poké Vicio engine.

---

## 🏛️ Official Weather Precedence Hierarchy

In full accordance with official Pokémon Showdown rules, combat damage, stat boosts, and move accuracies are governed strictly by active battle weather:

1. **Primal / Extreme Weather** (Desolate Land, Primordial Sea, Delta Stream): Overrides all weather conditions.
2. **Move & Ability Weather** (Sun, Rain, Sandstorm, Snow/Hail summoned in battle): Standard 5-8 turn weather effects.
3. **Gym Neutrality**: Gym battles disable environmental map weather (defaulting to `'clear'`), unless a combatant explicitly summons weather during battle.
4. **Day/Night Cycle Isolation**: The day and night cycle is strictly non-combat (affecting only map spawns, evolutions, and visual UI filters). It does NOT modify move damage or accuracy in combat.

---

## 🌪️ Complete Weather Combat Effects & Modifiers Table

| Weather | Token ID | Icon | Damage Boosts | Damage Reductions | Defensive & Stat Boosts | Residual Damage | Move & Accuracy Interactions |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Sun** | `sun` | ☀️ | Fire ($1.5\times$) | Water ($0.5\times$) | — | — | Solar Beam (Instant, 1-turn), Synthesis/Morning Sun/Moonlight ($66\%$ HP), Thunder/Hurricane ($50\%$ Acc) |
| **Intense Sun** | `intense_sun` | 🔆 | Fire ($2.0\times$), Grass ($1.5\times$) | Water (Blocked 🚫), Ice (Blocked 🚫) | — | — | Solar Beam (Instant, $+20\%$ Pow), Synthesis/Morning Sun ($75\%$ HP) |
| **Heatwave** | `heatwave` | 🔥 | Fire ($2.0\times$), Ground ($1.5\times$) | Grass (Blocked 🚫), Ice (Blocked 🚫) | — | Non-Fire ($1/16$ HP) | Solar Beam (Instant), Fire Blast ($100\%$ Acc) |
| **Rain** | `rain` | 🌧️ | Water ($1.5\times$), Electric ($1.2\times$) | Fire ($0.5\times$), Rock/Ground ($0.8\times$) | — | — | Thunder & Hurricane ($100\%$ Acc, bypass accuracy check), Solar Beam ($50\%$ Pow), Synthesis ($25\%$ HP) |
| **Heavy Rain** | `heavy_rain` | ☔ | Water ($2.0\times$) | Fire (Blocked 🚫) | — | — | Thunder/Hurricane ($100\%$ Acc), Water Spout ($+25\%$ Pow) |
| **Storm** | `storm` | ⛈️ | Water ($1.5\times$), Electric ($1.5\times$), Dragon ($1.2\times$) | Fire (Blocked 🚫), Flying (Blocked 🚫), Bug (Blocked 🚫) | — | Non-Water/Elec ($1/16$ HP) | Thunder ($100\%$ Acc, $+10\%$ Crit), Hurricane ($100\%$ Acc) |
| **Thunderstorm** | `thunderstorm` | 🌩️ | Electric ($2.0\times$), Dragon ($1.5\times$) | Flying (Blocked 🚫) | — | — | Thunder ($100\%$ Acc, $+20\%$ Pow, $50\%$ Paralysis chance) |
| **Snow** | `snow` | ❄️ | Ice ($1.3\times$) | Fire ($0.8\times$), Bug ($0.8\times$) | Ice ($1.5\times$ Physical Defense) | **None** (Gen 9 Standard) | Blizzard ($100\%$ Acc), Solar Beam ($50\%$ Pow), Synthesis ($25\%$ HP) |
| **Hail** | `hail` | 🌨️ | Ice ($1.3\times$) | Grass ($0.8\times$), Fire ($0.8\times$) | — | Non-Ice ($1/16$ HP per turn) | Blizzard ($100\%$ Acc), Solar Beam ($50\%$ Pow), Synthesis ($25\%$ HP) |
| **Blizzard** | `blizzard` | 🌬️ | Ice ($2.0\times$) | Fire (Blocked 🚫), Grass (Blocked 🚫), Bug (Blocked 🚫), Flying (Blocked 🚫) | Ice ($1.5\times$ Def & SpD) | Non-Ice ($1/8$ HP per turn) | Blizzard ($100\%$ Acc, $+20\%$ Freeze chance), Cold-based moves $+30\%$ Pow |
| **Cold** | `cold` | 🧊 | Ice ($1.2\times$) | Bug ($0.8\times$), Grass ($0.8\times$) | — | — | Ice-type moves $+10\%$ Freeze chance |
| **Coldwave** | `coldwave` | 🥶 | Ice ($1.5\times$) | Bug (Blocked 🚫), Grass (Blocked 🚫) | Non-Ice Speed $-50\%$ | Non-Ice ($1/16$ HP) | Blizzard ($100\%$ Acc), Frost Breath $+25\%$ Pow |
| **Wind** | `wind` | 🍃 | Flying ($1.3\times$), Bug ($1.3\times$) | Ground ($0.7\times$) | — | — | Tailwind duration $+2$ turns, Gust/Air Slash $+15\%$ Pow |
| **Strong Winds** | `strong_winds` | 🌀 | Flying ($1.5\times$), Dragon ($1.3\times$) | Bug (Blocked 🚫), Ground (Blocked 🚫) | Flying (Weaknesses Removed) | — | Delta Stream active effect: Removes Flying-type weaknesses |
| **Fog** | `fog` | 🌫️ | Ghost ($1.3\times$), Dark ($1.3\times$) | Flying ($0.7\times$) | — | — | **Accuracy: 60% (All Moves except bypass moves)**, Solar Beam ($50\%$ Pow), Defog clears field |
| **Mist** | `mist` | 💨 | Fairy ($1.3\times$), Water ($1.3\times$) | Fire ($0.8\times$) | Stat drops blocked for allies | — | Blocks stat stage lowering moves |
| **Sandstorm** | `sandstorm` | 🏜️ | Rock ($1.2\times$), Ground ($1.2\times$) | Fire ($0.8\times$), Flying ($0.8\times$) | Rock ($1.5\times$ Special Defense) | Non-Rock/Ground/Steel ($1/16$ HP per turn) | Solar Beam ($50\%$ Pow), Shore Up ($66\%$ HP recovery), Weather Ball becomes Rock |
| **Dust Storm** | `dust_storm` | 🌪️ | Rock ($1.5\times$), Ground ($1.5\times$) | Flying (Blocked 🚫), Bug ($0.5\times$) | Rock & Ground ($1.5\times$ SpD) | Non-Rock/Ground/Steel ($1/12$ HP per turn) | Ground/Rock accuracy $+10\%$, Mud-Slap $+50\%$ Pow |

---

## 🌪️ Advanced Combat Weather Rules

### 1. Masters EX Passive Weather Skills

In addition to standard weather multipliers, the engine supports specialized weather-triggered passive skills:

*   **Weather Buff (Climatología 5 Caract. ↑)**: Increases the user's Attack, Defense, Special Attack, Special Defense, and Speed by 30% while any weather condition is active.
*   **Weather Surge (Meteopotencia)**: Boosts the user's move damage when a weather condition is active (base multiplier: 1.2x).
*   **Weather Sync-Up (Clima Compresión)**: Speeds up action execution or sync gauge boosts under active weather.
*   **Weathered Warrior (Guerrero Climatológico)**: Increases move power (up to 1.3x) based on how long the current weather condition has been active.
*   **Weather Wipe (Clima Limpio)**: Has a chance (20% to 100%, depending on the passive tier 1–9) to remove all weather conditions from the field immediately after the user executes a move.
*   **EX Weather (EX Sunny / EX Rain)**: Extremely enhanced states that boost respective element attacks by 200% instead of the standard 50%.

### 2. Primal Creator Trio Overrides

The legendary weather-altering abilities of Kyogre, Groudon, and Rayquaza operate under supreme priority:

*   **Desolate Land (Tierra del Fin - Primal Groudon)**: Creates Extremely Harsh Sunlight. Water-type moves evaporate and fail completely. Traditional weather moves (Rain Dance, Sunny Day, Hail, Sandstorm) and abilities (Drizzle, Drought, Sand Stream, Snow Warning) fail to activate.
*   **Primordial Sea (Mar del Albor - Primal Kyogre)**: Creates Heavy Rain. Fire-type moves fail completely. Traditional weather moves and abilities fail to activate.
*   **Delta Stream (Ráfaga Delta - Mega Rayquaza)**: Creates Strong Winds. Eliminates all weaknesses of the Flying type (attacks of Electric, Ice, and Rock type deal neutral damage instead of super-effective). Traditional weather moves and abilities fail to activate.
*   **Dispel Protocol**: These extreme weather conditions expire immediately when the invoking Pokémon is switched out, recalled, or fainted.
*   **Air Lock / Cloud Nine**: Rayquaza's base Ability overrides and ignores active field weather effects (but does not dispel them).

### 3. Mystery Dungeon Combat Weather

Under specialized Mystery Dungeon battle dungeons, the following changes apply:
*   **Residual Damage**: Hail and Sandstorm deal exactly 1 to 5 HP (depending on the target level tier) every 10 turns to non-immune Pokémon.
*   **Natural Regeneration Lock**: During active Sandstorm, Hail/Snow, Rain, or Sun, the natural HP recovery of non-immune combatants is locked unless they hold a protective accessory (like the Weather Band).

### 4. Weather Ball Dynamics

*   **Move Base Power**: Doubled from 50 to 100 when any weather is active (Sun, Rain, Snow/Hail, Sandstorm), except under Strong Winds (`Delta Stream`).
*   **Type Shift Matrix**:
    *   *No weather / Strong Winds / Fog*: Normal type.
    *   *Sunny / Extremely Harsh Sunlight*: Fire type.
    *   *Rain / Heavy Rain*: Water type.
    *   *Hail / Snow*: Ice type.
    *   *Sandstorm*: Rock type.

### 5. Castform & Forecast Dynamics

*   **Forecast (てんきや)**: Signature Ability of Castform. Automatically transforms Castform's species form and typing according to the active weather:
    *   *Sun / Extremely Harsh Sun*: Sunny Form (Fire-type).
    *   *Rain / Heavy Rain*: Rainy Form (Water-type).
    *   *Hail / Snow*: Snowy Form (Ice-type).
    *   *Clear / Sandstorm / Fog / Strong Winds*: Normal Form (Normal-type).
*   **Suppression Protocol**: If Forecast is suppressed (e.g., via Gastro Acid) or lost, Castform immediately reverts to its Normal Form and typing. Transformed variants (via Transform move) do not shift form dynamically with the weather.

### 6. Weather-Extending Items

The duration of weather conditions summoned via moves or abilities is extended from 5 turns to 8 turns when the summoner holds the corresponding environmental rock:
*   **Heat Rock** (`heatrock`): Extends Sunny Day.
*   **Damp Rock** (`damprock`): Extends Rain Dance.
*   **Smooth Rock** (`smoothrock`): Extends Sandstorm.
*   **Icy Rock** (`icyrock`): Extends Hail/Snowscape.

### 7. Specialized Boss Combat Floor Weather

In specific boss battle encounters, specialized floor-wide environmental overrides apply:
*   **Magma**: Exclusive to Groudon boss fights. Any non-Fire-type Pokémon that touches the floor becomes Burned. Displaced or cleared only by Kyogre's `Primordial Sea`.
*   **Flooded**: Exclusive to Kyogre boss fights. All non-Water-type Pokémon suffer a Speed stage penalty (Slow state). Displaced or cleared only by Groudon's `Desolate Land`.
*   **Gust**: Exclusive to Rayquaza boss fights. Periodically displaces Pokémon and deals minor typeless residual damage.
### 8. Arena Layering & Legibility Standards

*   **Atmosphere vs Dialogue & HUD**: The weather particle container (`AtmosphereLayer`) operates at `z-index: calc(var(--z-base) + 20)`. To guarantee visual legibility under heavy weather effects (such as Dense Fog, Thunderstorms, or Sandstorms), all speech bubbles (`BattleTrainerSpeechBubble`), dialogue banners (`.retro-battle-dialog`), and combatant HUD cards (`BattleArenaHud`) MUST share the elevated `z-index: calc(var(--z-base) + 30)`.
*   **Viewport Encapsulation**: Atmospheric and virtual combat entities MUST remain encapsulated within the single `.battle-arena-content` viewport to prevent flexbox layout fracturing.

---

## 🌩️ Climate Mechanics and Block Rules

Weather in Poké Vicio is not just aesthetic; it defines the viability of certain Pokémon types in battle.

### 1. The "Block" Mechanic

Extreme weather conditions (Heatwave, Blizzard, Strong Winds, etc.) can **BLOCK** certain types.

- **Effect**: A blocked type cannot deal significant damage and suffers a drastic reduction in its secondary effect probabilities.
- **Visual**: In the Battle HUD, the blocked type icon will appear with a "🚫" symbol.

### 2. Family Hierarchies

Climates evolve from **Normal** to **Extreme**, increasing their modifiers:

- **Rain (🌧️) ➔ Heavy Rain (☔)**: From boosting Water to completely extinguishing Fire.
- **Sun (☀️) ➔ Intense Sun (🔆) ➔ Heatwave (🔥)**: From boosting Fire to blocking Grass/Ice.
- **Cold (🧊) ➔ Coldwave / Ola Frío (🥶)**: From boosting Ice to blocking Flying/Bug.

---

## 🌫️ Atmospheric Standards (Visual Fidelity)

All weather systems must adhere to the **Hybrid Retro-Modern** identity, prioritizing pixelated aesthetics without sacrificing fluidity.

### 1. The Universal Parallax Rule (UPR)

To prevent visual repetition and "grid" artifacts, all layered weather effects (Rain, Snow, Sandstorm, etc.) MUST implement randomized offsets:

- **Seed Injection**: The `AtmosphereLayer.vue` component MUST inject `--seed-x` and `--seed-y` variables based on a unique map/session seed. For seed hashing, the use of bitwise operators (`<<`) in JavaScript is STRICTLY FORBIDDEN, as they can produce negative integers that break GSAP durations. Always use `Math.abs()`.
- **Layer Desynchronization**: Primary (`.layer-1`) and secondary (`.layer-2`) layers MUST use `transform: translate3d()` using these variables.
- **Asymmetric Tiles**: Front and back layers MUST use prime-number tile sizes (e.g., 512px, 713px, 911px) to mask texture joins through asymmetric visual interference.

### 2. The Organic Variability Rule (OVR)

No animation may have a static duration. Every weather effect MUST be unique in its rhythm:

- **Speed Randomization**: The `duration` of GSAP tweens MUST be divided by a `speedVar` factor derived from the map's unique seed.
- **OVR Range (±20%)**: Speed variability MUST be strictly limited to the **0.8x to 1.2x** range. More extreme variations break the project's visual harmony.
- **Directional Synchronization**: Inverting movement directions in JavaScript based on the seed is FORBIDDEN if the CSS already applies a `scaleX(direction)` to the parent container. JS must always use fixed directions (negative for leftward movement) to avoid the "Double Flip" bug.
- **Triple Layering**: For gaseous effects (Fog, Mist), the use of three asymmetric layers is mandatory to break repetitive patterns.

### 3. GPU Efficiency & Fidelity

- **Zero-Blur Policy**: Never use `backdrop-filter: blur()` or `filter: blur()` on weather layers that cover the main stage, as it breaks Pixel Art fidelity.
- **Desaturated Noise**: All SVG-based noise (`feTurbulence`) MUST be desaturated using `feColorMatrix` to avoid "rainbow" artifacts.
- **No Shadow Overload**: Avoid `drop-shadow` on high-density layers (Snow/Rain). Use CSS `contrast` or `brightness` adjustments instead.





