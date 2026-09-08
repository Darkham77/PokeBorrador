# Purpose

Manage polymorphic battle session strategies for combat execution across all game modes (Wild, Trainer, Gym, PvP Casual/Ranked, Spectator, and Replay) ensuring zero code duplication.

## Ownership

Frontend Developers / Battle Engine Engineers.

## Local Contracts

- **Single Source of Truth & Zero Duplication Mandate**: All combat modes inherit from `BaseBattleSession` and execute turn logic through the canonical Showdown worker (`executeCanonicalTurn`), preserving identical FSM state machine transitions and GSAP animation sequences.
- **Declarative Mode Parameterization**: Every session subclass derives and exposes an immutable `BattleUiConfig` that dictates UI control visibility (turn timers, bag, catch, forfeit, spectator badges, replay controls) without conditional branches in visual components.
- **Session Hierarchy**:
  - `BaseBattleSession.ts`: Abstract base managing common battle context, FSM orchestration, and rewards lifecycle.
  - `PvEBattleSession.ts`: PvE combatant AI action provider and adventure exp/money rewards.
  - `GymBattleSession.ts`: Extends `PvEBattleSession` with gym leader dialogue and badge/TM progression.
  - `PvPBattleSession.ts`: Remote network action synchronization, turn countdown timer integration (`PvPTimerManager`), and ELO rating adjustments.
  - `SpectatorBattleSession.ts`: Passive live spectator streaming, synchronizing Showdown log streams in real time without player controls.
  - `ReplayBattleSession.ts`: Step-by-step tactical replay playback driving the visual arena via `ITacticalReplayEngine`.
  - `battleSessionFactory.ts`: Factory for instantiating the correct polymorphic session based on `BattleMode`.
- **Node.js 26+ Native Extensions Mandate**: All relative imports within session modules MUST explicitly include `.ts` extensions.
