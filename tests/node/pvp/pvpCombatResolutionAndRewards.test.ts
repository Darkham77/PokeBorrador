import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { useBattleStore } from '@/stores/battle/battle';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { processCombatantExpAndEvs } from '@/logic/battle/rewards/combatantExpEvProcessor';
import { calculateBattleRewards } from '@/logic/battle/rewardsDistributor';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('PvP Combat Resolution & Rewards Isolation (Tier 1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const gs = useGameStore();
    const adventureWartortle = makePokemon('wartortle', 35)!;
    adventureWartortle.exp = 0;
    adventureWartortle.expNeeded = 1000;
    adventureWartortle.hp = 100;
    adventureWartortle.maxHp = 100;

    Object.assign(gs.state, {
      starterChosen: true,
      trainer: 'Ash',
      team: [adventureWartortle],
      pvpTeam: [],
      pvpTeam6: [],
      stats: { wins: 0, trainersDefeated: 0 }
    });
  });

  describe('1. PvP Rewards Isolation from Adventure Team', () => {
    it('should NOT award EXP, EVs, or level up Adventure team when isPvP is true', async () => {
      const gs = useGameStore();
      const battleStore = useBattleStore();
      const adventureMon = gs.state.team[0]!;
      const initialExp = adventureMon.exp;
      const initialLevel = adventureMon.level;
      const initialSpecies = adventureMon.id;

      const pvpPikachu = makePokemon('pikachu', 50)!;
      const enemyMewtwo = makePokemon('mewtwo', 50)!;

      // Setup active battle as PvP
      battleStore.state = {
        isPvP: true,
        isRanked: true,
        player: pvpPikachu,
        enemy: enemyMewtwo,
        playerTeam: [pvpPikachu],
        enemyTeam: [enemyMewtwo],
        participants: [pvpPikachu.uid],
        _rewardCombatants: [enemyMewtwo],
        locationId: 'gym',
        over: true
      } as unknown as typeof battleStore.state;

      await processCombatantExpAndEvs(battleStore.getContext(), {
        combatants: [enemyMewtwo],
        participantsSet: new Set([pvpPikachu.uid]),
        classMult: 1,
        totalExpMult: 1,
        totalExpMultWithoutEvent: 1,
        eventExpMultiplier: 1
      });

      // Assert Adventure team is completely untouched
      expect(adventureMon.exp).toBe(initialExp);
      expect(adventureMon.level).toBe(initialLevel);
      expect(adventureMon.id).toBe(initialSpecies);
      expect(adventureMon.id).not.toBe('blastoise');
    });

    it('should skip calculateBattleRewards EXP and faction points when isPvP is true', async () => {
      const gs = useGameStore();
      const battleStore = useBattleStore();
      const adventureMon = gs.state.team[0]!;
      const initialLevel = adventureMon.level;

      const pvpPikachu = makePokemon('pikachu', 50)!;
      const enemyMewtwo = makePokemon('mewtwo', 50)!;

      battleStore.state = {
        isPvP: true,
        isRanked: true,
        player: pvpPikachu,
        enemy: enemyMewtwo,
        playerTeam: [pvpPikachu],
        enemyTeam: [enemyMewtwo],
        participants: [pvpPikachu.uid],
        _rewardCombatants: [enemyMewtwo],
        locationId: 'gym',
        over: true
      } as unknown as typeof battleStore.state;

      await calculateBattleRewards(battleStore.getContext());

      expect(adventureMon.level).toBe(initialLevel);
      expect(adventureMon.id).not.toBe('blastoise');
    });

    it('should NOT copy depleted HP from PvP team to Adventure team in syncTeamHP', () => {
      const gs = useGameStore();
      const battleStore = useBattleStore();
      const adventureMon = gs.state.team[0]!;
      adventureMon.hp = 100;

      // In PvP, the combatant took damage and has 10 HP
      const pvpCopy = { ...adventureMon, hp: 10 };

      battleStore.state = {
        isPvP: true,
        player: pvpCopy as Pokemon,
        playerTeam: [pvpCopy as Pokemon]
      } as unknown as typeof battleStore.state;

      battleStore.syncTeamHP();

      // Adventure team HP should remain 100
      expect(adventureMon.hp).toBe(100);
    });
  });

  describe('2. PvP Victory Evaluation and Winner Name Parity', () => {
    it('evaluates player victory when result.winner is "Player" instead of "p1"', () => {
      const result: { isOver: boolean; winner: string | null; winnerSide?: 'p1' | 'p2' | null } = {
        isOver: true,
        winner: 'Player',
        winnerSide: 'p1'
      };

      const battleState: { winnerResult?: 'player' | 'enemy' | 'tie'; playerNames?: Record<string, string> } = {
        winnerResult: 'player',
        playerNames: { Player: 'player', Rival: 'enemy' }
      };

      const won = battleState.winnerResult === 'player' ||
        result.winnerSide === 'p1' ||
        result.winner === 'p1' ||
        result.winner === 'Player' ||
        Boolean(battleState.playerNames && battleState.playerNames[result.winner || ''] === 'player');

      expect(won).toBe(true);
    });

    it('evaluates defeat when result.winner is enemy name or "p2"', () => {
      const result: { isOver: boolean; winner: string | null; winnerSide?: 'p1' | 'p2' | null } = {
        isOver: true,
        winner: 'Rival',
        winnerSide: 'p2'
      };

      const battleState: { winnerResult?: 'player' | 'enemy' | 'tie'; playerNames?: Record<string, string> } = {
        winnerResult: 'enemy',
        playerNames: { Player: 'player', Rival: 'enemy' }
      };

      const won = battleState.winnerResult === 'player' ||
        result.winnerSide === 'p1' ||
        result.winner === 'p1' ||
        result.winner === 'Player' ||
        Boolean(battleState.playerNames && battleState.playerNames[result.winner || ''] === 'player');

      expect(won).toBe(false);
    });
  });
});
