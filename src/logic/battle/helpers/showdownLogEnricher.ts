// src/logic/battle/helpers/showdownLogEnricher.ts
import type { Battle } from '@pkmn/sim';

/**
 * Standardizes log line enrichment with UID tags ([uids]...)
 * across both the browser web worker and the fuzzer/replayer runner.
 */
export class ShowdownLogEnricher {
  /**
   * Overrides battle.add and battle.addMove to inject UIDs in real-time.
   */
  static setupRealtimeEnrichment(battle: Battle): void {
    const originalAdd = battle.add;
    battle.add = function (...parts: unknown[]) {
      originalAdd.apply(this, parts as unknown as Parameters<typeof originalAdd>);
      const lastIndex = battle.log.length - 1;
      if (lastIndex >= 0) {
        const line = battle.log[lastIndex];
        const uidMappings: string[] = [];
        parts.forEach(part => {
          if (part && typeof part === 'object' && 'uid' in part && (part as { uid: string }).uid) {
            const ident = part.toString();
            if (ident) {
              const cleanIdent = ident.replace(/\s+/g, '');
              uidMappings.push(`${cleanIdent}=${(part as { uid: string }).uid}`);
            }
          }
        });
        if (uidMappings.length > 0) {
          battle.log[lastIndex] = `${line}|[uids]${uidMappings.join(',')}`;
        }
      }
    };

    const originalAddMove = battle.addMove;
    battle.addMove = function (...parts: unknown[]) {
      originalAddMove.apply(this, parts as unknown as Parameters<typeof originalAddMove>);
      const lastIndex = battle.log.length - 1;
      if (lastIndex >= 0) {
        const line = battle.log[lastIndex];
        const uidMappings: string[] = [];
        parts.forEach(part => {
          if (part && typeof part === 'object' && 'uid' in part && (part as { uid: string }).uid) {
            const ident = part.toString();
            if (ident) {
              const cleanIdent = ident.replace(/\s+/g, '');
              uidMappings.push(`${cleanIdent}=${(part as { uid: string }).uid}`);
            }
          }
        });
        if (uidMappings.length > 0) {
          battle.log[lastIndex] = `${line}|[uids]${uidMappings.join(',')}`;
        }
      }
    };
  }

  /**
   * Retroactively enriches early logs (e.g. initial lead switch/drag lines).
   */
  static enrichRetroactiveLeads(battle: Battle): void {
    const enriched = battle.log.map(line => {
      if (line.startsWith('|switch|') || line.startsWith('|drag|')) {
        const parts = line.split('|');
        const rawId = parts[2] || '';
        const isPlayer = rawId.startsWith('p1a:') || rawId === 'p1a';
        const sideObj = isPlayer ? battle.p1 : battle.p2;
        const activeMon = sideObj?.active?.[0];
        const uid = activeMon ? (activeMon as unknown as { uid?: string }).uid : null;
        if (uid && !line.includes('|[uids]')) {
          const cleanIdent = rawId.replace(/\s+/g, '');
          return `${line}|[uids]${cleanIdent}=${uid}`;
        }
      }
      return line;
    });

    battle.log.length = 0;
    battle.log.push(...enriched);
  }
}
