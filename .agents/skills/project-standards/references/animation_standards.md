# Organic Animation Standards

To guarantee a premium and "alive" visual experience, all cyclical animations must avoid perfect synchronization between multiple instances. To maintain system flexibility, **avoid hardcoding absolute durations or offsets** in documentation; refer to relative logic and symbolic constants.

## 1. Phase Shift (Seed-based De-synchronization)

When rendering multiple instances of the same animated component (e.g., MapCards, Sparkle FX, floating Emojis), a random seed must be used to offset the start of the animation.

- **Implementation**: Pass a random value (`Math.random()`) as a CSS variable (e.g., `--card-seed`).
- **Logic**: Use a negative delay calculated as `seed * -duration` so that the animation starts at a random point in its cycle immediately.
- **Goal**: Prevents "visual strobing" where all elements pulse in unison.

## 2. Speed Variation (Frequency)

De-synchronization is not enough; instances must have slightly different rhythms to break any perceptible rhythmic pattern.

- **Semantic Calculation**: The speed factor (`--card-speed`) must act as a divisor for the base duration.
- **Standard Ratios**: Use a variation range (e.g., ±40%) around the base frequency.
- **Logic**: `animation-duration: calc(Base_Duration / var(--card-speed, 1))`.

## 3. Multi-layer Weather Layers

For effects like rain or snow, use at least two layers with different scales, speeds, and offsets to create depth.

- **Layer 1 (Background)**: Slower speed, smaller scale, higher blur.
- **Layer 2 (Foreground)**: Faster speed, larger scale, sharper focus.
- **Deterministic Lighting**: Flash effects (Storm) must use randomized intervals to ensure strikes don't synchronize across different views.

## 4. Rarity & Sparkle FX

Aura effects and Shiny sparkles must apply the negative delay logic to ensure each instance flashes asynchronously relative to others on the screen.

## 5. Tier S/S+ (High-IV) Pulsing

Pokémon with high stats (Tier S/S+) use a rhythmic pulsing animation instead of rotation to maintain a premium feel.

- **Implementation**: Animate `opacity` and `Filter()` intensity using the `--tier-color` variable.
- **Timing**: Use a "Slow Breathing" cycle (long duration) to avoid visual fatigue.
- **Safety**: Avoid `Scale()` for ambient pulsing in containers with `overflow: hidden` to prevent visual clipping.

## 6. Proportional Interaction Offsets

When applying interactive animations (hover/active) to elements with a base offset (e.g., a sprite already lowered with `TranslateY`), the animation transform MUST be relative.

- **Standard**: Hover offsets should be subtle (approx. 5-10% of the object's height).
- **Implementation**: If base is `TranslateY(Base_Offset)`, hover should be `TranslateY(Base_Offset - Interaction_Delta)`.

## 7. DOM-Independent State Phases (Transitions & v-show)

To prevent abruptly severing CSS transitions during multi-phase states (like wild encounters transitioning from silhouette to color), the underlying DOM structure MUST be preserved.

- **Rule**: NEVER use `v-if` for elements that need to smoothly transition visibility or position across state phases. Use `v-show` instead.
- **Reason**: Re-mounting components (`v-if`) destroys the CSS transition context, causing visual jolts.

## 8. Asynchronous Coordinators & Layout Thrashing Prevention

When swapping reactive data (like changing a Pokémon `src`), the swap MUST NOT occur simultaneously with a high-intensity CSS animation.

- **The Coordinator Pattern**: Execute data swaps during UX "wait states" (pauses).
- **Workflow**:
  1. Animate out the old element.
  2. Wait for the transition to finish (`await transitionEnd`).
  3. Swap data while the DOM is stable.
  4. Animate in the new element.

## 9. Animation Timeout Collisions (Race Conditions)

When manually managing CSS classes via JavaScript timeouts, previous timers MUST be meticulously cleared.

- **Standard Protocol**: Always track and invoke `clearTimeout()` immediately before assigning a new animation state to prevent premature class stripping.

## 10. Animation State Hygiene & Interaction Locks

Every global blocking state (e.g., `isIntroAnimating`) MUST have a guaranteed reset mechanism.

- **Rule**: The cleanup (`flag = false`) MUST be called in the final `setTimeout` or event callback of the sequence, even if the logic branches.

## 11. Aesthetic Reveal Delays (Shadow & Metadata)

To hide micro-adjustments in position during rapid transitions, apply intentional delays to the visibility of auxiliary elements.

- **Standard**: Auxiliary elements (Ground shadows, name labels) should remain hidden for the first half of an entrance animation, appearing smoothly only once the object reaches its target coordinates.

## 12. Energy Animation & Synchronization (Withdraw/Send Out)

Visual transitions MUST be synchronized with state changes using the `gameBus`.

- **Event Lifecycle**:
  1. `PLAY_WITHDRAW`: Pokémon recalled.
  2. `PLAY_SEND_OUT`: New Pokémon enters.
- **Mandatory Wait**: Every energy event MUST be followed by a wait period matched to the CSS animation duration to ensure the visual completes before the next logic step.
- **Optimization**: Skip withdrawal effects for fainted Pokémon (invisible).

## 13. Faint Animation & Shadow Sync

- **Sequence Duration**: The standard faint sequence lasts **1.3s** (0.8s animation + 0.5s pause).
- **Visual Pattern**: Use a **5-cycle transparency blink** before final disappearance. 
- **State Guard**: Use a dedicated flag (`isFaintInProgress`) to maintain the "invisible" state until the encounter phase fully resets.
- **Shadow Lifecycle**: Ground shadows MUST be linked to the Pokémon's health state. They must vanish immediately during the faint animation and remain hidden until the ground position of the replacement is fully calculated.
- **Timing Guard**: Never reveal encounter layers (bushes) until the faint sequence is 100% complete.

## 14. Shadow Dash Synchronization

Ground shadows MUST be children of the combatant's animation container (`sprite-animator`).

- **Why**: This ensures the shadow inherits all CSS-based translations (TranslateX/Y) applied to the Pokémon during physical attacks (dash, pulse), keeping the feet and shadow perfectly aligned at all times.

## 15. Thematic Defeat Animations (Owned vs Wild)

Defeat animations must adapt to the Pokémon's ownership:

- **Wild Pokémon**: Use the standard `faint` animation (sliding down and fading out).
- **Owned Pokémon (Player/Trainer)**: Use the `energy-catching` animation (returning to the Pokéball). Never use the faint slide for owned Pokémon; they must always be recalled.

## 16. Poké Ball Cycle (Trapped State)

The Poké Ball interaction follows a 3-state cycle: `catching` (energy beam) ➡️ `trapped` (wobbling ball on ground) ➡️ `releasing` (appearing).

- **Shadow Visibility**: Ground shadows MUST be hidden during the `trapped` state to prevent the "shadow under the ball" artifact.
- **Visual Switch**: The Pokémon sprite is replaced by the `.trapped-pokeball` element during the `trapped` state.

## 17. Feedback Lifecycle Decoupling

Visual feedback effects (Catch Sparkles, Level-up particles) MUST be decoupled from the lifecycle of the triggering object.

- **Standard**: Render feedback elements in a separate layer or as siblings (not children) of the primary actor.
- **WHY**: Ensures the feedback persists and completes its animation even if the actor (e.g., Poké Ball, Pokémon) is cleared or unmounted during a successful capture.

## 18. Selective Emergence Guards

Entrance animations (e.g., `is-emerging` bounce) MUST be gated by the active encounter phase.

- **Rule**: Only trigger emergence animations when the user is actively "Searching" or during the initial spawn.
- **Gating**: NEVER allow background proactive pre-generation of encounters to trigger visual resets or bounce animations on current combatants.
