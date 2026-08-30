# Breeding System (Daycare) Manual

> **Scope & Authority**: This manual serves as the Single Source of Truth for Daycare operations, IV inheritance, breeding costs, fossil cloning, egg incubation, vigor attributes, and hatching modal lifecycles in Poké Vicio.
> **Sources of Truth**:
> - Math & Cloning Formulas: [`../core/game_formulas_manual.md`](../core/game_formulas_manual.md)
> - Item Effects & Vigor: [`item_system_manual.md`](./item_system_manual.md)
> - UI Standards: [`../core/ui_ux_standards.md`](../core/ui_ux_standards.md)

---

## 1. 🐣 Compatibility & Rules

- **Ditto**: Compatible with any species except Legendaries and the "No-Eggs" undiscovered egg group.
- **Resulting Species**: Always the base evolution (or "Baby") of the **Mother**.
- **Legendary Restriction**: Legendaries (`mewtwo`, `mew`, `articuno`, `zapdos`, `moltres`, etc.) cannot breed.

---

## 2. 🧬 Genetic IV Inheritance

- **Base**: 3 random IVs are inherited from the parents (4 if the player has the **Breeder** class).
- **Power Items**: Force the guaranteed inheritance of a specific stat:
  - **Power Weight**: HP
  - **Power Bracer**: Attack
  - **Power Belt**: Defense
  - **Power Lens**: Sp. Attack
  - **Power Band**: Sp. Defense
  - **Power Anklet**: Speed
- **Everstone**: If a parent holds it, it blocks their evolution and guarantees passing down their Nature to the offspring.

---

## 3. 💰 Breeding Costs

The cost in PokéDollars scales according to the total number of perfect IVs (30 or 31) that the parents possess:

- **0-2 IVs**: $2,000
- **3-5 IVs**: $5,000
- **6-8 IVs**: $12,000
- **9-11 IVs**: $25,000

---

## 4. 📋 Daily Missions (Event Missions)

- **Actionable Notifications**: Mission/daily quest notification counts in the global HUD must only increment if the player actually has compatible resources (e.g., required Pokémon in the team or boxes, free of other daycare slots or active missions) to fulfill the requirements. Avoid counting unachievable tasks.
- **Button Disabling**: The delivery buttons in daily/event mission lists must be disabled if the trainer does not have any eligible Pokémon in their inventory to prevent empty selection states or confusing user interactions.

---

## 5. 🗺️ HUD & Map Indicators

- **Daycare Warehouse Indicators**: Banners, alerts, and counters in the map or HUD regarding pending daycare actions MUST reflect the daycare warehouse (`daycareWarehouse`) inventory size (e.g., pending generated eggs) rather than the active incubating team slots, to prevent data redundancy and keep the trainer correctly informed about outstanding actions.

---

## 6. 🔒 Daycare UI & State Restrictions

- **Busy State Blocking**: Pokémon placed in daycare (incubating/breeding, represented by daycare icons/states) MUST be prevented from being traded, put on GTS, released, sold (individually or bulk), or selected for active battles. They should be visually locked or disabled in selectors with explanatory badges.
- **Vertical Alignment & Centering**: Daycare slots (Ranura A and B) must display their layout elements (sprite, stats, items, status) vertically and center them across both desktop and mobile viewports.
- **Breeding Compatibility Emojis**: Emojis expressing breeding compatibility (e.g., compatibility rate indicators) must be rendered in dedicated wrappers and styled to a readable size (e.g., `26px`) rather than using default inline text font sizes (e.g., `10px`), ensuring high readability.
- **Inner Sprite Hover Target**: For hover animations on Daycare elements (like rotation or pulse effects on eggs), coordinate GSAP transitions directly on the inner sprite graphic element (`.egg-sprite`) instead of the container wrapper (`.egg-visual`) to prevent rotating the entire background or other layout elements.

---

## 7. 🦖 Fossil DNA Cloning

The cloning system allows recreating ancestral Pokémon (Omanyte, Kabuto, Aerodactyl) using fossils in the Daycare:

- **Base Cost**: DNA cloning costs $3,000 for the base process.
- **Fossil Sacrifices**: The player can sacrifice up to 6 extra fossils of the same type. Each extra fossil adds +$1,000 to the cost (up to $9,000 max).
- **IV Reroll Formula**: The system performs `1 + N/2` independent IV rolls per stat (where `N` is the number of extra fossils, max 6) and keeps the highest value. Decimals (N = 1, 3, 5) guarantee the integer part and grant a 50% chance for an additional roll.
- **Shiny Chance Boost**: Each extra fossil adds a +25% boost to the base Shiny probability, scaling as `1 + N * 0.25` (up to a 2.5x multiplier with 6 sacrifices).
- **Daycare Lock**: Fossils cannot be used from the bag; DNA cloning must only be accessed and executed inside the Daycare interface.

---

## 8. ⚡ Vigor & Hatching Rules

- **Fossils and Legendaries**: Are born with `maxVigor = 0` and `vigor = 0`. They cannot breed, and vigor candy/restorers have no effect on them.
- **Hatched Eggs (Crías)**:
  - **Player Eggs**: Born with a random maximum vigor between 1 and 3.
  - **NPC Eggs**: Born with a random maximum vigor between 3 and 6 (1d4+2).
- **Vigor UI & Bars**: All summary views and daycare slot panels must read the dynamic `maxVigor` attribute of the Pokémon instead of hardcoding a limit of 10. The visual progress bar width must scale dynamically based on `(vigor / maxVigor) * 100`.
- **Breeding Tags**:
  - The manual breeding selection tag is named **Genética** (`GEN`) with the `🧬` DNA icon.
  - The automatic egg-born identifier is the **Cría** tag with the `🥚` egg icon.

---

## 9. 🎁 NPC & Rival Baby Egg Rewards & Incubator Capacity

### 1. Drop Probabilities & Exclusions
- **Normal NPC Trainers**: Defeating any normal NPC trainer on routes has a **2%** chance (`NPC_NORMAL_BABY_EGG_DROP_CHANCE = 0.02`) of dropping a mysterious baby Pokémon egg (`isNpc: true`).
- **Rivals**: Defeating a Rival has a **5%** chance (`RIVAL_BABY_EGG_DROP_CHANCE = 0.05`) of dropping a baby Pokémon egg.
- **Strict Exclusions**: Gym battles (`isGym`), PvP battles (`isPvP`), and wild Pokémon encounters (`!isTrainer`) NEVER award eggs (0% chance).
- **Baby Pool**: The rewarded egg is randomly chosen from the enabled baby Pokémon pool (`pichu`, `cleffa`, `igglybuff`, `togepi`, `tyrogue`, `smoochum`, `elekid`, `magby`).

### 2. Incubator Capacity & Full Slot Rules
- **Slot Capacity**: The trainer's backpack incubator holds up to 6 regular Daycare eggs (`MAX_CARRIED_EGGS = 6`) plus 1 extra reserved slot for NPC eggs (`MAX_NPC_CARRIED_EGGS = 1`), for a total maximum capacity of 7 eggs (`MAX_TOTAL_CARRIED_EGGS = 7`).
- **Full Slot Blocking**: If the trainer is already carrying 7 total eggs or already has an active NPC egg in the incubator (`npcEggs.length >= 1`), no egg reward can be obtained upon winning.
- **Reporting**: Awarded eggs are announced in the combat log (`log-catch`) and via UI notification toasts.
- **Full Wild Vigor**: Upon hatching via `executeHatch`, the baby Pokémon is born with full wild vigor (`3 to 6`) instead of reduced daycare vigor.

---

## 10. 🥚 Interactive Egg Hatching Lifecycle & Animation Protocols

Hatching follows a structured 3-phase interactive lifecycle orchestrated by `HatchAnimationModal.vue`:

1. **Egg Phase**: Requires a **manual click/interaction** to progress. The egg shakes and pulses.
2. **Break Phase**: Intense vibration, cracking overlay, and ambient particle burst.
3. **Reveal Phase**: Plays `evolution_complete` audio fanfare, lifts the sprite by `-85px`, and unveils the newly born Pokémon with its genetic stats card.

### CLI Debugging Commands
```js
// Silent creation protocol
window.__VITE_DEBUG__.createPokemon({ id: 'houndour', protocol: 'hatch' });

// Full interactive animation modal protocol
window.__VITE_DEBUG__.createPokemon({ id: 'houndour', protocol: 'hatch_anim' });
```
