/**
 * auditor_fault_suite/triggers/bad_domain.ts
 *
 * FAULT TRIGGER: Domain types, fallback patterns and O(1) access anti-patterns.
 */

// Trigger: naked-string-domain-id
export function calculateTariffRate(tariffId: string): number {
  // Trigger: forbidden-fallback-id
  const fallbackId = tariffId || "default_tariff_id";

  // Trigger: linear-search-in-o1-catalog
  const OFFICIAL_SERVERS = [{ id: 'srv-1', host: 'localhost' }];
  const found = OFFICIAL_SERVERS.find(s => s.id === fallbackId);

  return found ? 100 : 0;
}
