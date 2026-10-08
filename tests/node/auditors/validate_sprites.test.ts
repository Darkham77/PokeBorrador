/**
 * tests/node/auditors/validate_sprites.test.ts
 *
 * Dedicated unit test suite for SpriteAuditor:
 * - Scans Pokemon sprite assets across all 9 generations
 * - Validates static front, shiny, and animated sprite sets
 * - Asserts zero critical errors on repository assets
 */

import { describe, it, expect } from 'vitest';
import {
  SpriteAuditor,
  SPRITE_RULES,
  type SpriteRuleId
} from '../../../scripts/auditors/assets/validate_sprites.ts';

describe('SpriteAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and assets family', () => {
      const auditor = new SpriteAuditor();
      expect(auditor.id).toBe('validate_sprites');
      expect(auditor.family).toBe('assets');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in SPRITE_RULES', () => {
      const expectedRules: SpriteRuleId[] = [
        'sprite-missing-asset'
      ];

      for (const rule of expectedRules) {
        expect(SPRITE_RULES).toContain(rule);
      }
      expect(SPRITE_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers sprite-missing-asset rule registration', () => {
      const auditor = new SpriteAuditor();
      const rule: SpriteRuleId = 'sprite-missing-asset';
      expect(auditor.ruleIds).toContain(rule);
    });

    it('declares human-friendly rule description for sprite-missing-asset', () => {
      const auditor = new SpriteAuditor();
      const desc = auditor.ruleDescriptions?.['sprite-missing-asset'];
      expect(desc).toBeDefined();
      expect(desc?.length).toBeGreaterThan(0);
      expect(desc?.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero critical errors on repository dataset', async () => {
      const auditor = new SpriteAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.metrics['Total species checked']).toBeGreaterThan(0);
      expect(result.metrics['Complete sprite sets']).toBeGreaterThan(0);
    });

    it('records violations with error severity when pokemon sprite is missing', () => {
      const auditor = new SpriteAuditor();
      auditor.addViolation({
        ruleId: 'sprite-missing-asset',
        severity: 'error',
        file: 'public/assets/sprites/pokemon',
        line: 1,
        message: 'Missing sprite for species pikachu',
        context: 'pikachu/front.png'
      });
      expect(auditor.getErrorsByRule().get('sprite-missing-asset')).toBe(1);
    });
  });
});

