/**
 * tests/node/auditors/validate_fsm_flow_parity.test.ts
 *
 * Dedicated unit test suite for FsmFlowParityAuditor:
 * - Validates battle FSM transition sequences against Mermaid documentation
 * - Evaluates linear and looping transition steps
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  FsmFlowParityAuditor,
  FSM_FLOW_PARITY_RULES,
  parseMermaidSequences,
  type FsmFlowParityRuleId
} from '../../../scripts/auditors/fsm/validate_fsm_flow_parity.ts';

describe('FsmFlowParityAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and fsm family', () => {
      const auditor = new FsmFlowParityAuditor();
      expect(auditor.id).toBe('validate_fsm_flow_parity');
      expect(auditor.family).toBe('fsm');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in FSM_FLOW_PARITY_RULES', () => {
      const expectedRules: FsmFlowParityRuleId[] = [
        'fsm-flow-sequence-missing'
      ];

      for (const rule of expectedRules) {
        expect(FSM_FLOW_PARITY_RULES).toContain(rule);
      }
      expect(FSM_FLOW_PARITY_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Sequence Parser Functions', () => {
    it('parses transition steps and recognizes loops from Mermaid diagrams', () => {
      const mermaidContent = `
\`\`\`mermaid
stateDiagram-v2
  INTRO --> ACTION_SELECT : next
  ACTION_SELECT --> ACTION_SELECT : ↺ re-select
\`\`\`
      `;
      const sequences = parseMermaidSequences(mermaidContent);
      expect(sequences.length).toBe(1);
      expect(sequences[0]![0]).toEqual({ from: 'INTRO', to: 'ACTION_SELECT', isLoop: false });
      expect(sequences[0]![1]).toEqual({ from: 'ACTION_SELECT', to: 'ACTION_SELECT', isLoop: true });
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers fsm-flow-sequence-missing rule registration', () => {
      const auditor = new FsmFlowParityAuditor();
      const rule: FsmFlowParityRuleId = 'fsm-flow-sequence-missing';
      expect(auditor.ruleIds).toContain(rule);
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new FsmFlowParityAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Mermaid seqs evaluated']).toBeGreaterThan(0);
    });
  });
});
