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
