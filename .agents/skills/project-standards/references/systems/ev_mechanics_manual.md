# EV Mechanics Manual

> **Scope**: Reference for AI agents implementing or verifying stat calculations, team generators, fuzzer setups, and any code that touches Pokémon stats.
> **Source of Truth**: 
> - [Stat Mechanics](./stats.md) (Standard stat calculations, pre/post-Advance history)
> - [EVs & Natures](./evs-natures-and-math.md) (Mathematical approach to effort values)
> - Pokémon Showdown source at `external/pokemon-showdown-code/`.

---

## 🏛️ Standard Stat Formulas & Limits

Standard formulas, limits (e.g. 252 EV limit per stat, 510 total EV cap), and level-scaling mechanics have been migrated to the canonical references:
- **EV limits, Nature effects, and Stat Formulas** are detailed in [Stat Mechanics](./stats.md).
- **Mathematical details** are in [EVs & Natures](./evs-natures-and-math.md).

---

## 5. Agent Rules for Simulators & Fuzzers

### DO NOT pass pre-calculated `stats` to `@pkmn/sim` PokemonSets

When calling `Battle.setPlayer()` in `@pkmn/sim`, **do not include a `stats` field** in the `PokemonSet`. Showdown computes all stats (including HP) natively from `evs`, `ivs`, `level`, `nature`, and the species' base stats.

```typescript
// ❌ WRONG — stats.hp will be undefined, causing Pokémon to start at 0 HP
return {
  species: 'Arcanine',
  evs: { hp: 252, atk: 128, ... },
  stats: calcStatsPure(...), // hp: undefined → instant faint on turn 0
} as PokemonSet;

// ✅ CORRECT — let Showdown calculate from EVs/IVs/level
return {
  species: 'Arcanine',
  evs: { hp: 252, atk: 128, def: 64, spa: 0, spd: 0, spe: 64 },
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  level: 100,
  nature: 'adamant',
} as PokemonSet;
```

> Root cause of past bug: `calcStatsPure()` returns `{ atk, def, spa, spd, spe }` — it does **not** return `hp` (HP is handled separately in the project store). Passing this as `stats` in a Showdown set caused all Pokémon to enter battle with `hp = undefined → 0`, fainted on turn 0.

### Valid EV spreads for fuzzer-generated teams

The fuzzer (`fuzzer_ai_team_generator.ts`) uses these spreads — both total exactly 508 EVs (valid):

| Pokémon type | Spread |
|---|---|
| Physical attacker (`atk >= spa`) | `{ hp: 252, atk: 128, def: 64, spa: 0, spd: 0, spe: 64 }` |
| Special attacker (`spa > atk`) | `{ hp: 252, atk: 0, def: 0, spa: 128, spd: 64, spe: 64 }` |

The 252 HP investment is intentional: it gives sufficient bulk for battles to last **20–60 turns** rather than ending in 1 turn via OHKO, which is required for meaningful AI fuzzing.

### Self-KO and extreme-recoil moves must be excluded

Moves filtered from fuzzer movesets (cause instant or near-instant self-faint):

| Category | Excluded moves |
|---|---|
| Self-faint | `selfdestruct`, `explosion`, `mistyexplosion`, `healingwish`, `lunardance`, `memento`, `perishsong`, `destinybond`, `finalgambit` |
| Extreme recoil (≥33% HP) | `headsmash`, `volttackle`, `flareblitz`, `woodhammer`, `doubleedge`, `bravebird`, `takedown` |

---

## 6. `calcStatsPure()` — Project Helper

The project's `src/logic/pokemon/statsMath.ts` exports `calcStatsPure()` which implements the formulas above. It returns `{ atk, def, spa, spd, spe }` — **HP is intentionally excluded** because in the game store, HP is tracked separately as a mutable value (current HP can differ from max HP).

Use `calcStatsPure()` for:
- Displaying stats in the UI
- Save file stat calculation
- Damage formula implementations

**Do NOT** use it to pre-populate `PokemonSet.stats` for Showdown simulations.
