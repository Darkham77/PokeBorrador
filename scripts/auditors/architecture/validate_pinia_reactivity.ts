/**
 * scripts/auditors/architecture/validate_pinia_reactivity.ts
 *
 * PINIA REACTIVITY & STATE INTEGRITY AUDITOR (Node.js 26+ Native)
 *
 * Enforces Pinia reactivity standards across components and composables (vue-pinia-best-practices):
 *   1. No Store Destructuring Without storeToRefs (`no-store-destructuring-without-storetorefs`):
 *      Calling `const { a, b } = useXxxStore()` directly strips reactivity from reactive
 *      state properties and getters. Reactive state destructuring MUST be wrapped with `storeToRefs(store)`.
 *   2. No Direct State Mutation Outside Actions (`no-direct-state-mutation-outside-actions`):
 *      Direct assignment to `store.$state = ...` bypasses Pinia mutation tracking and action
 *      lifecycle. Permitted exclusively in authorized save persistence coordinators and tests.
 *
 * Escape Hatches:
 *   `// pinia-ok: <reason>`, `// store-ok: <reason>`
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/architecture/validate_pinia_reactivity.ts
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor, FileScanAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export type PiniaReactivityRuleId =
  | 'no-store-destructuring-without-storetorefs'
  | 'no-direct-state-mutation-outside-actions';

export const PINIA_REACTIVITY_RULES: readonly PiniaReactivityRuleId[] = [
  'no-store-destructuring-without-storetorefs',
  'no-direct-state-mutation-outside-actions'
] as const;

// Detects: const { ... } = useXxxStore()
const DIRECT_STORE_DESTRUCTURING_REGEX = /const\s*\{[^}]*\}\s*=\s*use[A-Z]\w*Store\s*\(/g;

// Detects: store.$state = ...
const DIRECT_STATE_MUTATION_REGEX = /\b(?:[a-zA-Z_$][\w$]*Store|store)\.\$state\s*=/g;

const AUTHORIZED_STATE_MUTATION_FILES = new Set([
  'src/stores/game/actions/saveActionHelpers.ts',
  'src/stores/game/actions/saveActions.ts',
  'src/logic/storage/SaveCoordinator.ts'
]);

export class PiniaReactivityAuditor extends FileScanAuditor<PiniaReactivityRuleId> {
  constructor() {
    super({
      id: 'validate_pinia_reactivity',
      name: 'Pinia Reactivity & State Integrity Auditor',
      description: 'Protege reactividad e integridad de stores de Pinia',
      family: 'architecture',
      ruleIds: PINIA_REACTIVITY_RULES,
      ruleDescriptions: {
        'no-store-destructuring-without-storetorefs': 'Desestructuración reactiva de Pinia sin storeToRefs',
        'no-direct-state-mutation-outside-actions': 'Mutación directa de $state fuera de acciones autorizadas'
      },
      roots: ['src'],
      allowedExtensions: new Set(['.vue', '.ts'])
    });
  }

  protected override scanFile(relPath: string, content: string): void {
    const normalizedPath = relPath.replace(/\\/g, '/');

    // Skip store declaration files themselves (where actions define store methods)
    if (normalizedPath.startsWith('src/stores/')) {
      // Still audit direct $state mutations in stores unless authorized
      if (!AUTHORIZED_STATE_MUTATION_FILES.has(normalizedPath)) {
        this.auditDirectStateMutation(normalizedPath, content);
      }
      return;
    }

    // 1. Audit direct store destructuring
    this.auditStoreDestructuring(normalizedPath, content);

    // 2. Audit direct $state mutations
    if (!AUTHORIZED_STATE_MUTATION_FILES.has(normalizedPath)) {
      this.auditDirectStateMutation(normalizedPath, content);
    }
  }

  private auditStoreDestructuring(relPath: string, content: string): void {
    let match: RegExpExecArray | null;
    const regex = new RegExp(DIRECT_STORE_DESTRUCTURING_REGEX.source, DIRECT_STORE_DESTRUCTURING_REGEX.flags);

    while ((match = regex.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const lineContent = this.getLineAt(content, line);

      if (this.hasEscapeHatch(lineContent, ['pinia-ok', 'store-ok'])) {
        continue;
      }

      this.addViolation({
        ruleId: 'no-store-destructuring-without-storetorefs',
        severity: 'error',
        file: relPath,
        line,
        message: `Direct destructuring from use...Store() detected. Destructuring directly strips reactivity from state and getters; wrap with 'storeToRefs(store)' or use '// pinia-ok: <reason>' if destructuring actions only.`,
        context: lineContent.trim()
      });
    }
  }

  private auditDirectStateMutation(relPath: string, content: string): void {
    this.scanRegexMatches(
      content,
      DIRECT_STATE_MUTATION_REGEX,
      relPath,
      'no-direct-state-mutation-outside-actions',
      ['pinia-ok', 'store-ok'],
      `Direct assignment to store.$state detected. Mutating $state directly outside persistence coordinators bypasses action lifecycles. Use actions or store.$patch instead.`
    );
  }
}

// Standalone execution support
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new PiniaReactivityAuditor());
}
