# Organic Animation Standards

To guarantee a premium and "alive" visual experience, all cyclical animations must avoid perfect synchronization between multiple instances.

## 1. Phase Shift (Seed-based De-synchronization)

When rendering multiple instances of the same animated component (e.g., MapCards, Sparkle FX, floating Emojis), a random seed must be used to offset the start of the animation.

- **Implementation**: Pass a random value (`Math.random()`) as a CSS variable (e.g., `--card-seed`).
- **SCSS Rule**: Use a negative delay based on the total duration so that the animation starts at a random point in the cycle immediately.

```scss
.anim-target {
  animation: float 3s ease-in-out infinite;
  // Negative delay (seed * -duration) jumps to a random point in the cycle
  animation-delay: calc(var(--card-seed, 0) * -3s);
}
```

## 2. Speed Variation (Frequency)

De-synchronization is not enough; instances must have slightly different rhythms to break any perceptible rhythmic pattern.

- **Semantic Calculation**: The speed factor (`--card-speed`) must act as a divisor for the base duration.
- **Recommended Range**: Between `0.6x` (slow) and `1.6x` (fast).

```scss
.weather-layer {
  // Higher speed = Lower duration
  animation-duration: calc(1s / var(--card-speed, 1));
}
```

## 3. Multi-layer Weather Layers

For effects like rain or snow, use at least two layers with different scales, speeds, and offsets.

- **Layer 1 (Background)**: Slower, smaller, higher blur.
- **Layer 2 (Foreground)**: Faster, larger, sharper.
- **Lightning (Storm)**: Must use a `setInterval` with a random initial `setTimeout` so they don't strike at the same time on different routes.

## 4. Rarity & Sparkle FX

Aura effects (`.rare-glow`) and Shiny sparkles (`.shiny-sparkles`) must apply the negative delay to ensure each flash is asynchronous relative to others on the screen.

## 5. Tier S/S+ (High-IV) Pulsing

Pokémon with high stats (Tier S/S+) must use a rhythmic pulsing animation instead of rotation to maintain a premium feel.

- **Implementation**: Animate `opacity` and `Filter()` intensity using the `--tier-color` variable.
- **Timing**: Use a slow, ease-in-out cycle (approx. 2s) to avoid visual fatigue.
- **Safety Warning**: Avoid `Scale()` for ambient pulsing in containers with `overflow: hidden` (like Box cards) to prevent visual clipping. Prefer `Opacity()` or `Filter: Brightness()`.

```scss
@keyframes pulse-tier {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

## 6. Proportional Interaction Offsets

When applying interactive animations (hover/active) to elements that have a non-zero base offset (e.g., a sprite already lowered with `TranslateY`), the animation transform MUST be relative to that base.
- **Rule**: Avoid large jumps (e.g., from `10px` to `-30px`).
- **Standard**: Hover offsets should ideally be subtle (10-15px relative shift).
- **Implementation**: If base is `TranslateY(10px)`, hover should be `TranslateY(-5px)` to produce a 15px upward movement.
```

## 7. DOM-Independent State Phases (Transitions & v-show)

When animating complex multi-phase states (like wild encounters transitioning from silhouette to full color, or dynamically showing/hiding environment elements), the underlying DOM structure MUST be preserved to avoid abruptly severing CSS transitions.

- **Rule**: NEVER use `v-if` for elements that need to smoothly transition their visibility, opacity, or position across state phases if they are dependent on reactive data that changes during the transition. Use `v-show` instead.
- **Example**: If a floating Pokémon should not display ground bushes, use `v-show="!isFloating"`. This ensures the DOM node remains present (`display: none`) so that if the battle transitions to a non-floating Pokémon, the entrance animations can hook onto the existing element without re-mounting jolts.

## 8. Asynchronous Coordinators & Layout Thrashing Prevention

When an animation sequence requires swapping reactive data that will trigger Vue re-renders (like changing the active player's Pokémon `src`), this data swap MUST NOT occur simultaneously with the start of an unrelated CSS animation (e.g., the enemy's Phase 3 entrance).

- **Problem**: Instantaneous reactive data swaps cause "Layout Thrashing" and frame drops, which immediately break or stutter ongoing CSS transitions on sibling components.
- **Solution (The Coordinator Pattern)**: Execute data swaps **asynchronously in the background** during UX wait states (e.g., Victory Screens or Dialog pauses). Use a background `async` IIFE to:
  1. Animate the withdrawal of the current element.
  2. Wait for the animation to finish (`await new Promise`).
  3. Swap the reactive data silently while the DOM is stable.
  4. Animate the entrance of the new element.
  
This ensures the DOM is fully prepared and stable *before* the user clicks a button to advance to the next highly-animated phase.

## 9. Animation Timeout Collisions (Race Conditions)

When manually managing CSS animation classes via JavaScript timeouts (e.g., toggling between `energy-catching` and `energy-releasing` classes), timers used to clean up those classes MUST be meticulously tracked and cleared.

- **The Flicker Problem**: A `setTimeout` designed to remove an animation class after `900ms` will execute regardless of state changes. If the component intentionally advances to a new animation state at `800ms`, the original timeout will fire `100ms` later, prematurely stripping the new animation class. This causes the element to abort its CSS `forwards` state and instantly pop to `Scale(1)`, creating a severe visual flicker.
- **Standard Protocol**: Always track animation timeouts and invoke `clearTimeout()` immediately before assigning a new animation state.

```javascript
let currentAnimTimeout = null;

const playAnimation = (stateClass, duration) => {
  animState.value = stateClass;
  
  // MANDATORY: Clear previous overlapping timers to prevent premature class stripping
  clearTimeout(currentAnimTimeout); 
  
  currentAnimTimeout = setTimeout(() => {
    animState.value = null;
  }, duration);
};
```

## 10. Animation State Hygiene & Interaction Locks

Every global blocking state triggered by an animation (e.g., `battleStore.isIntroAnimating`) MUST have a guaranteed reset mechanism to prevent the UI from becoming permanently non-interactive.

- **Rule**: If an animation blocks user input, the cleanup (`flag = false`) MUST be explicitly called in the final `setTimeout` or event callback of that animation sequence.
- **Safety**: Avoid nested or conditional timeouts that might skip the cleanup phase if the logic branches.

## 11. Aesthetic Reveal Delays (Shadow & Metadata)

To hide micro-adjustments in position or "feetY" calculation during rapid transitions (like Phase 1 jump or Phase 2 emergence), apply intentional delays to the visibility of auxiliary elements.

- **Standard**: Ground shadows should be hidden for at least 50% of an entrance animation duration, appearing smoothly only once the object is nearing its final coordinates.
- **Implementation**: Use a separate flag (e.g., `isHalfway`) to toggle shadow visibility mid-sequence.

## 12. Energy Animation & Synchronization (Withdraw/Send Out)

When a Pokémon is manually or automatically switched in battle, the visual transition MUST be synchronized with the underlying state change using the `gameBus`.

- **Event Lifecycle**:
  1. `PLAY_WITHDRAW`: Triggered when a Pokémon is recalled to its Poké Ball.
  2. `PLAY_SEND_OUT`: Triggered when a new Pokémon enters the field.
- **Mandatory Delays**: Every energy animation event MUST be followed by a wait period (Standard: **800ms**) using `await new Promise(r => setTimeout(r, 800))`. This ensures the CSS animation (`energy-catching` / `energy-releasing`) completes before the next log message or Pokémon sprite swap occurs.
- **Conditional Triggering**: The `PLAY_WITHDRAW` event and its associated "Regresa!" log message MUST ONLY be triggered if the Pokémon being replaced has `hp > 0`. Fainted Pokémon are already invisible and do not require a withdrawal effect.

