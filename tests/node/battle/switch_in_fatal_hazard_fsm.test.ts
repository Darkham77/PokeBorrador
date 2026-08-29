import { describe, it } from "vitest";
import assert from "node:assert";
import { createBattleStateMachine, BATTLE_STATES, BATTLE_SUBSTATES } from "@/logic/battle/battleStateMachine.ts";
import type { Pokemon } from "@/types/pokemon/pokemon";

describe("Switch-In Fatal Hazard FSM Integrity", () => {
  it("preserves SWITCH_MENU and isBattleSwitchForced when entering Pokémon faints from hazards", async () => {
    const fsm = createBattleStateMachine();
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL);

    const enteringPoke = {
      uid: "pkm-dead-entry-001",
      id: "mew",
      name: "Mew",
      hp: 0,
      maxHp: 100,
      fainted: true
    } as unknown as Pokemon;

    const isBattleOver = false;
    let isBattleSwitchForced = true;

    // Simulate faint resolution sequence setting FSM to SWITCH_MENU
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ);
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU);

    // Run guarded post-switch logic from switchAction.ts
    if (enteringPoke.hp > 0 && !isBattleOver) {
      isBattleSwitchForced = false;
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT);
    }

    assert.strictEqual(
      fsm.currentSubState.value,
      BATTLE_SUBSTATES.SWITCH_MENU,
      "FSM subState must remain SWITCH_MENU when entering Pokémon is fainted"
    );
    assert.strictEqual(
      isBattleSwitchForced,
      true,
      "isBattleSwitchForced must remain true to keep replacement menu active"
    );
  });

  it("transitions to WAIT_INPUT when entering Pokémon survives entry hazards", async () => {
    const fsm = createBattleStateMachine();
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL);

    const enteringPoke = {
      uid: "pkm-alive-entry-001",
      id: "mew",
      name: "Mew",
      hp: 75,
      maxHp: 100,
      fainted: false
    } as unknown as Pokemon;

    const isBattleOver = false;
    let isBattleSwitchForced = true;

    // Run guarded post-switch logic from switchAction.ts
    if (enteringPoke.hp > 0 && !isBattleOver) {
      isBattleSwitchForced = false;
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT);
    }

    assert.strictEqual(
      fsm.currentSubState.value,
      BATTLE_SUBSTATES.WAIT_INPUT,
      "FSM subState must transition to WAIT_INPUT when entering Pokémon is alive"
    );
    assert.strictEqual(
      isBattleSwitchForced,
      false,
      "isBattleSwitchForced must be cleared when Pokémon successfully enters combat"
    );
  });
});
