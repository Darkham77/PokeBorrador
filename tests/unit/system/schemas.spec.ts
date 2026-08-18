import { describe, it, expect } from 'vitest';
import { 
  validateUserProfile, 
  validateNetworkAction, 
  validateTrainerName, 
  validateChatMessage, 
  validateTradeOffer,
  validateGtsListing,
  validateAuthLogin,
  validateAuthRegister,
  validateAuthPasswordReset,
  validateSaveData
} from '@/logic/validation/schemas';

describe('Validation Schemas (Unit)', () => {
  describe('UserProfile Schema', () => {
    it('should validate correct user profile data', () => {
      const data = {
        id: 'user_123',
        username: 'AshKetchum',
        level: 50,
        is_banned: false,
        coins: 1000
      };
      const result = validateUserProfile(data);
      expect(result.success).toBe(true);
    });

    it('should reject profiles with invalid types or constraints', () => {
      const invalidUsername = {
        id: 'user_123',
        username: 'A', // too short
        level: 50,
        is_banned: false,
        coins: 1000
      };
      expect(validateUserProfile(invalidUsername).success).toBe(false);

      const invalidLevel = {
        id: 'user_123',
        username: 'AshKetchum',
        level: 150, // too high
        is_banned: false,
        coins: 1000
      };
      expect(validateUserProfile(invalidLevel).success).toBe(false);
    });
  });

  describe('TrainerName Schema', () => {
    it('should validate names between 3 and 15 characters', () => {
      expect(validateTrainerName('Red').success).toBe(true);
      expect(validateTrainerName('GaryOak').success).toBe(true);
      expect(validateTrainerName('Ro').success).toBe(false); // too short
      expect(validateTrainerName('VeryLongTrainerName').success).toBe(false); // too long
    });
  });

  describe('Auth Schemas', () => {
    it('validates auth login correctly', () => {
      expect(validateAuthLogin({ email: 'trainer@kanto.org', password: 'password123' }).success).toBe(true);
      expect(validateAuthLogin({ email: 'invalid-email', password: 'password123' }).success).toBe(false);
    });

    it('validates auth register correctly', () => {
      expect(validateAuthRegister({ email: 'trainer@kanto.org', password: 'password123', username: 'Kanto_Ash' }).success).toBe(true);
      expect(validateAuthRegister({ email: 'trainer@kanto.org', password: 'password123', username: 'Ash!' }).success).toBe(false);
    });

    it('validates auth password reset', () => {
      expect(validateAuthPasswordReset({ password: 'newPassword123', confirmPassword: 'newPassword123' }).success).toBe(true);
    });
  });

  describe('Network & Social Schemas', () => {
    it('validates network action', () => {
      const action = {
        type: 'CHAT_SEND',
        payload: { msg: 'Hello' },
        timestamp: Date.now()
      };
      expect(validateNetworkAction(action).success).toBe(true);
    });

    it('validates chat message', () => {
      const chat = {
        id: 'msg_1',
        user_id: 'usr_1',
        username: 'Ash',
        message: 'Let us battle!',
        trainer_level: 10
      };
      expect(validateChatMessage(chat).success).toBe(true);
    });
  });

  describe('SaveData Schema', () => {
    it('validates minimal valid save data', () => {
      const save = {
        trainer: 'Ash',
        gender: 'h' as const,
        badges: 0,
        balls: 5,
        money: 1000,
        battleCoins: 0,
        trainerLevel: 1,
        trainerExp: 0,
        trainerExpNeeded: 100,
        inventory: {},
        team: [],
        box: [],
        pokedex: [],
        seenPokedex: [],
        defeatedGyms: [],
        starterChosen: true,
        eloRating: 1000,
        pvpStats: { wins: 0, losses: 0, draws: 0 },
        rankedMaxElo: 1000,
        passiveTeamActive: false,
        daycare_mission_refreshes: 3,
        boxCount: 4,
        classLevel: 1,
        classXP: 0,
        classData: {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0
        },
        warCoins: 0,
        warCoinsSpent: 0,
        lastPokemonCenterHeal: 0,
        playtime: 0
      };
      expect(validateSaveData(save).success).toBe(true);
    });
  });

  describe('GTS & Trade Schemas', () => {
    it('validates item GTS listing', () => {
      const listing = {
        id: 'gts-item-1',
        seller_id: 'user_1',
        price: 500,
        status: 'active' as const,
        listing_type: 'item' as const,
        data: { id: 'pokeball', qty: 5 },
        created_at: '2026-08-18T00:00:00.000Z'
      };
      expect(validateGtsListing(listing).success).toBe(true);
    });

    it('should validate correct trade offers', () => {
      const data = {
        id: 'trade_456',
        sender_id: 'user_1',
        receiver_id: 'user_2',
        offer_pokemon: null,
        offer_items: { pokeball: 5 },
        offer_money: 500,
        request_pokemon: null,
        request_items: {},
        request_money: 0,
        message: 'Let us trade!',
        status: 'pending' as const,
        created_at: Temporal.Now.instant().toString()
      };
      expect(validateTradeOffer(data).success).toBe(true);
    });
  });
});
