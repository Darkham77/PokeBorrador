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
- **Time Emojis**: Use emojis (🌅, 🌞, 🌇, 🌙) in spawn tooltips to save space and maintain the retro aesthetic.
- **Spoiler Shield**: Hide specific times for Pokémon not caught/seen.

---

## ⚙️ Engine Logic (Vue + GameBus)

All visual-logic communication must use the `GameBus` native event system. This architecture ensures total decoupling from any specific game engine (e.g., Phaser is deprecated).

### 1. Battle Animations

Battle animations (faint, withdraw, send_out, status_hit) MUST be triggered via the `GameBus` using standardized event types.

```js
// Standard Animation Trigger
gameBus.emit('animation', { 
  type: 'faint', 
  target: 'player', 
  index: 0 
});
```

### 2. Component Safety

Any async operation within a visual component must verify the existence of the component before acting.

```js
setTimeout(() => {
  if (instance?.isUnmounted) return;
  // Logic...
}, delay);
```

---

## 🦄 Specialized Systems

To maintain a modular documentation structure, detailed rules for specialized systems have been moved to their own manuals:

- **[Breeding System (Daycare)](../systems/breeding_manual.md)**: Compatibility, IV inheritance, and costs.
- **[Evolution Logic](../systems/evolution_manual.md)**: Level evolution, wild auto-evo, and stones.
- **[Encounter Systems](../systems/encounter_manual.md)**: Encounter types, Guardians, Repels, and Visibility hierarchy.
- **[Time Cycle and Seasons](./time_system_manual.md)**: Phase cycles, seasons, and weather persistence.

---

## 🌩️ Climate Mechanics and Block Rules

The weather in Poké Vicio is not just aesthetic; it defines the viability of certain Pokémon types in battle.

### 1. The "Block" Mechanic

Extreme weather conditions (Heatwave, Blizzard, Strong Winds, etc.) can **BLOCK** certain types.

- **Effect**: A blocked type cannot deal significant damage and suffers a drastic reduction in its secondary effect probabilities.
- **Visual**: In the Battle HUD, the blocked type icon will appear with a "🚫" symbol.

### 2. Family Hierarchies

Climates evolve from **Normal** to **Extreme**, increasing their modifiers:

- **Rain (🌧️) -> Heavy Rain (☔)**: From boosting Water to completely extinguishing Fire.
- **Sun (☀️) -> Intense Sun (🔆) -> Heatwave (🔥)**: From boosting Fire to blocking Grass/Ice.
- **Cold (🧊) -> Ola Frío (🥶)**: From boosting Ice to blocking Flying/Bug.

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

---

---

## ⚡ Visibility and Performance (Lean Rendering)

During high-load scenes (e.g., Battles), the hiding protocol is applied:

- **v-if**: Non-essential elements (MapCards, NPCs, background weather animations) MUST be physically hidden.
- **Pause**: All JS intervals (weather, buffs) must be paused while the combat state is active.
- **The Void Protocol**: During the rewards and level-up phases, the entire stage MUST enter a "Void" state (Completely empty). The enemy sprite is hidden immediately after the faint or capture sequence finishes to focus on the rewards flow. This avoids "ghosting" and maintains a clean interface for the user's progress summary. When entering the `VOID_STATE`, all visual traces, snapshots, and animation states of the Pokémon MUST be completely removed to prevent any graphical artifacts in the subsequent steps.

---

## 🎒 Inventory & Resource Management (SSoT)

To ensure data integrity and prevent visual desynchronization between the HUD and the Bag:

1. **Single Source of Truth (SSoT)**: Resource counters (especially Poké Balls and common items) MUST derive their totals dynamically from the full `inventory` state.
2. **FORBIDDEN**: Relying on isolated state flags (e.g., `state.balls`) that are not automatically updated by inventory operations.
3. **Aggregated Displays**: For resources with multiple types (Balls, Stones, etc.), the HUD pill displays the **sum** of all items in that category, while the associated tooltip provides the granular breakdown.

---

## 🕹️ Minigame & Modal Coordination

To prevent logic desynchronization and ensure consistent state behavior across gameplay elements:

1. **Parity of Duplicated Component Contexts**: When gameplay mechanics are split across multiple components or views (e.g., battle-specific `ArchaeologyMinigame.vue` and general-purpose `ArchaeologyModal.vue`), any logic-affecting rules, modifiers, or reward changes MUST be implemented consistently across all versions.
2. **Modal Callback & Lifecycle Synchronization**: When introducing or refactoring cleanup actions (such as `onCloseCallback` or custom close hooks) inside standard modals, wrap the execution in a local handler (e.g., `handleCloseModal`) that triggers both the local event emits (like `@close`) and the external callbacks, maintaining clean parent-child orchestration.
