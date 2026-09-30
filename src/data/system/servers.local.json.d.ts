/**
 * Type declarations for optional gitignored servers.local.json in PokeBorrador.
 * Ensures TypeScript compilation succeeds even before the local environment file is generated.
 */

declare module '@/data/system/servers.local.json' {
  import type { OfficialServer } from '@/data/system/official_servers.ts';
  const servers: readonly OfficialServer[];
  export default servers;
}

declare module './servers.local.json' {
  import type { OfficialServer } from './official_servers.ts';
  const servers: readonly OfficialServer[];
  export default servers;
}
