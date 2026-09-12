import { describe, it, expect, beforeEach } from 'vitest';
import { computed } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { useBattleStore } from '@/stores/battle/battle';
import { serializeState } from '@/logic/auth/saveSerializer';
import { validateSaveData } from '@/logic/validation/schemas';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { executePassiveMatchmakingFallback } from '@/logic/pvp/passiveMatchmakingHelper';
import { getRandomQuoteForTrainer } from '@/data/player/trainerPhrases';
import { useBattleTrainerVisuals } from '@/composables/battle/useBattleTrainerVisuals';
import type { DBRouter } from '@/logic/db/dbRouter';
import type { BattleState } from '@/types/battle/battle';

describe('PvP Save Validation & Opponent Resolution (Tier 1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const gs = useGameStore();
    const p1 = makePokemon('pikachu', 50)!;
    Object.assign(gs.state, {
      starterChosen: true,
      team: [p1],
      pvpTeam: [p1.uid],
      pvpTeam6: []
    });
  });

  describe('1. Boolean Coercion and Save Validation', () => {
    it('should serialize passiveTeamActive as a strict boolean when assigned numeric 1 or boolean true', () => {
      const gs = useGameStore();
      
      // Simulate SQLite returning numeric 1
      (gs.state as unknown as Record<string, unknown>).passiveTeamActive = 1;

      const serialized = serializeState(gs.state);
      expect(typeof serialized.passiveTeamActive).toBe('boolean');
      expect(serialized.passiveTeamActive).toBe(true);

      const validation = validateSaveData(serialized);
      if (!validation.success) {
        console.log('VALIDATION ISSUES:', validation.issues);
      }
      expect(validation.success).toBe(true);
    });

    it('should serialize passiveTeamActive as false when assigned 0 or false', () => {
      const gs = useGameStore();
      (gs.state as unknown as Record<string, unknown>).passiveTeamActive = 0;

      const serialized = serializeState(gs.state);
      expect(typeof serialized.passiveTeamActive).toBe('boolean');
      expect(serialized.passiveTeamActive).toBe(false);

      const validation = validateSaveData(serialized);
      expect(validation.success).toBe(true);
    });
  });

  describe('2. Opponent PlayerClassId, Gender and Quotes in Battle Orchestrator', () => {
    it('should accept player class ID and gender in battle options without throwing NPC error', async () => {
      const battleStore = useBattleStore();
      const enemyLeader = makePokemon('chansey', 50)!;
      const playerMon = makePokemon('rhydon', 50)!;
      const quote = getRandomQuoteForTrainer('rival');

      await battleStore.startBattle(enemyLeader, {
        isPvP: true,
        isRanked: true,
        isTrainer: true,
        trainerName: 'Darkham',
        trainerSprite: 'rocket',
        trainerGender: 'm',
        trainerQuote: quote,
        playerTeam: [playerMon],
        enemyTeam: [enemyLeader]
      });

      expect(battleStore.state?.trainerSprite).toBe('rocket');
      expect(battleStore.state?.trainerGender).toBe('m');
      expect(battleStore.state?.quote).toBe(quote);
    });

    it('should use rival dialogue selection in useBattleTrainerVisuals for PvP when quote is not predefined', () => {
      const battleRef = computed(() => ({
        isPvP: true,
        isTrainer: true,
        trainerName: 'Darkham',
        trainerSprite: 'cazabichos' as const,
        trainerGender: 'h' as const
      } as BattleState));

      const { trainerDialogText } = useBattleTrainerVisuals(battleRef);
      expect(typeof trainerDialogText.value).toBe('string');
      expect(trainerDialogText.value.length).toBeGreaterThan(0);
      expect(trainerDialogText.value).not.toBe('¡Prepárate para combatir! ¡No te lo pondré fácil!');
    });
  });

  describe('3. Passive Matchmaking Helper Opponent Profile Query', () => {
    it('should query username, player_class, and gender from profiles', async () => {
      const mockEnemy = makePokemon('snorlax', 50)!;
      const mockCandidate = {
        user_id: 'user-opponent-123',
        elo_rating: 1200,
        team_data: JSON.stringify([mockEnemy]),
        is_active: true
      };

      const mockDb = {
        from: (table: string) => {
          if (table === 'passive_teams') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [mockCandidate], error: null })
              })
            };
          }
          if (table === 'profiles') {
            return {
              select: (columns: string) => ({
                eq: () => ({
                  maybeSingle: () => {
                    expect(columns).toContain('player_class');
                    expect(columns).toContain('gender');
                    return Promise.resolve({
                      data: {
                        username: 'OpponentTrainer',
                        player_class: 'criador',
                        gender: 'm'
                      },
                      error: null
                    });
                  }
                })
              })
            };
          }
          return { select: () => ({ eq: () => Promise.resolve({ data: [] }) }) };
        }
      } as unknown as DBRouter;

      const result = await executePassiveMatchmakingFallback({
        db: mockDb,
        userUid: 'my-user-456',
        myElo: 1200,
        notify: () => {}
      });

      expect(result).not.toBeNull();
      expect(result?.opponentName).toBe('OpponentTrainer');
      expect(result?.opponentClass).toBe('criador');
      expect(result?.opponentGender).toBe('m');
    });
  });

  describe('4. Centralized Asset Service Resolution (getAssetUrl)', () => {
    it('should resolve front trainer sprite correctly for player classes and genders', () => {
      const rocketMale = getAssetUrl(ASSET_TYPES.TRAINER, 'rocket', { gender: 'h' });
      expect(rocketMale).toContain('/assets/sprites/trainers/rocket_h_front.webp');

      const rocketFemale = getAssetUrl(ASSET_TYPES.TRAINER, 'rocket', { gender: 'm' });
      expect(rocketFemale).toContain('/assets/sprites/trainers/rocket_m_front.webp');

      const criadorFemale = getAssetUrl(ASSET_TYPES.TRAINER, 'criador', { gender: 'm' });
      expect(criadorFemale).toContain('/assets/sprites/trainers/criador_m_front.webp');

      const cazabichosMale = getAssetUrl(ASSET_TYPES.TRAINER, 'cazabichos', { gender: 'h' });
      expect(cazabichosMale).toContain('/assets/sprites/trainers/cazabichos_h_front.webp');
    });
  });
});
