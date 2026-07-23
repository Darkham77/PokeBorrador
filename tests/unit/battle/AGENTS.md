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

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
