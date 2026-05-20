
/**
 * GuardianService.ts
 * Lógica centralizada para los Guardianes de Mapa y Zonas de Conflicto.
 */
import { logger } from '../utils/logger.ts';


import { DBRouter } from '../db/dbRouter.ts';
import { GAME_TIMEZONE } from '../timeUtils.ts';


export interface Guardian {
  id: string;
  lv: number;
  pts: number;
}

export interface DynamicEvent {
  type: string;
  mapIds?: string[];
  [key: string]: unknown;
}

const GUARDIAN_POOL: Record<string, Guardian[]> = {
  common: [
    { id: 'arcanine',   lv: 45, pts: 150 }, { id: 'pidgeot',    lv: 42, pts: 150 },
    { id: 'nidoking',   lv: 44, pts: 150 }, { id: 'nidoqueen',  lv: 44, pts: 150 },
    { id: 'victreebel', lv: 43, pts: 150 }, { id: 'vileplume',  lv: 43, pts: 150 },
    { id: 'sandslash',  lv: 41, pts: 150 }, { id: 'fearow',     lv: 42, pts: 150 },
    { id: 'golem',      lv: 45, pts: 150 }, { id: 'raichu',     lv: 45, pts: 150 },
    { id: 'weezing',    lv: 40, pts: 150 }, { id: 'muk',        lv: 40, pts: 150 },
    { id: 'starmie',    lv: 44, pts: 150 }, { id: 'rapidash',   lv: 44, pts: 150 },
    { id: 'hypno',      lv: 42, pts: 150 }
  ],
  rare: [
    { id: 'gyarados',   lv: 50, pts: 150 }, { id: 'alakazam',   lv: 48, pts: 150 },
    { id: 'machamp',    lv: 48, pts: 150 }, { id: 'gengar',     lv: 48, pts: 150 },
    { id: 'exeggutor',  lv: 46, pts: 150 }, { id: 'pinsir',     lv: 47, pts: 150 },
    { id: 'scyther',    lv: 47, pts: 150 }, { id: 'kangaskhan', lv: 45, pts: 150 },
    { id: 'tauros',     lv: 45, pts: 150 }, { id: 'slowbro',    lv: 46, pts: 150 }, 
    { id: 'jolteon',    lv: 48, pts: 150 }, { id: 'vaporeon',   lv: 48, pts: 150 }, 
    { id: 'flareon',    lv: 48, pts: 150 }
  ],
  elite: [
    { id: 'dragonite',  lv: 60, pts: 150 }, { id: 'snorlax',    lv: 55, pts: 150 },
    { id: 'lapras',     lv: 55, pts: 150 }, { id: 'chansey',    lv: 50, pts: 150 },
    { id: 'cloyster',   lv: 52, pts: 150 }
  ]
};

const CHANCE = 0.015; // 1.5%

export const GuardianService = {
  /**
   * Determina si un mapa está en zona de conflicto hoy.
   */
  isConflictZone(mapId: string, dynamicEvents: DynamicEvent[] = []): boolean {
    const forcedByEvent = dynamicEvents.find(ev => ev.type === 'WORLD_CONFLICT' && ev.mapIds?.includes(mapId));
    if (forcedByEvent) return true;

    const dateStr = this.getArgentinaDateString();
    const win = (typeof window !== 'undefined' ? window : global) as unknown as { FIRE_RED_MAPS?: { id: string }[] };
    const maps = win.FIRE_RED_MAPS || [];
    if (maps.length === 0) return false;

    const allMapIds = maps.map(m => m.id);
    const zones: string[] = [];
    let tempSeed = this.hashString(dateStr + "zones");
    
    while (zones.length < 5 && zones.length < allMapIds.length) {
      const idx = Math.abs(tempSeed) % allMapIds.length;
      const mId = allMapIds[idx];
      if (mId && !zones.includes(mId)) zones.push(mId);
      tempSeed = this.hashString(tempSeed.toString());
    }
    return zones.includes(mapId);
  },

  /**
   * Obtiene el guardián correspondiente para un mapa.
   */
  getGuardianForMap(mapId: string, dynamicEvents: DynamicEvent[] = []): Guardian | null {
    if (!this.isConflictZone(mapId, dynamicEvents)) return null;

    const dateStr = this.getArgentinaDateString();
    const seed = this.hashString(dateStr + mapId);
    
    const rarityRand = (seed % 100);
    let tier = 'common';
    if (rarityRand >= 90) tier = 'elite';
    else if (rarityRand >= 60) tier = 'rare';

    const pool = GUARDIAN_POOL[tier] || GUARDIAN_POOL['common'] || [];
    if (pool.length === 0) return null;
    const index = seed % pool.length;
    return pool[index] || null;
  },

  /**
   * Verifica si el guardián debe aparecer en este encuentro.
   */
  shouldSpawn(mapId: string, capturedIds: string[] = []): boolean {
    if (capturedIds.includes(mapId)) return false;
    return Math.random() < CHANCE;
  },

  /**
   * Registra la captura o derrota del guardián en el servidor.
   */
   async recordGuardianResult(mapId: string, userId: string, faction: string, pts: number, outcome: 'capture' | 'defeat' = 'capture', db: DBRouter | null = null): Promise<{ success: boolean; ptsAwarded: number; error: unknown }> {
    if (!db) {
      logger.warn('Guardian', 'No se proporcionó instancia de DBRouter.');
      return { success: false, ptsAwarded: 0, error: 'No DB instance' };
    }

    const today = this.getArgentinaDateString();
    const ptsAwarded = outcome === 'capture' ? pts : Math.floor(pts * 0.7);

    const { error } = await db
      .from('guardian_captures')
      .insert({
        capture_date: today,
        map_id: mapId,
        user_id: userId,
        winner_faction: faction,
        pts_awarded: ptsAwarded
      });

    return { success: !error, ptsAwarded, error };
  },

  // Helpers
  getArgentinaDateString(): string {
    return Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE).toPlainDate().toString();
  },

  hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
};
