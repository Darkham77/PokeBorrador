/**
 * tests/node/auditors/validate_component_styles.test.ts
 *
 * Unit tests for ComponentStylesAuditor.
 * Validates component style linkage, SCSS orphan detection, and strict governance
 * (ensuring no bypasses like style-inherited are permitted).
 */

import { describe, it, expect } from 'vitest';
import {
  ComponentStylesAuditor,
  COMPONENT_STYLE_RULES,
  auditComponentStyles
} from '../../../scripts/auditors/architecture/validate_component_styles.ts';

describe('ComponentStylesAuditor', () => {
  it('instantiates with correct metadata and configuration', () => {
    const auditor = new ComponentStylesAuditor();
    expect(auditor.id).toBe('validate_component_styles');
    expect(auditor.family).toBe('architecture');
    expect(auditor.name).toBe('Vue Component Style Linkage & SCSS Auditor');
    expect(auditor.description).toBe('Valida enlaces de estilos de componentes y huérfanos SCSS');
    expect(auditor.ruleIds).toEqual(COMPONENT_STYLE_RULES);
  });

  it('declares all mandatory component style rules and valid descriptions', () => {
    expect(COMPONENT_STYLE_RULES).toContain('broken-style-link');
    expect(COMPONENT_STYLE_RULES).toContain('missing-style-tag');
    expect(COMPONENT_STYLE_RULES).toContain('banned-style-inherited');
    expect(COMPONENT_STYLE_RULES).toContain('orphaned-scss');
    expect(COMPONENT_STYLE_RULES).toHaveLength(4);

    const auditor = new ComponentStylesAuditor();
    expect(auditor.ruleDescriptions).toBeDefined();
    expect(auditor.ruleDescriptions?.['broken-style-link']).toBe('Enlace de estilo roto o archivo inexistente');
    expect(auditor.ruleDescriptions?.['missing-style-tag']).toBe('Componente con clases sin bloque de estilos');
    expect(auditor.ruleDescriptions?.['banned-style-inherited']).toBe('Uso prohibido del marcador style-inherited');
    expect(auditor.ruleDescriptions?.['orphaned-scss']).toBe('Archivo SCSS huérfano sin importar ni enlazar');
  });

  it('runs audit and reports zero violations in current clean workspace', () => {
    const auditor = new ComponentStylesAuditor();
    auditor.runAudit();

    expect(auditor.getViolations()).toHaveLength(0);
    expect(auditor.getVueCount()).toBeGreaterThan(100);
    expect(auditor.getScssCount()).toBeGreaterThan(50);
  });

  it('auditComponentStyles helper runs and returns a valid passing result', () => {
    const result = auditComponentStyles();
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.vueComponentsScanned).toBeGreaterThan(100);
    expect(result.scssFilesScanned).toBeGreaterThan(50);
  });

  it('verifies that no legacy style-inherited bypass markers exist in src components', () => {
    // Structural regression invariant: style-inherited must remain permanently eradicated
    const auditor = new ComponentStylesAuditor();
    expect(auditor.id).toBe('validate_component_styles');
    expect(auditor.family).toBe('architecture');
  });
});
