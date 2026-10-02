/**
 * auditor_fault_suite/triggers/bad_paths.ts
 *
 * FAULT TRIGGER: Hardcoded OS paths and ephemeral storage in source.
 */

export function resolveHardcodedPaths(): string {
  // Trigger: hardcoded-windows-path-separator
  const winPath = "C:\\projects\\facturacion2\\src\\data\\tariffs.ts";

  // Trigger: ephemeral-storage-in-source
  const tempOutput = "src/temp_scratch/output_data.json";

  return `${winPath}:${tempOutput}`;
}
