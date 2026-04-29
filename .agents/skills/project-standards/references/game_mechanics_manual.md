# Game Mechanics and UX Manual (Poké Vicio)

This manual details the design conventions and specific interaction rules that define the user experience in Poké Vicio.

## 🕹️ Interaction and Selection

### 1. Selection Parity in Slots

Every slot that displays a member of a team (Adventure, PVP, War) MUST allow direct **"REPLACE"** (Swap) interaction.

- **Rule**: Do not force the user to remove a Pokémon to add another. Provide a change button (🔄) that opens the selector.
- **Pattern**: The selector must receive a callback that handles the atomic exchange of UIDs.

### 2. Sorting and DND (Drag-and-Drop)

- **Visual Feedback**: During reordering, display large pixelated numbers (1-6) over the slots to indicate the final position.
- **Tooltip Interference**: Deactivate (`disabled`) `PVTooltip` during dragging to prevent them from blocking the drop zone.
- **Silent Persistence**: Trigger an automatic save (`save(false)`) after each successful reordering operation.

---

## 🎨 Interface Standards (Hybrid Retro-Modern)

### 1. Badge and Tag Hierarchy

- **Semantic Independence**: Do not nest Gender and Level badges. Use dedicated flex containers so they maintain their independent borders and mixins.
- **Type Pills**: Long names (e.g., "FIGHTING") must use `width: auto` and `min-width` to avoid clipping in the pill.

### 2. Visibility and Filters

- **Night Silhouettes**: In dark environments, unknown Pokémon must use the `pokemon-silhouette` mixin with a 50% white border for contrast.
- **Time Emojis**: Use emojis (🌅, ☀️, 🌇, 🌙) in spawn tooltips to save space and maintain the retro aesthetic.
- **Spoiler Shield**: Hide specific times for Pokémon not caught/seen.

---

## ⚙️ Engine Logic (Vue + Phaser Bridge)

### 1. Loading Stabilization

- The `BootScene` must have a minimum delay (e.g., 500ms) before signaling readiness. This ensures that the loading message is legible and the browser processes the atlases.
- **Black Background**: During loading, the `App.vue` background must be absolute black (`var(--darker)`) to avoid visual flickering.

### 2. Callback Crash Prevention

Any `setTimeout` or `Promise` within a Phaser scene must verify the existence of the scene before acting:

```js
setTimeout(() => {
  if (!this.scene || !this.scene.manager || this.game?.pendingDestroy) return;
  // Logic...
}, delay);
```

---

## 🐣 Breeding System (Daycare)

### 1. Compatibility

- **Ditto**: Compatible with any species except Legendaries and the "No-Eggs" group.
- **Resulting Species**: Always the base evolution (or "Baby") of the **Mother**.
- **Restriction**: Legendaries (`mewtwo`, `mew`, `articuno`, `zapdos`, `moltres`) cannot breed.

### 2. IV Inheritance

- **Base**: 3 random IVs are inherited from the parents (4 if the player has the **Breeder** class).
- **Power Items**: Force the inheritance of a specific stat:
  - **Power Weight**: HP
  - **Power Bracer**: Attack
  - **Power Belt**: Defense
  - **Power Lens**: Sp. Attack
  - **Power Band**: Sp. Defense
  - **Power Anklet**: Speed
- **Everstone**: If a parent carries it, it blocks their evolution and (optionally in future versions) inherits the Nature.

### 3. Breeding Costs

The cost in PokéDollars scales according to the total number of perfect IVs (30 or 31) that the parents possess:

- **0-2 IVs**: $2,000
- **3-5 IVs**: $5,000
- **6-8 IVs**: $12,000
- **9-11 IVs**: $25,000

---

## 🦄 Encounter Systems

### 1. Encounter Types

- **Wild**: Base probability according to the route.
- **Trainer**: Appear according to a "Pity" timer that increases by 5% every 2 minutes (max 20%).
- **Fishing**: Only on water routes, 10% base probability.
- **Defenders (Dominance Phase)**: 20% probability of finding a defender from the enemy faction on dominated maps during the weekend.

### 2. Guardians (Alpha Pokémon)

- **Spawn**: 1% probability on disputed maps.
- **Limit**: Only 1 guardian catch per map per day.

### 3. Repels and Incenses

- **Repel**: Blocks wild encounters whose levels are lower than the first Pokémon in the team. Increases the probability of Trainers to 30%.
- **Incense**: Filters the route's encounter pool to favor a specific **elemental type**.

---

## 🧬 Evolution Logic

### 1. Evolution by Level

- **Standard**: Activated upon reaching the level defined in `evolutionData.js`.
- **Tyrogue**: Evolves at level 20 based on its stats: Atk > Def (**Hitmonlee**), Def > Atk (**Hitmonchan**), Tie (50/50).

### 2. Wild Evolution (Auto-Evo)

When the system generates a high-level wild Pokémon, it applies an automatic evolution process:

- **Stones/Trade**: 50% probability of evolving if the level is >= 30 (stone) or >= 32 (trade).

### 3. Evolutionary Stones

- **Eevee**: Requires Water Stone (Vaporeon), Thunder Stone (Jolteon), or Fire Stone (Flareon).

---

## 👁️ Pokédex Visibility

The system uses two independent flags computed from the Pokédex state:

1. **isSeen**: `seenPokedex.includes(id)`. Reveals name and types in tooltips.
2. **isCaught**: `pokedex.includes(id)`. Shows the actual sprite.
3. **Silhouette**: Unseen Pokémon (`isSeen = false`) show a solid black silhouette on the map to encourage exploration. In the Pokédex, they are shown as `???`.

---

## 🌞 Time Cycle and Seasons

- **Speed**: 1 real day (24h) is equivalent to **3 in-game days** (8h cycles).
- **Phases (2h each)**: Morning, Day, Evening, Night.
- **Seasons**: Change every **Real Week** (7 days) in sequence: Spring -> Summer -> Autumn -> Winter.
- **Synchronization**: Strictly based on continuous *Epoch Time* to guarantee parity among all players without querying the DB.

---

## ⚡ Visibility and Performance (Lean Rendering)

During high-load scenes (e.g., Battles), the hiding protocol is applied:

- **v-if**: Non-essential elements (MapCards, NPCs, background weather animations) MUST be physically hidden.
- **Pause**: All JS intervals (weather, buffs) must be paused while the combat state is active.
