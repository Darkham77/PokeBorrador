/**
 * tests/node/auditors/audit_item_sprite_collisions.test.ts
 *
 * Dedicated unit test suite for ItemSpriteCollisionAuditor:
 * - Audits item sprites catalog for missing physical assets
 * - Detects sprite collisions and overlapping paths
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  ItemSpriteCollisionAuditor,
  ITEM_SPRITE_COLLISION_RULES,
  findSpriteCollisions,
  findMissingSprites,
  type ItemSpriteCollisionRuleId,
  type ShopItem
} from '../../../scripts/auditors/assets/audit_item_sprite_collisions.ts';

describe('ItemSpriteCollisionAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and assets family', () => {
      const auditor = new ItemSpriteCollisionAuditor();
      expect(auditor.id).toBe('audit_item_sprite_collisions');
      expect(auditor.family).toBe('assets');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in ITEM_SPRITE_COLLISION_RULES', () => {
      const expectedRules: ItemSpriteCollisionRuleId[] = [
        'item-missing-sprite',
        'item-sprite-collision'
      ];

      for (const rule of expectedRules) {
        expect(ITEM_SPRITE_COLLISION_RULES).toContain(rule);
      }
      expect(ITEM_SPRITE_COLLISION_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Collision & Missing Detection Functions', () => {
    it('detects multiple items sharing identical non-unique sprite', () => {
      const items: ShopItem[] = [
        { id: 'item_a', name: 'Item A', cat: 'misc', sprite: 'items/potion' },
        { id: 'item_b', name: 'Item B', cat: 'misc', sprite: 'items/potion' }
      ];
      const collisions = findSpriteCollisions(items);
      expect(collisions.length).toBe(1);
      expect(collisions[0]!.count).toBe(2);
      expect(collisions[0]!.sprite).toBe('items/potion');
    });

    it('flags items missing sprite property definition', () => {
      const items: ShopItem[] = [
        { id: 'item_ghost', name: 'Ghost Item', cat: 'misc' }
      ];
      const missing = findMissingSprites(items);
      expect(missing.length).toBe(1);
      expect(missing[0]!.reason).toBe('missing_property');
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers all item sprite collision rules in auditor', () => {
      const auditor = new ItemSpriteCollisionAuditor();
      const rules: ItemSpriteCollisionRuleId[] = [
        'item-missing-sprite',
        'item-sprite-collision'
      ];

      for (const r of rules) {
        expect(auditor.ruleIds).toContain(r);
      }
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new ItemSpriteCollisionAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Items audited']).toBeGreaterThan(0);
    });

    it('records violations with error severity when collisions occur', () => {
      const auditor = new ItemSpriteCollisionAuditor();
      auditor.addViolation({
        ruleId: 'item-sprite-collision',
        severity: 'error',
        file: 'src/data/inventory/items.json',
        line: 1,
        message: 'Duplicate sprite path collision',
        context: 'items/potion'
      });
      expect(auditor.getErrorsByRule().get('item-sprite-collision')).toBe(1);
    });
  });
});
