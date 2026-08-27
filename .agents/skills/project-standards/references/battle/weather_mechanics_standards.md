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




