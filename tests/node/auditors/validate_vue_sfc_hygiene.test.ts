/**
 * tests/node/auditors/validate_vue_sfc_hygiene.test.ts
 *
 * Unit tests for VueSfcHygieneAuditor.
 */

import { describe, it, expect } from 'vitest';
import { VueSfcHygieneAuditor } from '../../../scripts/auditors/architecture/validate_vue_sfc_hygiene.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('VueSfcHygieneAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new VueSfcHygieneAuditor();
    expect(auditor.id).toBe('validate_vue_sfc_hygiene');
    expect(auditor.family).toBe('architecture');
  });

  it('detects Options API export default', () => {
    const auditor = new VueSfcHygieneAuditor();
    const badCode = `
      <template><div>Hello</div></template>
      <script lang="ts">
      export default {
        data() { return { msg: 'hi' }; }
      };
      </script>
    `;

    scan(auditor, 'src/components/MyComponent.vue', badCode);
    expect(auditor.getCountsByRule().get('script-setup-required')!).toBeGreaterThan(0);
  });

  it('detects exports inside <script setup>', () => {
    const auditor = new VueSfcHygieneAuditor();
    const badCode = `
      <script setup lang="ts">
      export interface MyProps {
        id: string;
      }
      const props = defineProps<MyProps>();
      </script>
      <template><div>{{ props.id }}</div></template>
    `;

    scan(auditor, 'src/components/MyComponent.vue', badCode);
    expect(auditor.getCountsByRule().get('no-script-setup-exports')!).toBeGreaterThan(0);
  });

  it('accepts clean <script setup lang="ts"> components', () => {
    const auditor = new VueSfcHygieneAuditor();
    const goodCode = `
      <script setup lang="ts">
      interface MyProps {
        id: string;
      }
      const props = defineProps<MyProps>();
      </script>
      <template><div :alt="'my-alt'">{{ props.id }}</div></template>
    `;

    scan(auditor, 'src/components/MyComponent.vue', goodCode);
    expect(auditor.getCountsByRule().get('no-script-setup-exports') ?? 0).toBe(0);
  });
});
