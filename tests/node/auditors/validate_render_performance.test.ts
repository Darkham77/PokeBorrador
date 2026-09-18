/**
 * tests/node/auditors/validate_render_performance.test.ts
 *
 * Unit tests for ValidateRenderPerformanceAuditor.
 */

import { describe, it, expect } from 'vitest';
import { ValidateRenderPerformanceAuditor } from '../../../scripts/auditors/architecture/validate_render_performance.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('ValidateRenderPerformanceAuditor', () => {
  it('instantiates with correct metadata conforming to auditor rules', () => {
    const auditor = new ValidateRenderPerformanceAuditor();
    expect(auditor.id).toBe('validate_render_performance');
    expect(auditor.family).toBe('architecture');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
    expect(auditor.description.includes('\n')).toBe(false);

    for (const [, desc] of Object.entries(auditor.ruleDescriptions || {})) {
      expect(desc?.length).toBeLessThanOrEqual(60);
      expect(desc?.includes('\n')).toBe(false);
    }
  });

  describe('Rule: render-banned-mix-blend-mode', () => {
    it('detects mix-blend-mode in weather scss', () => {
      const auditor = new ValidateRenderPerformanceAuditor();
      const badCode = `
        .weather-overlay {
          &.rain {
            mix-blend-mode: screen;
          }
        }
      `;
      scan(auditor, 'src/styles/components/weather/_rain.scss', badCode);
      expect(auditor.getCountsByRule().get('render-banned-mix-blend-mode')!).toBe(1);
    });

    it('allows native opacity or normal blend mode', () => {
      const auditor = new ValidateRenderPerformanceAuditor();
      const goodCode = `
        .weather-overlay {
          &.rain {
            opacity: 0.8;
            mix-blend-mode: normal;
          }
        }
      `;
      scan(auditor, 'src/styles/components/weather/_rain.scss', goodCode);
      expect(auditor.getCountsByRule().get('render-banned-mix-blend-mode') ?? 0).toBe(0);
    });

    it('honors // blend-ok escape hatch', () => {
      const auditor = new ValidateRenderPerformanceAuditor();
      const ignoredCode = `
        .weather-overlay {
          mix-blend-mode: screen; // blend-ok: isolated test override
        }
      `;
      scan(auditor, 'src/styles/components/weather/_rain.scss', ignoredCode);
      expect(auditor.getCountsByRule().get('render-banned-mix-blend-mode') ?? 0).toBe(0);
    });
  });

  describe('Rule: render-banned-filter-in-weather', () => {
    it('detects drop-shadow filter in weather styles', () => {
      const auditor = new ValidateRenderPerformanceAuditor();
      const badCode = `
        .lightning-bolt {
          filter: Drop-Shadow(0 0 8px rgba(255, 255, 255, 1));
        }
      `;
      scan(auditor, 'src/styles/components/weather/_rain.scss', badCode);
      expect(auditor.getCountsByRule().get('render-banned-filter-in-weather')!).toBe(1);
    });

    it('allows clean styles without costly filters', () => {
      const auditor = new ValidateRenderPerformanceAuditor();
      const goodCode = `
        .lightning-bolt {
          box-shadow: 0 0 8px rgba(255, 255, 255, 1);
        }
      `;
      scan(auditor, 'src/styles/components/weather/_rain.scss', goodCode);
      expect(auditor.getCountsByRule().get('render-banned-filter-in-weather') ?? 0).toBe(0);
    });
  });

  describe('Rule: render-excessive-atmospheric-inset', () => {
    it('detects excessive negative insets (>128px)', () => {
      const auditor = new ValidateRenderPerformanceAuditor();
      const badCode = `
        .rain-layer {
          inset: -512px;
        }
      `;
      scan(auditor, 'src/styles/components/weather/_rain.scss', badCode);
      expect(auditor.getCountsByRule().get('render-excessive-atmospheric-inset')!).toBe(1);
    });

    it('allows insets within limits (-128px or 0)', () => {
      const auditor = new ValidateRenderPerformanceAuditor();
      const goodCode = `
        .rain-layer {
          inset: -128px;
        }
        .sand-layer {
          inset: 0;
        }
      `;
      scan(auditor, 'src/styles/components/weather/_rain.scss', goodCode);
      expect(auditor.getCountsByRule().get('render-excessive-atmospheric-inset') ?? 0).toBe(0);
    });
  });

  describe('Rule: render-gsap-cpu-modifier', () => {
    it('detects GSAP modifiers in atmosphere animators', () => {
      const auditor = new ValidateRenderPerformanceAuditor();
      const badCode = `
        weatherTimeline.to(layer, {
          x: 100,
          modifiers: {
            x: gsap.utils.unitize(x => parseFloat(x) % 256)
          }
        });
      `;
      scan(auditor, 'src/components/common/useAtmosphereRainAnim.ts', badCode);
      expect(auditor.getCountsByRule().get('render-gsap-cpu-modifier')!).toBe(1);
    });

    it('allows standard GPU transform tweens without CPU modifiers', () => {
      const auditor = new ValidateRenderPerformanceAuditor();
      const goodCode = `
        weatherTimeline.to(layer, {
          x: 256,
          duration: 0.4,
          repeat: -1,
          ease: 'none'
        });
      `;
      scan(auditor, 'src/components/common/useAtmosphereRainAnim.ts', goodCode);
      expect(auditor.getCountsByRule().get('render-gsap-cpu-modifier') ?? 0).toBe(0);
    });
  });
});
