# Purpose

Unit tests for combat damage calculations, active battle statuses, and state machine transitions.

## Work Guidance

- **Slot Order in Switch Mocks**: Any unit test for `executeSwitch` or
  `resolveShowdownSlot` MUST include `p1SlotOrder` (and optionally `p2SlotOrder`)
  in the `activeBattle` mock. Without it, `resolveShowdownSlot` falls back to slot
  `1` for every Pokémon, making multi-slot assertions always fail.
  Example: `p1SlotOrder: [p1.uid, p2.uid]` maps p1→slot1, p2→slot2.
- **Worker Mock Protocol**: When mocking `executeTurnInWorker`, spread `p2Choice`
  conditionally — only include it in the payload object when it is not `undefined`.
  This mirrors the real worker protocol for forced switches (faint replacement),
  where p2 has no choice to make.

  ```ts
  const payload: { p1Choice: string; p2Choice?: string } = { p1Choice };
  if (p2Choice !== undefined) payload.p2Choice = p2Choice;
  ```

- **GSAP Synchronous Mocking Pattern in Unit Tests**: When testing components, action timelines, or composables that invoke `awaitAnimation(tl)` or `createTimeline()`, tests running in JSDOM MUST mock `@/logic/utils/gsapHelpers` to synchronously progress timelines (`anim.progress(1)`) and execute callbacks passed to `tl.add()`. In JSDOM environments lacking real `requestAnimationFrame` ticker loops, unprogressed timelines cause `eventCallback('onComplete', resolve)` promises to stall, leading to 60-second test timeouts.
- **Combat Animation Coverage Mandate**: All battle kinematics MUST be verified across their distinct visual variants:
  1. **Attacks**: Physical (prep, dash, return with side-inversion), Special (radial pulse, brightness flare), Status (lateral rotation wobble on `spriteRotationEl`), Self-KO (4-stage explosion sequence), and voice moves (`PLAY_CRY`).
  2. **Faints**: Wild (gravitational drop of +80px with ground shadow hide) vs. Trainer/Owned (Pokéball recall suction).
  3. **Captures**: 4-stage wobble kinematics, status damage blinking, healing tint, and celebration (12 rotating dispersion sparkles + audio `caught`).
  4. **Status Idle Suppression**: Freeze (`frz`, `freeze`, `🧊`), paralysis, confusion, and trapped state suppression of floating/breathing idle tweens.
  5. **Escapes**: Knockback (`back.in(1.7)`), Teleport (`scaleY: 2.0`, `scaleX: 0.1`, brightness flare), and Flee (smoke burst + horizontal slide).

## Child DOX Index

- [ai](./ai/AGENTS.md): Heuristic decision AI, threat assessment, and move set lookups unit tests.
- [parity](./parity/AGENTS.md): Showdown engine behavior and bridge parity unit tests.
- [rewards](./rewards/AGENTS.md): Battle reward distributors, item drops, and NPC egg drop unit tests.
