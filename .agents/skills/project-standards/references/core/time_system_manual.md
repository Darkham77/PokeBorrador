# Time System & Atmosphere Persistence Manual

## 1. Time Cycle and Seasons

- **Speed**: 1 real day (24h) is equivalent to **3 in-game days** (8h cycles).
- **Phases (2h each)**: Morning, Day, Evening, Night.
- **Seasons**: Change every **Real Week** (7 days) in sequence: Spring -> Summer -> Autumn -> Winter.
- **Synchronization**: Strictly based on continuous *Epoch Time* to guarantee parity among all players without querying the DB.

## 2. Weather Persistence & Priority

The system uses a hierarchical approach to determine the active weather and ensure it correctly reverts after temporary effects:

- **Base State**: The map weather defines the battlefield's atmospheric condition.
- **Combat Overrides**: Moves (Rain Dance) or Abilities (Drizzle) override the map weather for **5 turns**.
- **Cycle Restoration**: When a combat-induced weather expires, the engine MUST RESTORE the original map/route weather (e.g., if it was raining on the route, it returns to rain, not "clear").
- **Permanent States**: If a route has a permanent weather (turns: -1), it remains active for the entire battle duration unless manually overridden.

## 3. Implementation Standard (Node.js 26+)

- **Temporal API Mandate**: The legacy `Date` object is FORBIDDEN for logic related to cycles, seasons, or event durations.
- **Time Zone**: Always use `America/Argentina/Buenos_Aires` as the reference for server-time synchronization.
- **Precision**: Use `Temporal.Instant` for absolute timestamps and `Temporal.Duration` for calculations.
- **Example**:

  ```typescript
  const now = Temporal.Now.zonedDateTimeISO('America/Argentina/Buenos_Aires');
  const isWeekend = now.dayOfWeek >= 6;
  ```

## 4. Climate Hierarchy and Mechanics (Gen 6-9 Standards)

Poké Vicio implements a dual hierarchy system for atmospheric conditions:

### 4.1 Temperatures vs Conditions

- **Temperatures**: Define the thermal state (Sun, Heatwave, Cold, Coldwave).
- **Conditions**: Define atmospheric phenomena (Rain, Storm, Snow, Blizzard, Sandstorm, Fog, Wind).

### 4.2 Official Hierarchy and Mechanics

| Category | Normal | Extreme | Official Mechanic (Normal -> Extreme) |
| :--- | :--- | :--- | :--- |
| **Temperature** | Sun (☀️) | Heatwave (🔥) | Fire+ / Water- -> **Desolate Land** (Water fails). |
| **Temperature** | Cold (❄️) | Coldwave (🥶) | +Ice Def -> **Hail** (Turn damage). |
| **Water** | Rain (☔) | Storm (⚡) | Water+ / Fire- -> **Primordial Sea** (Fire fails). |
| **Ice** | Snow (❄️) | Blizzard (🌬️) | +Ice Def -> **Extreme Snow** (Dmg + Visibility). |
| **Air** | Mist (🌫️) | Fog (⬜) | Aesthetic -> **Gen 4 Fog** (-Accuracy). |
| **Earth** | Wind (🍃) | Strong Winds (🌀) | Aesthetic -> **Delta Stream** (Removes Flying Weakness). |
| **Sand** | -- | Sandstorm (🌪️) | Turn Dmg + SpD Rock (Standard Mechanics). |

### 4.3 Visual Standards

- **Normal States**: Subtle radial gradients and color pulses.
- **Extreme States** (Heatwave, Coldwave, Strong Winds): Strong vignettes and pulse signatures in the `AtmosphereLayer`.
