import { describe, it } from "vitest";
import assert from "node:assert";
import { ShowdownBattleEngine } from "@/logic/battle/engine/showdownBattleEngine.ts";
import { createShowdownBattle } from "@/logic/battle/helpers/showdownBattleFactory.ts";
import { ShowdownTeamResolver } from "@/logic/battle/showdownTeamResolver.ts";
import { ShowdownTeamMapper } from "@/logic/battle/helpers/showdownTeamMapper.ts";
import { patchShowdownSpreadModify } from "@/logic/battle/showdownAdapter.ts";
import type { ShowdownPlayerRequest } from "@/types/battle/battle";

describe("Reproduce Fuzzer Case 2241566f57e4 (Turn 53-58 Faint & Switch Chains)", () => {
  it("correctly executes P1 faint switch followed by enemy faint switch", () => {
    const makeMon = (uid: string, species: string, moves: string[], hp: number, atk: number, spe: number) => ({
      uid,
      name: uid.slice(0, 8),
      species,
      level: 50,
      ability: "naturalcure",
      moves,
      hp,
      maxHp: 100,
      stats: { hp: 100, atk, def: 100, spa: atk, spd: 100, spe },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      item: "",
      nature: "hardy",
      gender: "N",
      shiny: false
    });

    const p1Team = [
      makeMon("b6139189-3d01-4809-af73-3419a7c407b9", "mew", ["infestation", "psychic"], 10, 100, 150),
      makeMon("926bd3e4-e4e9-4d04-8d18-0382e834e974", "mew", ["closecombat", "psychic"], 342, 200, 150),
      makeMon("4db041a9-b2f5-46c5-af3f-5fb026d36e2f", "mew", ["shadowball", "psychic"], 342, 100, 150)
    ];

    const p2Team = [
      makeMon("b40e279b-ae7c-473d-8e68-45e0fb142a78", "blissey", ["flamethrower", "thunderbolt"], 10, 100, 50),
      makeMon("87df3519-c095-460d-9bcf-166c433ae819", "blissey", ["flamethrower", "thunderbolt"], 651, 100, 50)
    ];

    const battle = createShowdownBattle("gen9customgame", "1,2,3,4");
    battle.setPlayer("p1", { name: "Player", team: p1Team });
    battle.setPlayer("p2", { name: "Opponent", team: p2Team });

    battle.p1.pokemon.forEach((pokemon, idx) => {
      if (pokemon && p1Team[idx]?.uid) Reflect.set(pokemon, "uid", p1Team[idx]!.uid);
    });
    battle.p2.pokemon.forEach((pokemon, idx) => {
      if (pokemon && p2Team[idx]?.uid) Reflect.set(pokemon, "uid", p2Team[idx]!.uid);
    });

    const engine = new ShowdownBattleEngine({ mode: "fuzzer", seed: "1,2,3,4" });
    Reflect.set(engine, "battle", battle);

    // Turn 1: P1 uses Infestation, P2 uses Flamethrower (KOs P1 Mew 1)
    engine.executeTurn({
      p1Choice: "move 1",
      p2Choice: "move 1",
      p1Skip: false,
      p2Skip: false,
      p1Hps: { "b6139189-3d01-4809-af73-3419a7c407b9": 5 }
    });

    assert.strictEqual(battle.p1.pokemon[0]?.fainted, true, "P1 Mew 1 must be fainted");
    assert.strictEqual(battle.requestState, "switch", "Must request switch for P1");

    // P1 forced replacement: P1 switches to Mew 2
    const p1Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, "p1", battle.p1.activeRequest) as ShowdownPlayerRequest | null;
    const mew2Slot = ShowdownTeamResolver.getShowdownSlotForUid(p1Req, "926bd3e4-e4e9-4d04-8d18-0382e834e974");
    assert.strictEqual(mew2Slot, 2, "Mew 2 must be slot 2");

    engine.executeTurn({
      p1Choice: "switch 2",
      p2Choice: "",
      p1Skip: false,
      p2Skip: true
    });

    assert.strictEqual(battle.requestState, "move", "Must return to move request after switch");

    // Turn 2: P1 Mew 2 uses Close Combat, P2 uses Flamethrower (KOs P2 Blissey 1)
    engine.executeTurn({
      p1Choice: "move 1",
      p2Choice: "move 1",
      p1Skip: false,
      p2Skip: false,
      p2Hps: { "b40e279b-ae7c-473d-8e68-45e0fb142a78": 5 }
    });

    assert.strictEqual(battle.p2.pokemon[0]?.fainted, true, "P2 Blissey 1 must be fainted");
    assert.strictEqual(battle.requestState, "switch", "Must request switch for P2");

    // P2 forced replacement: P2 switches to Blissey 2
    const p2Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, "p2", battle.p2.activeRequest) as ShowdownPlayerRequest | null;
    const blissey2Slot = ShowdownTeamResolver.getShowdownSlotForUid(p2Req, "87df3519-c095-460d-9bcf-166c433ae819");
    assert.strictEqual(blissey2Slot, 2, "Blissey 2 must be slot 2");

    engine.executeTurn({
      p1Choice: "",
      p2Choice: "switch 2",
      p1Skip: true,
      p2Skip: false
    });

    assert.strictEqual(battle.requestState, "move", "Must return to move request after opponent switch");
  });

  it("replays all 91 certified turns of case-2241566f57e4 end-to-end", async () => {
    const fs = require("fs");
    const cases = JSON.parse(fs.readFileSync("scripts/e2e/results/fuzzer_certified_cases.json", "utf8"));
    const c13 = cases.battle.find((c: { id: string }) => c.id === "case-2241566f57e4");
    assert.ok(c13, "case-2241566f57e4 must exist");

    const { parseToNumericSeed, formatToShowdownSeed } = await import("@/logic/battle/battleSeedManager.ts");
    const { resetDeterministicMathRandom } = await import("@/logic/battle/helpers/seedInitializer.ts");

    patchShowdownSpreadModify(() => true);
    ShowdownTeamMapper.populateStatsMap(c13.playerTeam);
    ShowdownTeamMapper.populateStatsMap(c13.enemyTeam);

    const seedStr = formatToShowdownSeed(parseToNumericSeed(c13.seed));
    const battle = createShowdownBattle("gen9customgame", seedStr);
    resetDeterministicMathRandom();
    battle.setPlayer("p1", { name: "Player", team: c13.playerTeam });
    battle.setPlayer("p2", { name: "Opponent", team: c13.enemyTeam });

    battle.p1.pokemon.forEach((pokemon, idx) => {
      if (pokemon && c13.playerTeam[idx]?.uid) Reflect.set(pokemon, "uid", c13.playerTeam[idx].uid);
    });
    battle.p2.pokemon.forEach((pokemon, idx) => {
      if (pokemon && c13.enemyTeam[idx]?.uid) Reflect.set(pokemon, "uid", c13.enemyTeam[idx].uid);
    });

    const engine = new ShowdownBattleEngine({
      mode: "replayer",
      seed: c13.seed || "18588,21544,54523,34263",
      history: c13.history
    });
    Reflect.set(engine, "battle", battle);

    for (let step = 0; step < c13.history.length; step++) {
      const h = c13.history[step];
      const p1Choice = h.p1Choice;
      const p2Choice = h.p2Choice;
      const p1Skip = p1Choice === "";
      const p2Skip = p2Choice === "";

      const res = engine.executeTurn({
        p1Choice,
        p2Choice,
        p1Skip,
        p2Skip,
        certifiedHistoryStep: h
      });

      if (step >= 20 && step <= 26) {
        console.log(`[NODE-TEST] Step ${step + 1}: p1="${p1Choice}", p2="${p2Choice}", p1HP=${battle.p1.pokemon[0]?.hp}, p2HP=${battle.p2.pokemon[0]?.hp}, p2Moves=${JSON.stringify(battle.p2.pokemon[0]?.moveSlots?.map((m: any) => ({ id: m.id, pp: m.pp })))}`);
        console.log(`[NODE-TEST] Step ${step + 1} logs:`, res.turnLogs);
      }

      assert.ok(res, `Turn ${step + 1} must return execution result`);
    }

    assert.strictEqual(battle.ended, true, "Battle must end after 91 turns");
  });
});
