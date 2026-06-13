import { describe, it, expect } from 'vitest';
import { 
  validateUserProfile, 
  validateNetworkAction, 
  validateTrainerName, 
  validateChatMessage, 
  validateTradeOffer 
} from '@/logic/validation/schemas';

describe('Validation Schemas', () => {
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

  describe('NetworkAction Schema', () => {
    it('should validate correct action payloads', () => {
      const data = {
        type: 'CHAT_MESSAGE',
        payload: {},
        timestamp: Date.now()
      };
      expect(validateNetworkAction(data).success).toBe(true);
    });
  });

  describe('ChatMessage Schema', () => {
    it('should validate correct chat message schema', () => {
      const data = {
        id: 'msg_987',
        user_id: 'user_123',
        username: 'TrainerRed',
        message: 'Hello World!',
        player_class: 'tamer',
        trainer_level: 10,
        created_at: Temporal.Now.instant().toString()
      };
      expect(validateChatMessage(data).success).toBe(true);
    });
  });

  describe('TradeOffer Schema', () => {
    it('should validate correct trade offers', () => {
      const data = {
        id: 'trade_456',
        sender_id: 'user_1',
        receiver_id: 'user_2',
        offer_pokemon: null,
        offer_items: {},
        offer_money: 500,
        request_pokemon: null,
        request_items: {},
        request_money: 0,
        message: 'Let us trade!',
        status: 'pending',
        created_at: Temporal.Now.instant().toString()
      };
      expect(validateTradeOffer(data).success).toBe(true);
    });
  });
});
