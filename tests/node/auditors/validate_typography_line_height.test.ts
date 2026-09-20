/**
 * tests/node/auditors/validate_typography_line_height.test.ts
 *
 * Unit tests for TypographyLineHeightAuditor.
 * Verifies detection of zero/low line-height collisions and text descender clipping
 * under overflow: hidden truncation.
 */

import { describe, it, expect } from 'vitest';
import {
  TypographyLineHeightAuditor,
  TYPOGRAPHY_LINE_HEIGHT_RULES
} from '../../../scripts/auditors/architecture/validate_typography_line_height.ts';

describe('TypographyLineHeightAuditor', () => {
  it('instantiates with correct metadata and configuration', () => {
    const auditor = new TypographyLineHeightAuditor();
    expect(auditor.id).toBe('validate_typography_line_height');
    expect(auditor.family).toBe('architecture');
    expect(auditor.name).toBe('Typography Line-Height & Interlinear Spacing Validator');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
    expect(auditor.ruleIds).toEqual(TYPOGRAPHY_LINE_HEIGHT_RULES);
  });

  it('declares all mandatory typography rules with compliant descriptions', () => {
    expect(TYPOGRAPHY_LINE_HEIGHT_RULES).toContain('line-height-overlap');
    expect(TYPOGRAPHY_LINE_HEIGHT_RULES).toContain('typography-descender-clipping');
    expect(TYPOGRAPHY_LINE_HEIGHT_RULES).toHaveLength(2);

    const auditor = new TypographyLineHeightAuditor();
    expect(auditor.ruleDescriptions).toBeDefined();
    for (const ruleId of TYPOGRAPHY_LINE_HEIGHT_RULES) {
      const desc = auditor.ruleDescriptions?.[ruleId];
      expect(desc).toBeDefined();
      expect(desc!.length).toBeLessThanOrEqual(60);
    }
  });

  it('detects line-height: 0 and line-height: 1 on text selectors', () => {
    const auditor = new TypographyLineHeightAuditor();
    const badScss = `
      .item-title {
        font-size: 10px;
        line-height: 1;
      }
    `;
    (auditor as unknown as { scanFile(path: string, content: string): void }).scanFile('src/test.scss', badScss);
    const counts = auditor.getCountsByRule();
    expect(counts.get('line-height-overlap')).toBe(1);
  });

  it('detects descender clipping when overflow: hidden + truncation lacks line-height and padding', () => {
    const auditor = new TypographyLineHeightAuditor();
    const badScss = `
      .bm-item-name {
        font-size: 11.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    (auditor as unknown as { scanFile(path: string, content: string): void }).scanFile('src/test.scss', badScss);
    const counts = auditor.getCountsByRule();
    expect(counts.get('typography-descender-clipping')).toBe(1);
  });

  it('accepts text truncation when safe line-height and padding-bottom are present', () => {
    const auditor = new TypographyLineHeightAuditor();
    const goodScss = `
      .bm-item-name {
        @include pixelated;
        font-size: 11px;
        line-height: 1.45;
        padding-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    (auditor as unknown as { scanFile(path: string, content: string): void }).scanFile('src/test.scss', goodScss);
    const counts = auditor.getCountsByRule();
    expect(counts.get('typography-descender-clipping')).toBe(0);
  });

  it('honors the descender-ok escape hatch comment', () => {
    const auditor = new TypographyLineHeightAuditor();
    const ignoredScss = `
      .bm-item-name {
        // descender-ok
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    (auditor as unknown as { scanFile(path: string, content: string): void }).scanFile('src/test.scss', ignoredScss);
    const counts = auditor.getCountsByRule();
    expect(counts.get('typography-descender-clipping')).toBe(0);
  });
});
