/**
 * tests/node/auditors/validate_fsm_diagrams.test.ts
 *
 * Dedicated unit test suite for FsmDiagramAuditor:
 * - Validates Mermaid FSM state diagrams against TypeScript state definitions
 * - Ensures transition graph parity between docs and runtime code
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  FsmDiagramAuditor,
  FSM_DIAGRAM_RULES,
  parseMermaid,
  parseJsFsm,
  type FsmDiagramRuleId
} from '../../../scripts/auditors/fsm/validate_fsm_diagrams.ts';

describe('FsmDiagramAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and fsm family', () => {
      const auditor = new FsmDiagramAuditor();
      expect(auditor.id).toBe('validate_fsm_diagrams');
      expect(auditor.family).toBe('fsm');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in FSM_DIAGRAM_RULES', () => {
      const expectedRules: FsmDiagramRuleId[] = [
        'fsm-state-missing-in-js',
        'fsm-undocumented-js-state',
        'fsm-transition-missing-in-js'
      ];

      for (const rule of expectedRules) {
        expect(FSM_DIAGRAM_RULES).toContain(rule);
      }
      expect(FSM_DIAGRAM_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Parser Functions', () => {
    it('parses states and transitions from Mermaid stateDiagram-v2 block', () => {
      const mermaidDoc = `
\`\`\`mermaid
stateDiagram-v2
  [*] --> IDLE
  IDLE --> ACTION_SELECT
  ACTION_SELECT --> [*]
\`\`\`
      `;
      const { states, transitions } = parseMermaid(mermaidDoc);
      expect(states.has('IDLE')).toBe(true);
      expect(states.has('ACTION_SELECT')).toBe(true);
      expect(transitions).toHaveLength(1);
      expect(transitions[0]).toEqual({ from: 'IDLE', to: 'ACTION_SELECT' });
    });

    it('parses JS states and valid transitions from TypeScript code', () => {
      const tsCode = `
export const BATTLE_STATES = {
  IDLE: 'IDLE',
  ACTION_SELECT: 'ACTION_SELECT'
} as const;

const validTransitions: Record<string, string[]> = {
  [BATTLE_STATES.IDLE]: [BATTLE_STATES.ACTION_SELECT]
};
      `;
      const { allKeys, jsTransitions } = parseJsFsm(tsCode);
      expect(allKeys.has('IDLE')).toBe(true);
      expect(allKeys.has('ACTION_SELECT')).toBe(true);
      expect(jsTransitions).toHaveLength(1);
      expect(jsTransitions[0]).toEqual({ from: 'IDLE', to: 'ACTION_SELECT' });
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers all FSM diagram auditor rules', () => {
      const auditor = new FsmDiagramAuditor();
      const rules = [
        'fsm-state-missing-in-js',
        'fsm-undocumented-js-state',
        'fsm-transition-missing-in-js'
      ];

      for (const r of rules) {
        expect(auditor.ruleIds).toContain(r);
      }
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new FsmDiagramAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Mermaid states']).toBeGreaterThan(0);
    });
  });
});
