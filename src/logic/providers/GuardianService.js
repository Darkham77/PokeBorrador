/**
 * GuardianService.js
 * Lógica centralizada para los Guardianes de Mapa y Zonas de Conflicto.
 */

const GUARDIAN_POOL = {
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
  isConflictZone(mapId, dynamicEvents = []) {
    const forcedByEvent = dynamicEvents.find(ev => ev.type === 'WORLD_CONFLICT' && ev.mapIds?.includes(mapId));
    if (forcedByEvent) return true;

    const dateStr = this.getArgentinaDateString();
    const maps = (typeof window !== 'undefined' ? window.FIRE_RED_MAPS : global.FIRE_RED_MAPS) || [];
    if (maps.length === 0) return false;

    const allMapIds = maps.map(m => m.id);
    const zones = [];
    let tempSeed = this.hashString(dateStr + "zones");
    
    while (zones.length < 5 && zones.length < allMapIds.length) {
      const idx = Math.abs(tempSeed) % allMapIds.length;
      const mId = allMapIds[idx];
      if (!zones.includes(mId)) zones.push(mId);
      tempSeed = this.hashString(tempSeed.toString());
    }
    return zones.includes(mapId);
  },

  /**
   * Obtiene el guardián correspondiente para un mapa.
   */
  getGuardianForMap(mapId, dynamicEvents = []) {
    if (!this.isConflictZone(mapId, dynamicEvents)) return null;

    const dateStr = this.getArgentinaDateString();
    const seed = this.hashString(dateStr + mapId);
    
    const rarityRand = (seed % 100);
    let tier = 'common';
    if (rarityRand >= 90) tier = 'elite';
    else if (rarityRand >= 60) tier = 'rare';

    const pool = GUARDIAN_POOL[tier];
    const index = seed % pool.length;
    return pool[index];
  },

  /**
   * Verifica si el guardián debe aparecer en este encuentro.
   */
  shouldSpawn(mapId, capturedIds = []) {
    if (capturedIds.includes(mapId)) return false;
    return Math.random() < CHANCE;
  },

  /**
   * Registra la captura o derrota del guardián en el servidor.
   */
  async recordGuardianResult(mapId, userId, faction, pts, outcome = 'capture', db = null) {
    if (!db) {
      console.warn('[GuardianService] No se proporcionó instancia de DBRouter.');
      return { success: false, error: 'No DB instance' };
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
  getArgentinaDateString() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  },

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
};
