/**
 * tests/node/auditors/validate_mobile_accessibility.test.ts
 *
 * Unit tests for MobileAccessibilityAuditor.
 */

import { describe, it, expect } from 'vitest';
import { MobileAccessibilityAuditor } from '../../../scripts/auditors/architecture/validate_mobile_accessibility.ts';

interface TestableMobileAccessibilityAuditor {
  auditImgAlt(file: string, template: string, content: string, startLine: number): void;
  auditIconButtonLabels(file: string, template: string, content: string, startLine: number): void;
}
const asTestable = (auditor: unknown) => auditor as unknown as TestableMobileAccessibilityAuditor;

describe('MobileAccessibilityAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new MobileAccessibilityAuditor();
    expect(auditor.id).toBe('validate_mobile_accessibility');
    expect(auditor.family).toBe('architecture');
  });

  it('detects images without alt tags', () => {
    const auditor = new MobileAccessibilityAuditor();
    const badTemplate = `
      <template>
        <div>
          <img src="/assets/banner.png" class="banner" />
        </div>
      </template>
    `;

    asTestable(auditor).auditImgAlt('src/components/Banner.vue', badTemplate, badTemplate, 0);
    expect(auditor.getCountsByRule().get('img-alt-required')!).toBeGreaterThan(0);
  });

  it('allows images with alt or :alt', () => {
    const auditor = new MobileAccessibilityAuditor();
    const goodTemplate = `
      <template>
        <div>
          <img :src="iconUrl" :alt="pokemonName" />
          <img src="/assets/logo.png" alt="Poké Vicio Logo" />
        </div>
      </template>
    `;

    asTestable(auditor).auditImgAlt('src/components/Banner.vue', goodTemplate, goodTemplate, 0);
    expect(auditor.getCountsByRule().get('img-alt-required') ?? 0).toBe(0);
  });

  it('detects icon-only buttons without accessible label', () => {
    const auditor = new MobileAccessibilityAuditor();
    const badTemplate = `
      <template>
        <div>
          <button class="btn-icon"><i class="fa-solid fa-trash"></i></button>
        </div>
      </template>
    `;

    asTestable(auditor).auditIconButtonLabels('src/components/ActionBar.vue', badTemplate, badTemplate, 0);
    expect(auditor.getCountsByRule().get('icon-button-accessible-label')!).toBeGreaterThan(0);
  });

  it('allows icon-only buttons with aria-label or title', () => {
    const auditor = new MobileAccessibilityAuditor();
    const goodTemplate = `
      <template>
        <div>
          <button class="btn-icon" aria-label="Eliminar"><i class="fa-solid fa-trash"></i></button>
          <button class="btn-icon" title="Cerrar"><i class="fa-solid fa-times"></i></button>
        </div>
      </template>
    `;

    asTestable(auditor).auditIconButtonLabels('src/components/ActionBar.vue', goodTemplate, goodTemplate, 0);
    expect(auditor.getCountsByRule().get('icon-button-accessible-label') ?? 0).toBe(0);
  });
});
