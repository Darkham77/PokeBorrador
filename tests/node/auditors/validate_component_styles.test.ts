import { describe, it, expect } from 'vitest';
import { auditComponentStyles } from '@/../scripts/auditors/architecture/validate_component_styles';

describe('validate_component_styles (Vue Component Style Linkage & SCSS Orphan Auditor)', () => {
  it('validates the entire codebase with 0 broken style links, 0 unstyled components, and 0 orphaned SCSS files', () => {
    const result = auditComponentStyles();
    expect(result.vueComponentsScanned).toBeGreaterThan(50);
    expect(result.scssFilesScanned).toBeGreaterThan(20);
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });
});
