# EV Training Minigames Proposals & Architecture

> **Scope**: Game design proposals, mechanics specification, and technical architecture for dedicated EV Training Minigames in Poké Vicio.
> **Identity Alignment**: Hybrid Retro-Modern (Pixel art heart + modern GSAP dynamic UI shell, 60 FPS, touch-first responsive).

---

## 1. 🎯 Overview & Objectives

In core Pokémon titles, EV training has evolved from pure grinding against wild encounters to specialized systems (Super Training in Gen VI, Poké Pelago in Gen VII, Mochi Mayhem / Balloon Pop in Gen IX).

This document outlines interactive, short-session **Arcade EV Minigames** designed for Poké Vicio. Each minigame targets a specific stat (or lets players choose), offers skill-based EV progression with high-score bonuses, and integrates into the existing `evMath.ts` and `gameStore` infrastructure.

---

## 2. 🕹️ Minigame Concepts by Stat

### 🏃 1. Speed (SPE): "Mach Dash / Rapid Sprint"

- **Concept**: A rhythm and reflex reaction sprint.
- **Gameplay**:
  - The Pokémon runs along a scrolling retro obstacle lane.
  - Directional lane markers, hurdles, or speed pads appear in rhythm with chiptune tempo.
  - Player taps/presses arrow keys or on-screen directional buttons to evade hurdles and hit Turbo Boost pads.
- **Reward Scaling**:
  - Base clearance: +12 to +24 Spe EVs.
  - Combo / Perfect run (Gold medal): +32 Spe EVs + Swift Feather reward.

---

### 🥊 2. Attack (ATK): "Punching Bag / Meteor Smash"

- **Concept**: A timing & impact power meter minigame (inspired by classic arcade punching machines and fighting games).
- **Gameplay**:
  - A moving power slider oscillates rapidly between low and critical hit zones.
  - Moving target dummies or falling meteors appear with weak points.
  - Tap at the sweet spot to deliver maximum strike impact. Chain hits build up a "Hyper Strike" burst for massive score.
- **Reward Scaling**:
  - Base score: +12 to +24 Atk EVs.
  - Critical combo (Gold medal): +32 Atk EVs + Muscle Feather / Protein.

---

### 🛡️ 3. Defense (DEF): "Iron Fortress / Aegis Guard"

- **Concept**: A directional shield block and projectile deflection game.
- **Gameplay**:
  - The Pokémon stands in the center with 4 defense sectors (Top, Bottom, Left, Right).
  - Rapid waves of incoming rocks, arrows, and energy spheres fly toward the Pokémon.
  - Player rotates the shield barrier (via swipe, keyboard, or clicking sectors) to deflect incoming attacks. Perfect parries send projectiles back for bonus points.
- **Reward Scaling**:
  - Base waves survived: +12 to +24 Def EVs.
  - Flawless defense (Gold medal): +32 Def EVs + Resist Feather / Iron.

---

### 🔮 4. Special Attack (SPA): "Psychic Burst / Star Alignment"

- **Concept**: Pattern matching and constellation energy connection.
- **Gameplay**:
  - Constellations of elemental energy nodes light up in rapid sequences.
  - Player traces or taps the connecting nodes before energy dissipates, releasing a burst of psychic energy to clear targets.
  - Time limits shrink as combos increase.
- **Reward Scaling**:
  - Base patterns completed: +12 to +24 SpA EVs.
  - 10-chain burst (Gold medal): +32 SpA EVs + Genius Feather / Calcium.

---

### 🧘 5. Special Defense (SPD): "Zen Meditation / Aura Balance"

- **Concept**: Equilibrium balancing and aura focus.
- **Gameplay**:
  - An aura ring shrinks and expands around the Pokémon with shifting center points.
  - Player holds/taps to keep the focal balance ball centered within turbulent energy waves while collecting floating tranquility orbs.
  - Teaches steady rhythm and impulse control.
- **Reward Scaling**:
  - Base duration held: +12 to +24 SpD EVs.
  - Perfect Zen (Gold medal): +32 SpD EVs + Clever Feather / Zinc.

---

### 🍎 6. HP (HP): "Berry Catch / Endurance Juggling"

- **Concept**: Catching falling nutritional items while avoiding heavy hazardous anvils.
- **Gameplay**:
  - The Pokémon holds a basket moving left-right.
  - Nutritious berries (Oran, Sitrus, Pomeg) rain down alongside hazardous obstacles (poison spikes, heavy iron weights).
  - Catching health-boosting items increases the stamina meter; dodging traps maintains multiplier.
- **Reward Scaling**:
  - Base catches: +12 to +24 HP EVs.
  - Golden Apple streak (Gold medal): +32 HP EVs + Health Feather / HP Up.

---

## 3. 🏗️ Technical Architecture & Integration

```text
src/
├── components/
│   └── minigames/
│       ├── EVTrainingHubModal.vue       # Hub to pick training regimen & active Pokemon
│       ├── MinigameResultModal.vue       # EV gains summary, medals, item rewards
│       └── games/
│           ├── SpeedDashGame.vue        # GSAP-driven responsive 2D canvas/DOM game
│           ├── AttackSmashGame.vue
│           ├── DefenseGuardGame.vue
│           ├── SpecialBurstGame.vue
│           ├── ZenBalanceGame.vue
│           └── BerryCatchGame.vue
├── logic/
│   └── minigames/
│       ├── minigameEngine.ts            # Score calculator, medal thresholds, reward bounds
│       └── minigameConfigs.ts           # Game rules, difficulties, timing parameters
└── stores/
    └── minigame.ts                      # Active session state, cooldowns / tickets
```

### Key Technical Guidelines

1. **Engine**: Implement animations purely using **GSAP Timelines & Tweens** and standard canvas/SVG/DOM elements with `will-change: transform` promotion for 60 FPS performance.
2. **Persistence & Boundary Safety**: EV rewards are awarded using `applyEvGains` from `@/logic/pokemon/evMath`, strictly enforcing `MAX_TOTAL_EVS (510)` and `MAX_STAT_EVS (252)` caps.
3. **Session Economy**:
   - Access via **Training Tickets** or **Stamina / Vigor** (`vigor` field on `Pokemon`), giving purpose to natural recovery or cafeteria meals.
   - Boosts from held items (`machobrace`, `poweritems`) and Pokérus should apply multipliers to minigame base yields.
