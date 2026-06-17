# Breeding System (Daycare) Manual

## 1. Compatibility

- **Ditto**: Compatible with any species except Legendaries and the "No-Eggs" group.
- **Resulting Species**: Always the base evolution (or "Baby") of the **Mother**.
- **Restriction**: Legendaries (`mewtwo`, `mew`, `articuno`, `zapdos`, `moltres`) cannot breed.

## 2. IV Inheritance

- **Base**: 3 random IVs are inherited from the parents (4 if the player has the **Breeder** class).
- **Power Items**: Force the inheritance of a specific stat:
  - **Power Weight**: HP
  - **Power Bracer**: Attack
  - **Power Belt**: Defense
  - **Power Lens**: Sp. Attack
  - **Power Band**: Sp. Defense
  - **Power Anklet**: Speed
- **Everstone**: If a parent carries it, it blocks their evolution and (optionally in future versions) inherits the Nature.

## 3. Breeding Costs

The cost in PokéDollars scales according to the total number of perfect IVs (30 or 31) that the parents possess:

- **0-2 IVs**: $2,000
- **3-5 IVs**: $5,000
- **6-8 IVs**: $12,000
- **9-11 IVs**: $25,000

---

## 4. Daily Missions (Event Missions)

- **Actionable Notifications**: Mission/daily quest notification counts in the global HUD must only increment if the player actually has compatible resources (e.g., required Pokémon in the team or boxes, free of other daycare slots or active missions) to fulfill the requirements. Avoid counting unachievable tasks.
- **Button Disabling**: The delivery buttons in daily/event mission lists must be disabled if the trainer does not have any eligible Pokémon in their inventory to prevent empty selection states or confusing user interactions.

## 5. HUD & Map Indicators

- **Daycare Warehouse Indicators**: Banners, alerts, and counters in the map or HUD regarding pending daycare actions MUST reflect the daycare warehouse (`daycareWarehouse`) inventory size (e.g., pending generated eggs) rather than the active incubating team slots, to prevent data redundancy and keep the trainer correctly informed about outstanding actions.

## 6. Daycare UI & State Restrictions

- **Busy State Blocking**: Pokémon placed in daycare (incubating/breeding, represented by daycare icons/states) MUST be prevented from being traded, put on GTS, released, sold (individually or bulk), or selected for active battles. They should be visually locked or disabled in selectors with explanatory badges.
- **Vertical Alignment & Centering**: Daycare slots (Ranura A and B) must display their layout elements (sprite, stats, items, status) vertically and center them across both desktop and mobile viewports.
- **Breeding Compatibility Emojis**: Emojis expressing breeding compatibility (e.g., compatibility rate indicators) must be rendered in dedicated wrappers and styled to a readable size (e.g., `26px`) rather than using default inline text font sizes (e.g., `10px`), ensuring high readability.
- **Inner Sprite Hover Target**: For hover animations on Daycare elements (like rotation or pulse effects on eggs), coordinate GSAP transitions directly on the inner sprite graphic element (`.egg-sprite`) instead of the container wrapper (`.egg-visual`) to prevent rotating the entire background or other layout elements.

## 7. Fossil DNA Cloning

The cloning system allows recreating ancestral Pokémon (Omanyte, Kabuto, Aerodactyl) using fossils.

- **Base Cost**: DNA cloning costs $3,000 for the base process.
- **Fossil Sacrifices**: The player can sacrifice up to 6 extra fossils of the same type. Each extra fossil adds +$1,000 to the cost (up to $9,000 max).
- **IV Reroll Formula**: The system performs `1 + N/2` independent IV rolls per stat (where `N` is the number of extra fossils, max 6) and keeps the highest value. Decimals (N = 1, 3, 5) guarantee the integer part and grant a 50% chance for an additional roll.
- **Shiny Chance Boost**: Each extra fossil adds a +25% boost to the base Shiny probability, scaling as `1 + N * 0.25` (up to a 2.5x multiplier with 6 sacrifices).
- **Daycare Lock**: Fossils cannot be used from the bag; DNA cloning must only be accessed and executed inside the Daycare interface.
