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

## ⚡ Visibility and Performance (Lean Rendering)

During high-load scenes (e.g., Battles), the hiding protocol is applied:

- **v-if**: Non-essential elements (MapCards, NPCs, background weather animations) MUST be physically hidden.
- **Pause**: All JS intervals (weather, buffs) must be paused while the combat state is active.
- **The Void Protocol**: During the rewards and level-up phases, the entire stage MUST enter a "Void" state (Completely empty). The enemy sprite is hidden immediately after the faint or capture sequence finishes to focus on the rewards flow. This avoids "ghosting" and maintains a clean interface for the user's progress summary. When entering the `VOID_STATE`, all visual traces, snapshots, and animation states of the Pokémon MUST be completely removed to prevent any graphical artifacts in the subsequent steps.
