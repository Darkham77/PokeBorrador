/**
 * OFFICIAL SERVERS CONFIGURATION (STABLE TYPED FACADE)
 * 
 * SSoT Architecture:
 * - Reads from gitignored `servers.local.json` if configured in the current environment.
 * - Falls back to tracked `servers.defaults.json` on clean clones.
 * - Governed by scripts/maintenance/configure_official_servers.ts (which writes to servers.local.json).
 * - NEVER modified directly by scripts to avoid git pull conflicts on production / testing deploys.
 */

import localServersData from './servers.local.json' with { type: 'json' };
import defaultServersData from './servers.defaults.json' with { type: 'json' };

export interface OfficialServer {
  id: string; // domain-ok: Open dynamic text or non-domain string payload
  name: string; // domain-ok: Open dynamic text or non-domain string payload
  region: string; // domain-ok: Open dynamic text or non-domain string payload
  url: string; // domain-ok: Open dynamic text or non-domain string payload
  anonKey: string; // domain-ok: Open dynamic text or non-domain string payload
  isDefault?: boolean;
}

const sourceData: readonly OfficialServer[] =
  Array.isArray(localServersData) && localServersData.length > 0
    ? (localServersData as readonly OfficialServer[])
    : (defaultServersData as readonly OfficialServer[]);

export const OFFICIAL_SERVERS: OfficialServer[] = [...sourceData];

export const DEFAULT_SERVER: OfficialServer =
  OFFICIAL_SERVERS.find((s) => s.isDefault) ?? OFFICIAL_SERVERS[0]!;

export const OFFICIAL_SERVERS_BY_ID = Object.freeze(
  Object.fromEntries(OFFICIAL_SERVERS.map((s) => [s.id, s]))
);
