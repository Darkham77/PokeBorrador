/**
 * tests/node/auditors/validate_test_fragmentation.test.ts
 *
 * Conformance & Unit Tests for Test Anti-Fragmentation & JSDOM Governance Auditor.
 */

import { describe, it, expect } from 'vitest';
import {
  TestFragmentationAuditor,
  MIN_TEST_FILE_LINES,
  TEST_FRAGMENTATION_WHITELIST,
} from '../../../scripts/auditors/architecture/validate_test_fragmentation.ts';

describe('TestFragmentationAuditor', () => {
  it('declares correct metadata conforming to BaseAuditor architecture', () => {
    const auditor = new TestFragmentationAuditor();
    expect(auditor.id).toBe('validate_test_fragmentation');
    expect(auditor.family).toBe('architecture');
    expect(auditor.name).toBe('Test Anti-Fragmentation Validator');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
    expect(auditor.ruleIds).toContain('no-fragmented-tests');
    expect(auditor.ruleIds).toContain('unnecessary-jsdom');
  });

  it('flags a test file with fewer than 60 lines as a violation', () => {
    const auditor = new TestFragmentationAuditor();
    const shortTestContent = Array.from({ length: 30 }, (_, i) => `// line ${i + 1}`).join('\n');

    // Call protected scanFile via reflection
    Reflect.apply(
      Reflect.get(auditor, 'scanFile'),
      auditor,
      ['tests/unit/dummy_short.test.ts', shortTestContent]
    );

    const counts = auditor.getCountsByRule();
    expect(counts.get('no-fragmented-tests')).toBe(1);
  });

  it('allows test files with 60 or more lines without violations', () => {
    const auditor = new TestFragmentationAuditor();
    const validTestContent = Array.from({ length: MIN_TEST_FILE_LINES }, (_, i) => `// line ${i + 1}`).join('\n');

    Reflect.apply(
      Reflect.get(auditor, 'scanFile'),
      auditor,
      ['tests/unit/dummy_long.test.ts', validTestContent]
    );

    const counts = auditor.getCountsByRule();
    expect(counts.get('no-fragmented-tests')).toBe(0);
  });

  it('ignores non-test source files regardless of line count', () => {
    const auditor = new TestFragmentationAuditor();
    const shortContent = 'export const x = 1;\n';

    Reflect.apply(
      Reflect.get(auditor, 'scanFile'),
      auditor,
      ['tests/dbTestHelper.ts', shortContent]
    );

    const counts = auditor.getCountsByRule();
    expect(counts.get('no-fragmented-tests')).toBe(0);
  });

  it('exempts whitelisted files from fragmentation checks', () => {
    const auditor = new TestFragmentationAuditor();
    const shortContent = '// Standalone wrapper\nconst a = 1;\n';

    const whitelistedFile = Array.from(TEST_FRAGMENTATION_WHITELIST)[0]!;

    Reflect.apply(
      Reflect.get(auditor, 'scanFile'),
      auditor,
      [whitelistedFile, shortContent]
    );

    const counts = auditor.getCountsByRule();
    expect(counts.get('no-fragmented-tests')).toBe(0);
  });

  it('respects inline test-fragmentation-ok escape hatch', () => {
    const auditor = new TestFragmentationAuditor();
    const annotatedContent = [
      '// test-fragmentation-ok: Standalone reproduction fixture',
      'import { it } from "vitest";',
      'it("works", () => {});',
    ].join('\n');

    Reflect.apply(
      Reflect.get(auditor, 'scanFile'),
      auditor,
      ['tests/unit/reproduce_special.test.ts', annotatedContent]
    );

    const counts = auditor.getCountsByRule();
    expect(counts.get('no-fragmented-tests')).toBe(0);
  });

  describe('unnecessary-jsdom rule', () => {
    it('flags test file requesting jsdom without mounting Vue or DOM globals', () => {
      const auditor = new TestFragmentationAuditor();
      const content = [
        '// @vitest-environment jsdom',
        'import { describe, it, expect } from "vitest";',
        'import { calculateDamage } from "@/logic/battle/calc";',
        ...Array.from({ length: 60 }, (_, i) => `// line ${i}`),
        'it("calcs", () => { expect(calculateDamage(10, 5)).toBe(5); });'
      ].join('\n');

      Reflect.apply(
        Reflect.get(auditor, 'scanFile'),
        auditor,
        ['tests/unit/dummy_pure_calc.test.ts', content]
      );

      const counts = auditor.getCountsByRule();
      expect(counts.get('unnecessary-jsdom')).toBe(1);
    });

    it('permits jsdom when @vue/test-utils mount is used', () => {
      const auditor = new TestFragmentationAuditor();
      const content = [
        '// @vitest-environment jsdom',
        'import { mount } from "@vue/test-utils";',
        'import MyComponent from "@/components/MyComponent.vue";',
        ...Array.from({ length: 60 }, (_, i) => `// line ${i}`),
        'it("mounts", () => { const wrapper = mount(MyComponent); });'
      ].join('\n');

      Reflect.apply(
        Reflect.get(auditor, 'scanFile'),
        auditor,
        ['tests/unit/dummy_component.test.ts', content]
      );

      const counts = auditor.getCountsByRule();
      expect(counts.get('unnecessary-jsdom')).toBe(0);
    });

    it('permits jsdom when browser DOM globals are accessed', () => {
      const auditor = new TestFragmentationAuditor();
      const content = [
        '// @vitest-environment jsdom',
        'import { describe, it, expect } from "vitest";',
        ...Array.from({ length: 60 }, (_, i) => `// line ${i}`),
        'it("uses dom", () => { window.localStorage.setItem("key", "val"); });'
      ].join('\n');

      Reflect.apply(
        Reflect.get(auditor, 'scanFile'),
        auditor,
        ['tests/unit/dummy_storage.test.ts', content]
      );

      const counts = auditor.getCountsByRule();
      expect(counts.get('unnecessary-jsdom')).toBe(0);
    });

    it('respects inline jsdom-ok escape hatch', () => {
      const auditor = new TestFragmentationAuditor();
      const content = [
        '// @vitest-environment jsdom',
        '// jsdom-ok: Requires browser global layout mocking in worker',
        'import { describe, it } from "vitest";',
        ...Array.from({ length: 60 }, (_, i) => `// line ${i}`),
        'it("runs", () => {});'
      ].join('\n');

      Reflect.apply(
        Reflect.get(auditor, 'scanFile'),
        auditor,
        ['tests/unit/dummy_worker.test.ts', content]
      );

      const counts = auditor.getCountsByRule();
      expect(counts.get('unnecessary-jsdom')).toBe(0);
    });
  });

  describe('Suite Distribution Metrics', () => {
    it('tracks micro, small, target and oversized suite distributions accurately', () => {
      const auditor = new TestFragmentationAuditor();

      // 1. Micro suite (30 lines)
      Reflect.apply(Reflect.get(auditor, 'scanFile'), auditor, [
        'tests/unit/micro.test.ts',
        Array.from({ length: 30 }, () => '// l').join('\n')
      ]);

      // 2. Small suite (150 lines)
      Reflect.apply(Reflect.get(auditor, 'scanFile'), auditor, [
        'tests/unit/small.test.ts',
        Array.from({ length: 150 }, () => '// l').join('\n')
      ]);

      // 3. Target suite (500 lines)
      Reflect.apply(Reflect.get(auditor, 'scanFile'), auditor, [
        'tests/unit/target.test.ts',
        Array.from({ length: 500 }, () => '// l').join('\n')
      ]);

      // 4. Oversized suite (1300 lines)
      Reflect.apply(Reflect.get(auditor, 'scanFile'), auditor, [
        'tests/unit/oversized.test.ts',
        Array.from({ length: 1300 }, () => '// l').join('\n')
      ]);

      const dist = auditor.getDistribution();
      expect(dist.totalTestFiles).toBe(4);
      expect(dist.micro).toBe(1);
      expect(dist.small).toBe(1);
      expect(dist.target).toBe(1);
      expect(dist.oversized).toBe(1);
      expect(dist.totalTestLines).toBe(30 + 150 + 500 + 1300);
    });
  });
});
