# Evolution System Manual (Poké Vicio)

> **Scope & Authority**: This manual serves as the Single Source of Truth for all Pokémon evolution mechanics, triggers, stone interactions, friendship requirements, trade evolution holding items, and cancellation rules in Poké Vicio.
> **Sources of Truth**:
> - Evolution Database: `src/data/evolutionData.ts`
> - Friendship Logic: [`friendship_mechanics_manual.md`](./friendship_mechanics_manual.md)
> - Item System: [`item_system_manual.md`](./item_system_manual.md)

---

## 1. 📈 Evolution by Level

- **Standard Level-Up**: Triggered synchronously whenever a Pokémon levels up (via battle victory, Rare Candy, or debug injection) and reaches the required target level defined in `evolutionData.ts`.
- **Deferred Evolution**: If an evolution is cancelled or skipped, the system will re-evaluate and prompt for evolution upon each subsequent level-up.
- **Branching / Stat-Based Level-Up**:
  - **Tyrogue** (Level 20):
    - $\text{Attack} > \text{Defense} \implies$ **Hitmonlee**
    - $\text{Defense} > \text{Attack} \implies$ **Hitmonchan**
    - $\text{Attack} = \text{Defense} \implies$ **Hitmontop**
  - **Wurmple** (Level 7): Personality value modulo 10 determines Silcoon ($< 5$) or Cascoon ($\ge 5$).

---

## 2. 💎 Evolutionary Stones & Items

- **Interaction**: Triggered directly by using the appropriate stone or evolution item from the bag on the eligible Pokémon.
- **Eevee Branches**:
  - **Water Stone** ➔ Vaporeon
  - **Thunder Stone** ➔ Jolteon
  - **Fire Stone** ➔ Flareon
  - **Leaf Stone** / Moss Rock ➔ Leafeon
  - **Ice Stone** / Ice Rock ➔ Glaceon
  - **Moon Stone** / Sun Stone / Shiny Stone / Dusk Stone / Dawn Stone / Oval Stone / Sweet Apple / Tart Apple.
- **Stone Evolution Invariance**: Stone-induced evolutions take effect immediately and CANNOT be cancelled with the B-Button.

---

## 3. ❤️ Friendship & Happiness Evolutions

- **Threshold**: Requires a friendship level $\ge 220$ (on a scale of 0 to 255) upon leveling up.
- **Species & Time-of-Day Branches**:
  - **Pichu** ➔ Pikachu
  - **Cleffa** ➔ Clefairy
  - **Igglybuff** ➔ Jigglypuff
  - **Togepi** ➔ Togetic
  - **Golbat** ➔ Crobat
  - **Chansey** ➔ Blissey
  - **Buneary** ➔ Lopunny
  - **Riolu** (Day / 🌅 / 🌞) ➔ Lucario
  - **Eevee** (Day / 🌅 / 🌞) ➔ Espeon
  - **Eevee** (Night / 🌙) ➔ Umbreon
  - **Eevee** (with Fairy-type move) ➔ Sylveon

---

## 4. 🤝 Trade & Held Item Evolutions

- **Standard Trade**: Kadabra ➔ Alakazam, Machoke ➔ Machamp, Graveler ➔ Golem, Haunter ➔ Gengar.
- **Trade with Held Item**:
  - **Metal Coat**: Scyther ➔ Scizor, Onix ➔ Steelix.
  - **King's Rock**: Poliwhirl ➔ Politoed, Slowpoke ➔ Slowking.
  - **Dragon Scale**: Seadra ➔ Kingdra.
  - **Up-Grade**: Porygon ➔ Porygon2 (and **Dubious Disc**: Porygon2 ➔ Porygon-Z).
  - **Electirizer**: Electabuzz ➔ Electivire.
  - **Magmarizer**: Magmar ➔ Magmortar.
  - **Protector**: Rhydon ➔ Rhyperior.
  - **Reaper Cloth**: Dusclops ➔ Dusknoir.
  - **Prism Scale**: Feebas ➔ Milotic.
- **Level-Up with Held Item**:
  - **Razor Claw** (Night / 🌙): Sneasel ➔ Weavile.
  - **Razor Fang** (Night / 🌙): Gligar ➔ Gliscor.
  - **Oval Stone** (Day / 🌞): Happiny ➔ Chansey.

---

## 5. ⚔️ Move-Knowing Evolutions

Evolution triggers upon level-up if the Pokémon knows a specific move:
- **Ancient Power**: Tangela ➔ Tangrowth, Yanma ➔ Yanmega, Piloswine ➔ Mamoswine.
- **Rollout**: Lickitung ➔ Lickilicky.
- **Double Hit**: Aipom ➔ Ambipom.
- **Taunt / Mimic**: Bonsly ➔ Sudowoodo, Mime Jr. ➔ Mr. Mime.
- **Dragon Pulse**: Poipole ➔ Naganadel.

---

## 6. 🌿 Wild Evolution (Auto-Evo Generation)

When the spawning system generates high-level wild Pokémon on routes:
- **Stones**: $50\%$ probability of automatic evolution if species level $\ge 30$.
- **Trade**: $50\%$ probability of automatic evolution if species level $\ge 32$.

---

## 7. 🛑 Cancellation & Prevention

### 1. Manual Cancellation (The B-Button)
During the visual evolution sequence (`intro` and `flashing` stages), the player can click or press the **B-Button** to cancel the process:
- The animation halts and displays: `¿Eh? ¡[Pokémon] ha dejado de evolucionar!`.
- **Restriction**: Cancellation is strictly allowed for level-up and friendship evolutions. Stone-induced and trade-induced evolutions CANNOT be cancelled.

### 2. Passive Prevention (Piedra Eterna / Everstone)
If a Pokémon holds `"Piedra Eterna"` (Everstone), any level-up or trade evolution is blocked automatically, skipping the sequence entirely.

