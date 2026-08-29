import { describe, it, expect } from 'vitest';
import { 
  SHOP_ITEMS, 
  ITEMS_BY_ID, 
  requireItemId, 
  getMaxBuffDuration 
} from '@/data/inventory/items';
import { 
  NICK_STYLES, 
  AVATAR_STYLES, 
  NICK_STYLES_BY_ID, 
  AVATAR_STYLES_BY_ID 
} from '@/data/player/cosmeticsData';
import { 
  CLASS_MISSIONS, 
  CLASS_MISSIONS_BY_ID 
} from '@/data/player/playerClasses';
import { 
  RANKED_REWARD_MILESTONES, 
  RANKED_REWARD_MILESTONES_BY_ID 
} from '@/data/system/rankedData';

describe('O(1) Data Structure Dictionaries Integrity', () => {
  describe('Items Catalog (items.ts)', () => {
    it('should map every item in SHOP_ITEMS into ITEMS_BY_ID in O(1)', () => {
      expect(SHOP_ITEMS.length).toBeGreaterThan(50);
      for (const item of SHOP_ITEMS) {
        expect(ITEMS_BY_ID[item.id]).toBeDefined();
        expect(ITEMS_BY_ID[item.id].name).toBe(item.name);
      }
    });

    it('should resolve items by name and ID in O(1) through requireItemId', () => {
      expect(requireItemId('potion')).toBe('potion');
      expect(requireItemId('Poción')).toBe('potion');
      expect(requireItemId('ultraball')).toBe('ultraball');
      expect(requireItemId('Ultra Ball')).toBe('ultraball');
    });

    it('should throw on invalid item identifier', () => {
      expect(() => requireItemId('non_existent_item_xyz_999')).toThrow();
    });

    it('should calculate getMaxBuffDuration correctly in O(1) through dictionary', () => {
      const repelDuration = getMaxBuffDuration('repelSecs');
      expect(repelDuration).toBeGreaterThan(0);
    });
  });

  describe('Player Cosmetics Catalog (cosmeticsData.ts)', () => {
    it('should index all NICK_STYLES into NICK_STYLES_BY_ID in O(1)', () => {
      expect(NICK_STYLES.length).toBeGreaterThan(10);
      for (const style of NICK_STYLES) {
        expect(NICK_STYLES_BY_ID[style.id]).toBeDefined();
        expect(NICK_STYLES_BY_ID[style.id]?.name).toBe(style.name);
      }
    });

    it('should index all AVATAR_STYLES into AVATAR_STYLES_BY_ID in O(1)', () => {
      expect(AVATAR_STYLES.length).toBeGreaterThan(20);
      for (const style of AVATAR_STYLES) {
        expect(AVATAR_STYLES_BY_ID[style.id]).toBeDefined();
        expect(AVATAR_STYLES_BY_ID[style.id]?.name).toBe(style.name);
      }
    });
  });

  describe('Player Classes Catalog (playerClasses.ts)', () => {
    it('should index all CLASS_MISSIONS into CLASS_MISSIONS_BY_ID in O(1)', () => {
      expect(CLASS_MISSIONS.length).toBe(3);
      for (const mission of CLASS_MISSIONS) {
        expect(CLASS_MISSIONS_BY_ID[mission.id]).toBeDefined();
        expect(CLASS_MISSIONS_BY_ID[mission.id].durationHs).toBe(mission.durationHs);
      }
    });
  });

  describe('Ranked Data Catalog (rankedData.ts)', () => {
    it('should index all RANKED_REWARD_MILESTONES into RANKED_REWARD_MILESTONES_BY_ID in O(1)', () => {
      expect(RANKED_REWARD_MILESTONES.length).toBeGreaterThan(5);
      for (const milestone of RANKED_REWARD_MILESTONES) {
        expect(RANKED_REWARD_MILESTONES_BY_ID[milestone.id]).toBeDefined();
        expect(RANKED_REWARD_MILESTONES_BY_ID[milestone.id].elo).toBe(milestone.elo);
      }
    });
  });
});
