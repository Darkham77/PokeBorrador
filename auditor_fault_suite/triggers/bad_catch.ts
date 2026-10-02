/**
 * auditor_fault_suite/triggers/bad_catch.ts
 *
 * FAULT TRIGGER: Unjustified catch suppression and empty catch blocks.
 */

export function performUnsafeOperation(): void {
  // Trigger: empty-catch-block, unjustified-catch-suppression
  try {
    JSON.parse("{ invalid json }");
  } catch (e) {
  }
}
