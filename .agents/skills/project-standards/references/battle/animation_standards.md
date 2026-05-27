# Battle Animation Standards

To guarantee a premium and "alive" visual experience, all cyclical animations must avoid perfect synchronization between multiple instances. To maintain system flexibility, **avoid hardcoding absolute durations or offsets** in documentation; refer to relative logic and symbolic constants.

> [!IMPORTANT] **GSAP MANDATE**: All animations (UI, battle, transitions) MUST use GSAP. Manual CSS `@keyframes` or transitions on `transform/opacity` are FORBIDDEN as they conflict with GSAP's engine and cause layout jank or "stuck" frames.
>
> [!IMPORTANT] **ZERO-TIMER POLICY**: It is STRICTLY FORBIDDEN to use native browser timers (`setTimeout`, `setInterval`) or reactive numeric steps to wait for animations or coordinate visual flows in frontend views and component logic. This causes synchronization loss and performance glitches. Always use GSAP's deterministic orchestration: `.then()` promises, `await` on tweens/timelines, `gsap.delayedCall()`, or GSAP lifecycle callbacks (`onComplete`, `onStart`).
>
> [!TIP] **Organic Entrance**: Use small random delays (`delay: Math.random() * 0.4`) when animating elements in a grid to avoid a rigid, "robotic" simultaneous appearance.
>
> [!CAUTION] **Target Validation**: ALWAYS verify that GSAP targets exist and are rendered (`length > 0` or `offsetParent !== null`) before creating tweens. Console warnings for missing targets in high-frequency loops (e.g. Map renders) will cause severe performance degradation and visual stutters.

## 0. Coordinate Initialization (Flicker Prevention)

To prevent positional "jumping" or flickering during entrance animations:

- **Rule**: Every combatant must have its `groundY` and `shadow` coordinates pre-loaded into the store BEFORE the `isVisible` flag is set.
- **Implementation**: Use the `preloadCombatCoords` workflow to scan sprites in the background while the UI is still blocked or during the transition phase.

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

- **Layer 1 (Background)**: Slower speed, smaller scale, lower opacity and detail.
- **Layer 2 (Foreground)**: Faster speed, larger scale, sharper focus.
- **Deterministic Lighting**: Flash effects (Storm) must use randomized intervals to ensure strikes don't synchronize across different views.

## 4. Rarity & Sparkle FX (Shiny & Capture)

Aura effects and Shiny sparkles must apply the negative delay logic to ensure each instance flashes asynchronously relative to others on the screen.

- **Visual Geometry**: Use CSS `clip-path` (e.g., `polygon(50% 0%, 61% 39%, 100% 50%...)`) instead of static characters to create sharp, pixel-perfect sparkles.
- **Dynamic Rotation**: Capture sparkles MUST include a high-velocity rotation (up to 720deg) during their parabolic expansion to increase visual impact.
- **Dispersion Logic**: Sparkles should alternate directions or use randomized offsets (`--tx`, `--ty`, `--tf`) to ensure a balanced hemispheric dispersion around the target.
- **Performance**: Use `Drop-Shadow` for glows instead of `box-shadow` to follow the object's polygonal silhouette.

## 5. Tier S/S+ (High-IV) Pulsing

Pokémon with high stats (Tier S/S+) use a rhythmic pulsing animation instead of rotation to maintain a premium feel.

- **Implementation**: Animate `opacity` and `Filter()` intensity using the `--tier-color` variable.
- **Timing**: Use a "Slow Breathing" cycle (long duration) to avoid visual fatigue.
- **Safety**: Avoid `Scale()` for ambient pulsing in containers with `overflow: hidden` to prevent visual clipping.
- **Rhythmic Pulse (Heartbeat)**: For organic entities (Pokémon), prefer an asymmetric pulse over a simple `sine.inOut`. Use a GSAP Timeline: fast expansion (e.g., `0.4s` with `power2.out`) followed by a slower contraction (e.g., `0.8s` with `sine.inOut`) to simulate a lifelike heartbeat.

## 6. Proportional Interaction Offsets

When applying interactive animations (hover/active) to elements with a base offset (e.g., a sprite already lowered with `TranslateY`), the animation transform MUST be relative.

- **Standard**: Hover offsets should be subtle (approx. 5-10% of the object's height).
- **Implementation**: If base is `TranslateY(Base_Offset)`, hover should be `TranslateY(Base_Offset - Interaction_Delta)`.

## 18. Viewport-Aware Scaling (Hover)

To provide a premium feel without compromising usability on small screens, scaling animations MUST adapt to the available viewport space.

- **Standard (Desktop/Tablet)**: Use `Scale(1.08)` or `Scale(1.1)` for hover states on primary interactive cards (e.g., Moves, Pokémon Cards) to create a clear sense of depth and focus.
- **Compact (Mobile < 420px)**: Reduce the scaling factor to `Scale(1.02)` or `Scale(1.03)`.
- **WHY**: Large scales on mobile frequently cause the element to overlap critical UI edges or trigger unintended horizontal scrolling (clipping).
- **Implementation**: Use CSS Media Queries inside the component's scoped styles to override the `Scale()` factor at the standard **420px** breakpoint.

## 7. DOM-Independent State Phases (Transitions & v-show)

To prevent abruptly severing CSS transitions during multi-phase states (like wild encounters transitioning from silhouette to color), the underlying DOM structure MUST be preserved.

- **Rule**: NEVER use `v-if` for elements that need to smoothly transition visibility or position across state phases. Use `v-show` instead.
- **Reason**: Re-mounting components (`v-if`) destroys the CSS transition context, causing visual jolts.
- **Exception: Re-triggering Entrance Anims**: If an element MUST re-play its entrance animation (e.g., toggling spikes via debug), use `v-if` combined with a unique `:key` attribute (e.g., `:key="spikes-${side}"`). This forces a clean re-mount and re-triggers the `Transition` component.

## 8. Physical Ground Hazing (Ground FX)

To maintain spatial realism, field hazards and anchored states follow strict layering rules:

- **Anchoring Protocol**: Physical ground traps (Spikes, Ingrain) MUST be anchored to the `groundY` coordinate (shadow line).
- **Idle Independence**: Ground FX must be placed in a container that inherits the Pokémon's dash (dash/attack) but ignores its floating/idle bounce.
- **Aesthetic Movement**: Persistent ground effects should include subtle, desynchronized animations (like jumping or pulsing) to remain "alive" without floating.

## 9. Asynchronous Coordinators & Layout Thrashing Prevention

When swapping reactive data (like changing a Pokémon `src`), the swap MUST NOT occur simultaneously with a high-intensity CSS animation.

- **The Coordinator Pattern**: Execute data swaps during UX "wait states" (pauses).
- **Workflow**:
  1. Animate out the old element.
  2. Wait for the transition to finish (`await transitionEnd`).
  3. Swap data while the DOM is stable.
  4. Animate in the new element.

## 9. Animation Sync & FSM Interlocking (Visual Block)

When an animation affects the flow of combat, it MUST block the state machine until completion.

- **Standard Protocol**: Use the `awaitAnimation` helper with GSAP timelines.
- **Workflow**:
  1. The FSM calls `await ctx.animations.triggerX()`.
  2. The animation orchestrator returns a Promise that resolves `onComplete`.
  3. The FSM resumes logic only after the visual is finished.
- **CLI Bridge**: Every animation promise MUST be exposed to `window.__VITE_DEBUG__.battle.animations` to allow the IA and automated tests to wait for visual completion.

## 10. Animation State Hygiene

Every global blocking state (e.g., `isIntroAnimating`) MUST have a guaranteed reset mechanism.

- **Rule**: The cleanup (`flag = false`) MUST be called in the `onComplete` callback of the GSAP timeline.

## 11. Aesthetic Reveal Delays (Shadow & Metadata)

To hide micro-adjustments in position during rapid transitions, apply intentional delays to the visibility of auxiliary elements.

- **Standard**: Auxiliary elements (Ground shadows, name labels) should remain hidden for the first half of an entrance animation, appearing smoothly only once the object reaches its target coordinates.

## 12. Energy Animation & Synchronization (Withdraw/Send Out)

Visual transitions MUST be synchronized with state changes using the `gameBus`.

- **Event Lifecycle**:
  1. `POKEMON_RECALL`: Pokémon withdrawn or fainted (owned).
  2. `POKEMON_CALL`: New Pokémon enters or replacement sent.
- **Mandatory Wait**: Every energy event MUST be followed by a wait period matched to the modular protocol's duration to ensure the visual completes before the next logic step.
- **Energy Transition Standardization**: Capture/Release effects MUST use the standard `POKEMON_RECALL` and `POKEMON_CALL` components.
  - **Recall (Withdraw/Capture)**: Inverts colors and scales down (suction effect).
  - **Call (Send Out/Emergence)**: Resets colors and scales up (expansion effect).
- **Animation Conflict Prevention**: Never apply `pokemon-faint` and `energy-catch` animations to the same DOM element simultaneously.
  - **WHY**: Both target the `animation` property; the last one applied will override the other, causing visual artifacts or missing effects. Recalling an owned fainted Pokémon should prioritize the energy recall.
- **Coordinate Reset Protocol**: Upon switching combatants (`POKEMON_CALL`) or changing species ID, ground coordinates (`groundY`, `stableGroundY`) MUST be reset to null/zero in the same execution frame. Failure to do so causes "ghosting" where Poké Balls or entry effects inherit stale positions.

## 13. Faint Animation & Shadow Sync

- **Sequence Duration**: The standard faint sequence lasts **1.3s** (0.8s animation + 0.5s pause).
- **Visual Pattern**: Use a **5-cycle transparency blink** before final disappearance.
- **State Guard**: Use a dedicated flag (`isFaintInProgress`) to maintain the "invisible" state until the encounter phase fully resets.
- **Shadow Lifecycle**: Ground shadows MUST be linked to the Pokémon's health state. They must vanish immediately during the faint animation and remain hidden until the ground position of the replacement is fully calculated.
- **Timing Guard**: Never reveal encounter layers (bushes) until the faint sequence is 100% complete.
- **Unified Trigger**: All faint triggers (via `status`, `damage`, or `catch`) MUST be funneled through a single `handleFaintAnim` coordinator in the animation compositor. This prevents race conditions where the sprite might "reappear" briefly or skip the faint blink if multiple store updates collide.
- **State Isolation**: The `isFaintInProgress` flag MUST only suppress the visibility of the specific combatant being fainted. It must NOT affect global rendering logic (like silhouettes) of the `upcomingPokemon` in the queue to prevent visual leaks during rapid transitions.

## 14. Shadow Dash Synchronization

Ground shadows MUST be children of the combatant's animation container (`sprite-animator`).

- **Why**: This ensures the shadow inherits all CSS-based translations (TranslateX/Y) applied to the Pokémon during physical attacks (dash, pulse), keeping the feet and shadow perfectly aligned at all times.

## 15. Thematic Defeat Animations (Owned vs Wild)

Defeat animations must adapt to the Pokémon's ownership:

- **Wild Pokémon**: Use the standard `faint` animation (sliding down and fading out).
- **Owned Pokémon (Player/Trainer)**: Use the `energy-catching` animation (returning to the Pokéball). Never use the faint slide for owned Pokémon; they must always be recalled.

## 16. Poké Ball Cycle (Trapped State)

The Poké Ball interaction follows a 3-state cycle: `catching` (energy beam) ➡️ `trapped` (wobbling ball on ground) ➡️ `releasing` (appearing).

- **Shadow Visibility**: Ground shadows MUST be hidden during the `catching`, `trapped`, and the `releasing` states.
  - **Timing Guard**: The shadow must vanish **BEFORE** the energy beam starts (Stage: `catching`) and reappear only **AFTER** the Pokémon has fully materialized and the energy effect is cleared (Transition: `releasing` ➡️ `null`).
- **Visual Switch**: The Pokémon sprite is replaced by the `.trapped-pokeball` element during the `trapped` state.

## 📐 Virtual World Layering (Z-Index)

To maintain a coherent sense of depth in the 2D-perspective virtual world, all components MUST use relative z-indices based on the `--z-map-spawns` (Default: 10) anchor:

| Layer                     | Formula                         | Logical Order        |
| :------------------------ | :------------------------------ | :------------------- |
| **Environment (Floor)**   | `calc(var(--z-base) + 1)`       | 1 (Bottom)           |
| **Shadows**               | `calc(var(--z-map-spawns) - 7)` | 3                    |
| **Grass (Back)**          | `calc(var(--z-map-spawns) - 5)` | 5                    |
| **Pokemon/Spawns**        | `var(--z-map-spawns)`           | 10 (Base)            |
| **Sprite Layer**          | `calc(var(--z-map-spawns) + 1)` | 11                   |
| **Shiny Sparkles**        | `calc(var(--z-map-spawns) + 2)` | 12                   |
| **Status Icons (Emojis)** | `calc(var(--z-map-spawns) + 3)` | 13                   |
| **Auras/Screens**         | `calc(var(--z-map-spawns) + 4)` | 14                   |
| **Ground Effects**        | `calc(var(--z-map-spawns) + 5)` | 15 (Over feet)       |
| **Grass (Front)**         | `calc(var(--z-map-spawns) + 5)` | 15 (Top)             |
| **Tactical FX (🛡️, 🎯)**  | `calc(var(--z-map-spawns) + 5)` | 15 (Global Critical) |

- **Rule**: This hierarchy ensures that shadows project onto the floor but are correctly occluded by grass blades and the Pokémon's feet. Visual effects (FX) are layered sequentially over the sprite to prevent occlusion and maintain mechanical clarity.

## 17. Feedback Lifecycle Decoupling

Visual feedback effects (Catch Sparkles, Level-up particles) MUST be decoupled from the lifecycle of the triggering object.

- **Standard**: Render feedback elements in a separate layer or as siblings (not children) of the primary actor.
- **WHY**: Ensures the feedback persists and completes its animation even if the actor (e.g., Poké Ball, Pokémon) is cleared or unmounted during a successful capture.

## 19. Encounter Animation Protocol (The Jump)

To ensure a fast and dynamic game flow, the `ENCOUNTER_ANIM` phase follows a strict timing and visual protocol:

- **Total Duration**: **1.1s** (1100ms).
- **Silhouette Logic**: The Pokémon MUST appear as a solid black silhouette with a white aura during the first half of the animation.
- **Reveal Point**: The reveal transition starts at the **550ms** mark (`isWildSilhouetteHalfway`). At this point, the silhouette should begin to fade or swap to the colored sprite while the "emergence" bounce completes.
- **Transition Integrity**: The silhouette state MUST be inclusive. It should trigger if the system is in `isSearching` mode OR if the previous battle is marked as `over` (transition phase). This ensures that proactive encounters sitting in the queue (e.g. after a Teleport) are correctly hidden even before the searching state is explicitly set.
- **Visual Behavior**: The Pokémon performs a parabolic "jump" from the grass coordinates. Auxiliary elements like name labels and HP bars remain hidden until the end of this phase to maintain focus on the Pokémon's arrival.

## 21. Attack Category Normalization & Keyframes

To ensure visual consistency, move categories MUST be normalized before being emitted to the animation bus.

### 1. Normalization Protocol

The battle engine MUST map all category variants to English lowercase strings:

- **Estado**, **status**, or **3** ➡️ `status`
- **Especial**, **special**, or **2** ➡️ `special`
- **Físico**, **physical**, or **1** ➡️ `physical`

### 2. Category-Specific Keyframes

Each category MUST have a distinct visual pattern to represent its mechanical nature:

- **Physical (`atk-physical`)**: Forward dash towards the opponent.
- **Special (`atk-special`)**: Pulsing expansion and brightness increase.
- **Status (`atk-status`)**: Lateral shake and brightness/contrast spike. This indicates that the move affects the state or field rather than dealing direct impact damage.

### 3. Implementation Guard

Never assume the category is already normalized in the move object. Always use a helper like `normalizeCat(move.cat)` when emitting `PLAY_ATTACK_ANIM`.

## 20. Status Effect Visuals (GSAP Persistence)

Status conditions use a combination of CSS filters for base tints and GSAP for dynamic orbital particles.

- **Orbital Patterns**: Use GSAP to animate particles in erratic paths, avoiding the repetition of CSS circular orbits.
- **Jitter & Vibrancy**: Paralysis and Confusion effects must use high-frequency GSAP staggers or random jitter values updated via `gsap.ticker`.
- **Decoupled Tweens (The Shake Pattern)**: For effects requiring a high-frequency vibration (wobble) on top of a slow trajectory (e.g. rising stars), you MUST decouple the animations into independent tweens.
  - **Constraint**: Use `overwrite: false` or `overwrite: "none"` in the high-frequency tween to prevent GSAP from killing the orbital/trajectory tween.
  - **Logic**: Trajectory handles `y`, Wobble handles `xPercent` and `rotation`.

To provide immediate visual feedback without reloading sprites, the system uses a hybrid approach of CSS Filters and orbital particles.

### 1. Adaptive Tints (CSS Filters)

Specific status conditions apply dynamic visual overrides to the Pokémon's image.

- **Priority**: Status tints and pulses **OVERRIDE** the Guardian Aura (white glow) to ensure mechanical clarity. The Guardian Aura is suppressed while a primary status is active.
- **Burn**: Red/Orange pulsing aura (`pulse-aura-burn`) with increased brightness and saturation to simulate radiant heat.
- **Poison**: Purple tint using `Hue-Rotate` and `Saturate` to simulate toxicity.
- **Paralysis**: Golden glow with a subtle "jitter" animation.
- **Freeze**: Intense cyan aura (`Drop-Shadow`) with crystalline stars that pulse in size (`freeze-sparkle-shine`) to simulate ice brilliance. The Pokémon's idle animation MUST be disabled (Static Mode) to reinforce the frozen effect.
- **Sleep**: Darkened sprite to simulate resting.
- **Heatwave (Sun)**: Intense orange/red radial gradient with `mix-blend-mode: overlay`. MUST include a `heat-haze` animation applying `Scale(1.03)` and `SkewX(3deg)` to simulate air distortion.
- **Atmospheric Particles (Snow/Sand)**: Use at least two asynchronous layers.
  - **Snow Layer 1**: Large, opaque flakes, slow speed (8-10s).
  - **Snow Layer 2**: Small, semi-transparent flakes, faster speed (14-18s).
  - **Blizzard**: Increases density and speed by 3x.

### 2. Secondary & Volatile Effects

Secondary conditions apply subtle visual cues over the primary state:

- **Confusion**: Erratic "wobble" animation (`fx-confusion-wobble`) and dizzying particles (💫). The confusion emoji MUST be oversized (**40px**) to ensure maximum visibility as it is a critical tactical state.
- **Curse**: Deep purple/black pulsing aura (`pulse-aura-curse`) with reduced brightness.
- **Attraction**: Floating hearts (❤️) orbiting the Pokémon.
- **Leech Seed**: Floating leaves (🌱) emerging from the base.
- **Trapped**: Visual chains (⛓️) and jitter animation. Triggered by both the `trapped` flag and turn-based `bound` counters.
- **Tactical Guards**: Icons for Protection (🛡️), Endure (👊), Focus Energy (🎯), and Lock-On (👁️) are rendered with **forced opacity: 1** to ensure visibility even when using transparent base particle classes.
- **Aura Pulsing**: Standard Buff/Debuff pulses (`fx-pulse-in`) must use a dramatic scale range (**0.6 to 1.2**) to be clearly perceptible.
- **Neblina (Mist)**: Atmospheric field effect rendered as a dense white-blue aura. It must use high opacity (**0.8**) and **Normal blend mode** (avoid Screen/Overlay) to remain visible against light backgrounds.
- **Toxic (Bad Poison)**: Replaces the standard poison icon in the HUD with (☣️) to indicate scaling damage.
- **HUD-Only Statuses**: Tactical conditions like Taunt (🤐), Encore (🔁), and Disable (🚫) are represented by dedicated badges with rule-explaining tooltips.

### 2. Orbital Particles (Emoji Layer)

Affected Pokémon are surrounded by 3 orbital particles with randomized origins and trajectories.

- **Implementation**: `PVSpriteFX.vue` generates a `particles` array with random `top/left` (20-80%) and `orbitX/Y` offsets.
- **Reactivity**: The `pokeId` prop MUST be used as a dependency to force re-randomization whenever the Pokémon instance or species changes, even if the status remains the same.
- **Scaling**: Origin points are relative (%) to ensure that particles surround the entire sprite area, which is critical for large Pokémon (e.g., Blastoise, Snorlax).
- **Kinematics**: Particles MUST follow an **Upward Floating** pattern (negative `orbitY`). This simulates natural behaviors like rising heat, smoke, or bubbles, ensuring the effect doesn't collapse into the Pokémon's center.
- **Emoji Rotation (Double-Layer)**: To rotate text-based emojis, use a nested structure: an outer `span` for the orbit and an inner `span` with `display: inline-block` for the rotation. Most browsers ignore transforms on inline elements.
- **Fade vs Scale**: For persistent status particles (Confusion, Sleep), prefer `opacity` fades over `scale` animations for entry/exit. Constant scaling is visually distracting; a solid presence with alpha-blending is the premium standard.
- **Animation**: Particles use the `status-particle-orbit` keyframe. Orbital trajectories are randomized to avoid repetitive circular patterns.

### 3. Multi-Status Container (HUD)

To ensure tactical transparency, the HUD displays all active effects in a dedicated container:

- **Primary Status**: Standard emojis (🔥, ☠️, etc.) for non-volatile conditions.
- **Volatile Status**: Emojis for temporary conditions like Confusion (🌀) or Leech Seed (🌱).
- **Stat Stages**: Icons (⚔️, 🛡️, etc.) with dynamic ▲/▼ indicators and color-coding (Green for up, Red for down) to represent current stage modifiers.
- **Tooltips**: Every icon in the container MUST have a `PVTooltip` explaining the mechanical implications of the effect.

---

## 22. Idle Animation for Floating Pokémon

To distinguish flying or hovering species from terrestrial ones, an exaggerated levitation idle animation is applied to any Pokémon with the `flying` type or that has the `isFloating` property.

- **Effect**: The `combatant-idle-float` animation MUST use a duration of `3.5s` and a vertical translation of `-22px` with a rotation of `-2deg` to make the levitation clearly discernible.

## 23. Deterministic Migration (No Deletion)

To reach "Zero-Warning" status during audits, NEVER delete a legacy CSS/JS animation without first implementing its functional equivalent in GSAP.

- **The Deletion Trap**: Removing `transition:` or `setTimeout` without a GSAP replacement causes "visual jolts" and breaks the premium feel.
- **Protocol**:
  1. Identify the trigger (hover, mount, state change).
  2. Implement the GSAP tween/timeline.
  3. Verify the visual parity.
  4. ONLY THEN remove the legacy code.

## 24. Capitalization Sensitivity (Vite Plugin Traps)

The project uses a Vite plugin (`vite-plugin-sass-traps.ts`) that automatically capitalizes certain CSS values (e.g., `rgba` -> `Rgba`, `linear-gradient` -> `Linear-Gradient`).

- **GSAP Constraint**: When animating colors or gradients via JS, you MUST use the capitalized versions (e.g., `backgroundColor: 'Rgba(...)'`) if you are targeting elements that rely on those auto-formatted styles.
- **Why**: Mismatched capitalization can cause GSAP to fail to "see" the current state of a property, leading to broken transitions or "flash" effects where the property jumps to the new value instead of tweening.

## 25. Organic UI Floating Effects (GSAP)

To give life to static branding elements (logos) or high-importance indicators without overloading the CPU with CSS keyframes:

- **Rule**: Implement a continuous floating cycle using a single GSAP tween.
- **Parameters**: Use `yoyo: true`, `repeat: -1`, and `ease: "sine.inOut"`.
- **Vertical Displacement**: Keep the movement subtle (approx. 10-15px) to avoid motion sickness or layout distraction.
- **GSAP Preference**: This approach is mandatory for persistent branding animations to ensure they remain synchronized with the overall game state and can be paused/killed efficiently during transitions.

## 26. GSAP Hover Interactions on Selected/Active Cards

To maintain premium tactical feedback, elements in a selected (`.selected`) or active combat state (`.is-active`) MUST still trigger GSAP hover animations rather than being frozen:

- **Hover Entrance**: Scale (`scale: 1.02` to `1.03`) and lift (`y: -3`) the card smoothly. Ensure the border color transitions to its corresponding high-contrast tier color or active glow.
- **Hover Leave (Restoration)**: On `mouseleave`, check if the card has the `selected` or `is-active` class. Animate the properties back to the specific selected values (e.g., target scale `0.98` and tier glow for combat active cards, or target scale `1` and blue border/glow for standard selected inventory/box cards) before calling `clearProps` in `onComplete`. This guarantees seamless transitions without visual "snaps" or layout jumps.

## 27. GSAP Callback Reference Null Safety

To prevent the `GSAP target null not found` console warnings when a component starts to unmount during hover or exit animations (e.g., `MapCard.vue`), all asynchronous GSAP callbacks (`onComplete`, `onStart`, `onUpdate`) MUST check that the target DOM references are not null before performing mutations or applying styles.
- **Rule**: Wrap callback operations in null checks: `if (elementRef.value) { ... }`.

## 28. Vue Transitions and Manual CSS Animations in Minigames

To prevent violating the zero-manual-animations rule, standard CSS transition definitions (e.g., `.fade-enter-active`) and Vue `<Transition>` tags should be avoided in game modals and minigames unless coordinated with the GSAP engine. If a simple modal or minigame requires toggle feedback, use direct reactive visibility states instead of uncoordinated CSS transitions to maintain deterministic timing.

## 29. Advanced GSAP & CSS Interoperability Guidelines

### GSAP Centering & CSS Transforms Clashing
Avoid centering absolute elements with `transform: translate(-50%, -50%)` in CSS if GSAP is animating properties like `rotation` or `scale`. GSAP overrides the inline `transform` property, displacing the element. Center elements mathematically using absolute coordinates (`top: 50%; left: 50%`) and negative margins (`margin-top`, `margin-left`), leaving `transform` completely free for GSAP.

### GPU-Accelerated Mask Shines
To animate glowing weather rings, shiny rings, or winner badge flares, use CSS `mask-image` with standard `rotation`/`scale`/`opacity` properties instead of animating `filter: drop-shadow()` or `filter: blur()`. This shifts all calculations entirely to the GPU compositor layer, yielding 0 repaint cost.

### GSAP Loading Spinner Watcher
To satisfy the GSAP-only animation mandate for loading spinners without using manual CSS `@keyframes`, animate spinner rotation continuously using a GSAP tween reactively triggered inside a watch handler of the store loading state (e.g., `leaderboardLoading`) in `nextTick`.

### Filter Cleanup Mandate
Temporary visual effects (flashes, pulses) MUST use GSAP's `onComplete` with `clearProps: "filter"` to ensure no residual 0px filters remain as base layers.

## 30. `isFloating` Truthiness vs. Existence Check

When determining whether a Pokémon has explicit ground (`floating: false`) or floating (`floating: true`) aesthetics in `pokemonDataProvider`, always check existence before using the value:

```typescript
// ❌ Wrong: treats explicit false as "not floating" but skips the check
if (data.isFloating) return true

// ✅ Correct: respects explicit false (ground species) and falls through to type-based fallback only when undefined
if (data.isFloating !== undefined) return data.isFloating
```

- **Why**: Using `if (data.isFloating)` as a truthiness check silently ignores the `false` case, causing ground-species with a Flying type to be incorrectly classified as floating. This suppresses `CombatGrass` bushes and misaligns the shadow layer.

## 31. SVG Filter Region for Large Blur Auras

When using `feGaussianBlur` with `stdDeviation >= 6` inside an SVG `<filter>`, the default region (`0% 0% 100% 100%`) will clip the aura at the sprite edges. Expand it explicitly:

```xml
<filter id="my-filter" x="-100%" y="-100%" width="300%" height="300%">
```

- **Why**: A spread of `stdDeviation="12"` extends approximately 3× the source bounds. Without the expanded region, the glow is silently cropped — especially visible on large Pokémon sprites near the container edges.

## 32. GSAP Ease Symmetry for Mirror Animations (Enter / Exit)

When two GSAP animations are the visual inverse of each other (e.g., `catching` sucking a sprite to scale 0 vs. `releasing` expanding it back to scale 1), they MUST use the **same `ease` curve** to be perceived as equally fast:

```typescript
// ✅ Symmetric — both are power2.inOut
gsap.to(sprite, { scale: 0, duration: 0.4, ease: "power2.inOut" }) // catching
gsap.to(sprite, { scale: 1, duration: 0.4, ease: "power2.inOut" }) // releasing

// ❌ Asymmetric — back.out has an elastic overshoot phase that makes it feel slower
gsap.to(sprite, { scale: 1, duration: 0.4, ease: "back.out(1.2)" }) // releasing
```

- **Why**: `back.out()` spends extra time in the overshoot phase (scale > 1) before settling. Even with equal `duration`, users perceive this as a longer, slower animation compared to a clean `power2.inOut`.



