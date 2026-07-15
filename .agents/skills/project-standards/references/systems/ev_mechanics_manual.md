# EV Mechanics Manual

> **Scope**: Reference for AI agents implementing or verifying stat calculations, team generators, fuzzer setups, and any code that touches Pokémon stats.
> **Source of Truth**: `docs/mechanincs/` (Cave of Dragonflies references) + Pokémon Showdown source at `external/pokemon-showdown-code/`.

---

## 1. EV Limits

| Constraint | Value |
|---|---|
| Maximum EVs **per stat** | **252** (from Gen VI onward; technically 255 in Gen III–V but 252 is the effective max) |
| Maximum **total EVs** per Pokémon | **510** |
| EVs needed for +1 point at Lv 100 | **4** |
| Max bonus from 252 EVs at Lv 100 | **+63 points** |

Classic competitive distribution: **252 / 252 / 4** (uses 508 of 510, gains +1 in the third stat).

> **Agent Rule**: When generating test teams or validating sets, always verify `sum(evs) <= 510` and `each stat <= 252`.

---

## 2. Official Stat Formulas (Gen III+)

### HP

$$HP = \left\lfloor \frac{(2 \times Base + IV + \lfloor EV / 4 \rfloor) \times Level}{100} \right\rfloor + Level + 10$$

> Exception: **Shedinja** always has HP = 1, regardless of this formula.

### All Other Stats (Atk, Def, SpA, SpD, Spe)

$$Stat = \left( \left\lfloor \frac{(2 \times Base + IV + \lfloor EV / 4 \rfloor) \times Level}{100} \right\rfloor + 5 \right) \times Nature$$

Where `Nature` is:
- `1.1` if the nature boosts this stat
- `0.9` if the nature reduces this stat
- `1.0` if neutral

All divisions use **floor** (round down).

---

## 3. EV Impact by Level

$$\text{Points gained from EVs} = \left\lfloor \frac{\lfloor EV / 4 \rfloor \times Level}{100} \right\rfloor$$

| Level | 252 EVs bonus | 4 EVs bonus |
|---|---|---|
| 100 | **+63** | **+1** |
| 50 | **+31** | ~+0.5 (rounds down to 0 for some values) |
| 1 | 0 | 0 |

At **Level 100** the math is clean: every 4 EVs = exactly +1 point.

---

## 4. Example — Garchomp Atk (Adamant nature, 31 IV, Lv 100, Base 130)

| EVs | Calculation | Final Atk |
|---|---|---|
| 0 EVs | `(floor((260+31+0)*100/100) + 5) × 1.1 = 296 × 1.1` | **325** |
| 252 EVs | `(floor((260+31+63)*100/100) + 5) × 1.1 = 359 × 1.1` | **394** |

Net gain: **+69 points** (+63 flat from EVs × 1.1 nature modifier).

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
