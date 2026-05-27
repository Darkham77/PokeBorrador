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

