# E2E Simulation Progress Log - July 20, 2026

## Overview & Current Status

We have successfully diagnosed and partially resolved the collision between the initial starter/tutorial battle (Bulbasaur vs Pikachu) and the fuzzer test suite scenario initialization (Mew vs Blissey) in E2E test executions.

By introducing a temporary reactivity wait (`150ms`) after setting the `battleStore.state = null` in `base_battle_simulation.ts`, we let Vue reactively unmount the `PvPArena` component. This cleanly resets the battle UI and FSM state before spawning the actual Mew vs Blissey combat.

As a result:
- The fuzzer scenario now starts exactly from Choice #0 (Turn 1).
- Playback proceeds deterministically until Turn 38 of the Mew vs Blissey battle (`case-0813b34c9258`).

---

## The Turn 38 Failure (Current Roadblock)

At Turn 38, the simulator aborts with a choice validation error:
`Error: [Invalid choice] Can't switch: You can't switch to a fainted Pokémon`

### Diagnostic Data
- **P1 choice at Turn 38**: `move gust`
- **P2 choice at Turn 38**: `switch 2`
- **P2 team state at Turn 38**:
  - Blissey #1 (`283e481d`): HP 640/714 (Active)
  - Blissey #2 (`a71dfba4`): HP 0/714 (Fainted on Turn 34 via player's Mew's `Guillotine`)
  - Blissey #3, #4, #5, #6: HP 714/714 (Healthy)
- **Active request for P2**:
  - slot 1: Blissey #1 (active)
  - slot 2: Blissey #2 (fainted)
  - slot 3: Blissey #3 (healthy)

In Showdown request format, choosing `switch 2` tells the simulator to swap to the Pokémon in slot 2. Because Blissey #2 fainted on Turn 34, this choice is invalid in Showdown and causes the crash.

### Why did the fuzzer make this choice?
In the fuzzer certified run, P2 chose `switch 2` at Turn 38. There are two possibilities for why this worked in the fuzzer but failed in E2E:
1. **Upkeep index desynchronization**: In E2E simulation mode (`isScriptedReplayMode = true`), upkeep switch log detection is disabled in `advanceChoiceIndices` because they are supposed to be replayed as explicit choice elements in the fuzzer history. If a discrepancy exists in how many choices were consumed or shifted, E2E might be reading an incorrect index of `enemyChoices` for Turn 38.
2. **Cheat alignment / state mutation**: A cheat might have revived/healed P2's Blissey #2 in the fuzzer, but was not applied at the exact turn/phase in E2E. The cheat list is:
   - Turn 3: p1 heal
   - Turn 9: p2 heal (applied post-turn)
   - Turn 14: p1 heal
   - Turn 23: p1 heal
   - Turn 38: p1 heal (could not be applied because the turn crashed before resolving)
   - Turn 43: p2 heal
   Since there was no p2 heal cheat between Turn 9 and Turn 38, Blissey #2 remained fainted.

---

## Instructions for the Next Agent

1. **Verify Choice Indices**:
   - Compare `enemyChoices[p2ChoiceIdx]` in the fuzzer payload at Turn 38 vs E2E.
   - Verify if an upkeep switch choice was skipped or double-counted. At Turn 34 upkeep, P2 executed `switch 2` (idx 35) to replace the fainted Blissey #2 with Blissey #1. Confirm if subsequent index offsets shifted correctly.
2. **Review `choiceIndexer.ts`**:
   - Inspect the alignment of choice indexing when `isSimulation` is true vs false. Ensure that `advanceChoiceIndices` increments the player and enemy indices in exact lockstep parity with the fuzzer replayer.
3. **Execute E2E for case-0813b34c9258**:
   - Run: `TEST_CASE_ID=case-0813b34c9258 npm run sim:e2e:combat`
   - Investigate the logged index advancement in the Playwright browser console.
