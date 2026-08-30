# Game Mechanics & Engine Architecture Manual (Poké Vicio)

> **Scope & Authority**: This manual serves as the architectural overview and coordination standard for core gameplay mechanics, UI interaction standards, the `GameBus` event pipeline, and visual-logical synchronization in Poké Vicio.
> **Sources of Truth & Subsystem Manuals**:
> - Battle State & Flow: [`../battle/battle_mechanics_manual.md`](../battle/battle_mechanics_manual.md)
> - Math & Formulas: [`./game_formulas_manual.md`](./game_formulas_manual.md)
> - UI/UX Standards: [`./ui_ux_standards.md`](./ui_ux_standards.md)
> - Daycare & Breeding: [`../systems/breeding_manual.md`](../systems/breeding_manual.md)
> - Encounters & Spawns: [`../systems/encounter_manual.md`](../systems/encounter_manual.md)
> - Weather Standards: [`../battle/weather_mechanics_standards.md`](../battle/weather_mechanics_standards.md)
> - Items & Economy: [`../systems/item_system_manual.md`](../systems/item_system_manual.md)
> - Capturing Mechanics: [`../systems/capturing_manual.md`](../systems/capturing_manual.md)

---

## 1. 🔄 Interaction & Selection Standards

### 1.1 Slot Selection and Replacement Parity
- **Selector Callbacks**: When replacing or swapping active team members, the slot selector component MUST receive a callback that performs the atomic exchange of entity UIDs.
- **Visual Feedback**: The slot exchange action triggers a visual swap animation while preserving the active state in the store.

### 1.2 Team Drag-and-Drop (DND) Reordering
- **Position Indices**: During party reordering via Drag-and-Drop, display large pixelated numbers (1-6) over the target slots to indicate the final position.
- **Tooltip Suppression**: Deactivate (`disabled`) all `PVTooltip` instances during dragging to prevent tooltips from obstructing drop targets.
- **Silent Persistence**: Trigger an automatic silent save (`save(false)`) after each successful party reordering operation.

---

## 2. 🎨 UI & Component Hierarchy (Hybrid Retro-Modern)

### 2.1 Badge and Tag Hierarchy
- **Semantic Independence**: Gender and Level badges MUST NOT be nested inside unified wrappers. Use dedicated flex containers so each badge maintains its independent borders, mixins, and styling.
- **Type Pills**: Long type names (e.g., "FIGHTING", "ELECTRIC") must specify `width: auto` and `min-width` to prevent typography clipping inside the pill container.

### 2.2 Fog of War & Discovery States
- **Night Silhouettes**: In dark or night environments, undiscovered/unseen Pokémon sprites must apply the `pokemon-silhouette` mixin with a 50% white contrast outline for optimal readability.
- **Time Cycle Emojis**: Use standardized emojis (🌅, 🌞, 🌇, 🌙) in spawn tooltips to conserve layout space while reinforcing the retro aesthetic.
- **Spoiler Shield**: Suppress specific active time details in tooltips for Pokémon that have not yet been registered as seen or caught in the Pokédex (`!isSeen && !isCaught`).

---

## 3. ⚙️ Engine Logic & Decoupled Event Architecture (Vue + GameBus)

All visual-logic decoupled communication between independent subsystems uses the native `gameBus` event pipeline.

### 3.1 Battle Animation Triggers
Battle animations (faint, withdraw, send_out, status_hit) MUST be triggered via the `gameBus` using standardized event types:

```ts
// Standard Animation Trigger
gameBus.emit('animation', { 
  type: 'faint', 
  target: 'player', 
  index: 0 
});
```

### 3.2 Component Safety & Zero-Timer Compliance
Any asynchronous or delayed operation within a visual component MUST be driven by GSAP (`gsapSleep` or `gsap.delayedCall`) and verify component mount state before acting:

```ts
gsap.delayedCall(delayInSeconds, () => {
  if (instance?.isUnmounted) return;
  // Logic...
});
```

---

## 4. 🌩️ Climate Mechanics & Block Rules

Weather in Poké Vicio is not just aesthetic; it dynamically defines the viability of certain Pokémon types in battle:

- **The "Block" Mechanic**: Extreme weather conditions (Heatwave, Blizzard, Strong Winds) can **BLOCK** certain types (indicated by a 🚫 symbol in the HUD). Blocked types cannot deal significant damage and suffer reduced secondary effect chances.
- **Family Hierarchies**: Climates evolve from Normal to Extreme (e.g. Rain ➔ Heavy Rain, Sun ➔ Intense Sun ➔ Heatwave, Cold ➔ Coldwave).
- **Universal Parallax Rule (UPR)**: Atmospheric layers use randomized offsets (`--seed-x`, `--seed-y`) and prime-number tile sizes to eliminate repetitive grid patterns.
- **Organic Variability Rule (OVR)**: Weather animation speeds vary within a strict ±20% factor (`0.8x` to `1.2x`) derived from the map seed.

---

## 5. ⚡ Visibility, Performance & The Void Protocol

During high-load transitions and combat conclusion:

- **Lean Rendering**: Non-essential elements (MapCards, background weather animations) MUST be physically hidden or paused via `v-show` / `v-if` during active combat.
- **The Void Protocol**: During the rewards and level-up phases (`REWARDS_PHASE`, `LEVEL_UP_MODAL`), the entire battlefield stage enters a clean "Void" state (`VOID_STATE`). The enemy sprite is hidden immediately after faint/capture, and all visual traces/snapshots are completely cleared to eliminate graphical artifacts.

---

## 6. 🎒 Inventory & Resource Management (SSoT)

- **Single Source of Truth (SSoT)**: Resource counters (especially Poké Balls and common items) MUST derive their totals dynamically from the full `inventory` state.
- **Forbidden Isolated State**: Relying on isolated state flags (e.g., `state.balls`) that are not automatically updated by inventory operations is strictly prohibited.
- **Aggregated HUD Displays**: For resources with multiple varieties (Poké Balls, Evolutionary Stones), the HUD pill displays the aggregate sum of all items in that category, while the associated `PVTooltip` provides the granular itemized breakdown.

---

## 7. 🕹️ Minigame & Modal Coordination

- **Parity of Duplicated Component Contexts**: When gameplay mechanics are split across multiple component scopes (e.g. `ArchaeologyMinigame.vue` and `ArchaeologyModal.vue`), all logic rules, multipliers, formulas, and reward tables MUST be kept 100% identical across all instances.
- **Modal Callback & Lifecycle Synchronization**: Encapsulate modal closing logic in a local handler (e.g. `handleCloseModal`) that dispatches both local Vue event emits (`@close`) and external callbacks (`onCloseCallback`).
