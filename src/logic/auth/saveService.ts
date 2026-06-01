// [PureVue-Ignore-Length]
/**
 * Serializes the current state into a format suitable for database storage.
 * Matches the legacy 01_auth.js structure exactly for backward compatibility.
 */
import type { Pokemon } from '@/types/pokemon';
import type { GameState } from '@/types/game';
import type { AuthUser } from '@/types/auth';
import { compress } from '@/logic/utils/compression';
import { writeOpfsFile } from '@/logic/utils/opfsStorage';
import { logger } from '@/logic/utils/logger';
import type { DBRouter } from '@/logic/db/dbRouter';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

export interface SaveResult {
  success?: boolean;
  remote?: boolean;
  rollback?: boolean;
  serverData?: unknown;
  error?: string;
  outOfSync?: boolean;
  sanitized?: boolean;
  migrated?: boolean;
  lastSaveId?: string;
}

export interface SaveData {
  trainer: string;
  badges: number;
  balls: number;
  money: number;
  battleCoins: number;
  eggs: unknown[];
  trainerLevel: number;
  trainerExp: number;
  trainerExpNeeded: number;
  inventory: Record<string, number>;
  team: Pokemon[];
  box: Pokemon[];
  pokedex: string[];
  seenPokedex: string[];
  defeatedGyms: string[];
  gymProgress: Record<string, unknown>;
  lastGymWins: Record<string, number>;
  lastGymAttempts: Record<string, number>;
  starterChosen: boolean;
  lastRankedSeason: string | null;
  nick_style: string | null;
  avatar_style: string | null;
  stats: Record<string, unknown>;
  eloRating: number;
  pvpStats: {
    wins: number;
    losses: number;
    draws: number;
  };
  rankedMaxElo: number;
  rankedRewardsClaimed: string[];
  passiveTeamUids: string[];
  passiveTeamActive: boolean;
  activeBattle: unknown;
  daycare_missions: unknown[];
  daycare_mission_refreshes: number;
  safariTicketSecs: number;
  ceruleanTicketSecs: number;
  articunoTicketSecs: number;
  mewtwoTicketSecs: number;
  repelSecs: number;
  fishingRodSecs: number;
  fishingRodType: string | null;
  pickaxeSecs: number;
  pickaxeType: string | null;
  brushSecs: number;
  brushType: string | null;
  shinyBoostSecs: number;
  amuletCoinSecs: number;
  luckyEggSecs: number;
  ivScannerSecs: number;
  incenseSecs: number;
  incenseType: string | null;
  daycare_berry_egg_time: number;
  boxCount: number;
  chats: Record<string, unknown>;
  playerClass: string | null;
  classLevel: number;
  classXP: number;
  classData: {
    captureStreak: number;
    longestStreak: number;
    reputation: number;
    blackMarketSales: number;
    criminality: number;
  };
  faction: string | null;
  warCoins: number;
  warCoinsSpent: number;
  warDailyCap: Record<string, Record<string, number>>;
  warDailyCoins: Record<string, number>;
  warMyPtsLocal: Record<string, number>;
  notificationHistory: unknown[];
  marketSoldSeenIds: string[];
  _last_updated?: number;
}


interface EnemyPokemonSerialized {
  uid: string
  id: string
  name: string
  emoji: string
  type: string
  level: number
  hp: number
  maxHp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
  moves: unknown[]
  status: string | null
  isShiny: boolean
  gender: string | null
  ivs: Record<string, number>
  nature: string
  ability: string
  exp: number
  expNeeded: number
  friendship: number
  _revealed: boolean
  _gymLeader: string | null
  _gymBadge: string | null
}

interface ActiveBattleSerialized {
  isGym: boolean
  gymId: string | null
  isTrainer: boolean
  trainerName: string | null
  locationId: string | null
  enemyTeam: EnemyPokemonSerialized[] | null
  timestamp: number
  isPvP?: boolean
}
export function serializeState(state: GameState): SaveData {
  let activeBattle: ActiveBattleSerialized | null = null;
  const battle = state.battle;

  if (battle && !battle.over && (battle.isTrainer || battle.isGym)) {
    try {
      activeBattle = {
        isGym: battle.isGym || false,
        gymId: battle.gymId || null,
        isTrainer: battle.isTrainer || false,
        trainerName: battle.trainerName || null,
        locationId: battle.locationId || null,
        enemyTeam: battle.enemyTeam
          ? (battle.enemyTeam as Pokemon[]).map(p => ({
              uid: p.uid, id: p.id, name: p.name, emoji: p.emoji, type: p.type,
              level: p.level, hp: p.hp, maxHp: p.maxHp, atk: p.atk, def: p.def,
              spa: p.spa, spd: p.spd, spe: p.spe, moves: p.moves,
              status: p.status || null, isShiny: p.isShiny || false,
              gender: p.gender || null, ivs: p.ivs, nature: p.nature,
              ability: p.ability, exp: p.exp || 0, expNeeded: p.expNeeded || 100,
              friendship: p.friendship || 70,
              _revealed: (p as Pokemon & { _revealed?: boolean })._revealed || false,
              _gymLeader: (p as Pokemon & { _gymLeader?: string })._gymLeader || null,
              _gymBadge: (p as Pokemon & { _gymBadge?: string })._gymBadge || null,
            }))
          : null,
        timestamp: Temporal.Now.instant().epochMilliseconds,
      } as ActiveBattleSerialized;
    } catch(e) {
      logger.warn('SAVE', `Error serializando batalla activa: ${(e as Error).message}`);
      activeBattle = null;
    }
  } else if (state.activeBattle && (state.activeBattle as unknown as Record<string, unknown>).isPvP) {
    activeBattle = { ...(state.activeBattle as unknown as Record<string, unknown>) } as unknown as ActiveBattleSerialized;
  }

  return {
    trainer: state.trainer,
    badges: state.badges,
    balls: state.balls,
    money: state.money,
    battleCoins: state.battleCoins || 0,
    eggs: state.eggs || [],
    trainerLevel: state.trainerLevel,
    trainerExp: state.trainerExp,
    trainerExpNeeded: state.trainerExpNeeded,
    inventory: state.inventory,
    team: state.team,
    box: state.box || [],
    pokedex: state.pokedex,
    seenPokedex: state.seenPokedex || [],
    defeatedGyms: state.defeatedGyms,
    gymProgress: state.gymProgress || {},
    lastGymWins: state.lastGymWins || {},
    lastGymAttempts: state.lastGymAttempts || {},
    starterChosen: state.starterChosen || false,
    lastRankedSeason: state.lastRankedSeason || null,
    nick_style: state.nick_style || null,
    avatar_style: state.avatar_style || null,
    stats: state.stats || {},
    eloRating: Number.isFinite(Number(state.eloRating)) ? Number(state.eloRating) : 1000,
    pvpStats: {
      wins: Number(state.pvpStats?.wins) || 0,
      losses: Number(state.pvpStats?.losses) || 0,
      draws: Number(state.pvpStats?.draws) || 0
    },
    rankedMaxElo: Number.isFinite(Number(state.rankedMaxElo))
      ? Math.max(1000, Math.floor(Number(state.rankedMaxElo)))
      : Math.max(1000, Number(state.eloRating) || 1000),
    rankedRewardsClaimed: Array.isArray(state.rankedRewardsClaimed)
      ? Array.from(new Set(state.rankedRewardsClaimed.map((id) => String(id))))
      : [],
    passiveTeamUids: state.passiveTeamUids || [],
    passiveTeamActive: state.passiveTeamActive,
    activeBattle,
    daycare_missions: state.daycare_missions || [],
    daycare_mission_refreshes: state.daycare_mission_refreshes !== undefined ? state.daycare_mission_refreshes : 3,
    safariTicketSecs: state.safariTicketSecs || 0,
    ceruleanTicketSecs: state.ceruleanTicketSecs || 0,
    articunoTicketSecs: state.articunoTicketSecs || 0,
    mewtwoTicketSecs: state.mewtwoTicketSecs || 0,
    repelSecs: state.repelSecs || 0,
    fishingRodSecs: state.fishingRodSecs || 0,
    fishingRodType: state.fishingRodType || null,
    pickaxeSecs: state.pickaxeSecs || 0,
    pickaxeType: state.pickaxeType || null,
    brushSecs: state.brushSecs || 0,
    brushType: state.brushType || null,
    shinyBoostSecs: state.shinyBoostSecs || 0,
    amuletCoinSecs: state.amuletCoinSecs || 0,
    luckyEggSecs: state.luckyEggSecs || 0,
    ivScannerSecs: state.ivScannerSecs || 0,
    incenseSecs: state.incenseSecs || 0,
    incenseType: state.incenseType || null,
    daycare_berry_egg_time: state.daycare_berry_egg_time || 0,
    boxCount: state.boxCount || 4,
    chats: state.chats || {},
    playerClass: state.playerClass || null,
    classLevel: state.classLevel || 1,
    classXP: state.classXP || 0,
    classData: state.classData || {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0
    },
    faction: state.faction || null,
    warCoins: state.warCoins || 0,
    warCoinsSpent: state.warCoinsSpent || 0,
    warDailyCap: state.warDailyCap || {},
    warDailyCoins: (state.warDailyCoins || {}) as Record<string, number>,
    warMyPtsLocal: (state.warMyPtsLocal || {}) as Record<string, number>,
    notificationHistory: state.notificationHistory || [],
    marketSoldSeenIds: state.marketSoldSeenIds || []
  };
}

/**
 * Validates the state before saving to prevent cache hacking or data corruption.
 */
export function validateAndSanitize(data: SaveData): { valid: boolean, data: SaveData, hadDuplicates?: boolean, issues: string[], error?: string } {
  if (!data) return { valid: false, data: {} as SaveData, issues: [], error: 'No data' };
  
  const issues: string[] = [];
  
  // 1. Basic numeric validation
  if (data.money < 0) { data.money = 0; issues.push('Dinero negativo corregido'); }
  if (data.battleCoins < 0) { data.battleCoins = 0; issues.push('BattleCoins negativos corregidos'); }
  if (data.trainerLevel < 1) { data.trainerLevel = 1; issues.push('Nivel inválido corregido'); }
  
  // 2. Inventory sanity
  if (data.inventory) {
    Object.keys(data.inventory).forEach(item => {
      const qty = data.inventory[item]
      if (typeof qty === 'number' && qty < 0) {
        data.inventory[item] = 0;
        issues.push(`Cantidad negativa de ${item} corregida`);
      }
    });
  }

  // 3. Unique ID (UID) integrity for Pokemon
  const uids = new Set<string>();
  const duplicateUids = new Set<string>();
  
  const checkPoke = (p: Pokemon, listName: string) => {
    if (!p || !p.uid) return;
    if (uids.has(p.uid)) {
      duplicateUids.add(p.uid);
      issues.push(`Duplicado de UID detectado: ${p.uid} (${p.name}) en ${listName}`);
    }
    uids.add(p.uid);
  };

  const sanitizeMoves = (p: Pokemon) => {
    if (p && Array.isArray(p.moves)) {
      p.moves.forEach((m) => {
        if (m && m.name) {
          const resolvedId = pokemonDataProvider.resolveMoveId(m.name);
          if (resolvedId) {
            m.id = resolvedId;
            const dbMove = pokemonDataProvider.getMoveData(resolvedId);
            if (dbMove) {
              m.name = dbMove.name;
            }
          }
        }
      });
    }
  };

  if (data.team) {
    data.team.forEach((p) => {
      checkPoke(p, 'equipo');
      sanitizeMoves(p);
    });
  }
  if (data.box) {
    data.box.forEach((p) => {
      checkPoke(p, 'caja');
      sanitizeMoves(p);
    });
  }

  if (duplicateUids.size > 0) {
    // We sanitize by removing subsequent duplicates
    const finalUids = new Set<string>();
    if (Array.isArray(data.team)) {
      data.team = data.team.filter((p) => {
        if (!p.uid) return true;
        if (finalUids.has(p.uid)) return false;
        finalUids.add(p.uid);
        return true;
      });
    }
    if (Array.isArray(data.box)) {
      data.box = data.box.filter((p) => {
        if (!p.uid) return true;
        if (finalUids.has(p.uid)) return false;
        finalUids.add(p.uid);
        return true;
      });
    }
  }

  return { 
    valid: true, 
    data, 
    hadDuplicates: duplicateUids.size > 0,
    issues 
  };
}

export function isValidState(data: SaveData): boolean {
  return validateAndSanitize(data).valid;
}

/**
 * Saves the game to localStorage and the database.
 */
let _isSaving = false;

interface SaveOptions {
  showNotif?: boolean
  notifyFn?: (msg: string, icon?: string) => void
  db?: DBRouter
  userVersion?: number
  lastSaveId?: string
  skipRemote?: boolean
}

export async function saveGame(state: GameState, user: AuthUser, options: SaveOptions = {}): Promise<SaveResult | null> {
  const { showNotif = true, notifyFn, db } = options;
  if (!user || _isSaving) return null;

  _isSaving = true;
  try {
    const raw_data = serializeState(state);
    const { data: save_data, hadDuplicates, issues } = validateAndSanitize(raw_data);

    // VERSIONED SECURITY LOGIC
    const currentVersion = options.userVersion || 1;
    const isLegacy = currentVersion < 2;

    // IF Duplicates found AND we are ONLINE AND NOT LEGACY -> Protocol ROLLBACK
    // Legacy accounts (v1) get a "graceful cleanup" on their first save
    if (hadDuplicates && db && db.mode === 'online' && !isLegacy) {
      logger.error('SAVE', 'Duplicados críticos detectados en v2+. Iniciando ROLLBACK.', issues);
      try {
        const { data } = await db.from('game_saves').select('save_data').eq('user_id', user.id).single();
        const serverSave = data as { save_data: GameState } | null;
        if (serverSave?.save_data) {
          return { rollback: true, serverData: serverSave.save_data };
        }
      } catch(e) {
        logger.error('SAVE', `Error durante rollback: ${(e as Error).message}`);
      }
      return { rollback: true, error: 'Inconsistencia detectada. Recarga la página.' };
    }

    (save_data as { _last_updated?: number })._last_updated = Temporal.Now.instant().epochMilliseconds;

    // 1. Local Persistence (Legacy LocalStorage + Modern OPFS GZIP)
    try {
      const json = JSON.stringify(save_data);
      localStorage.setItem('pokemon_local_save_' + user.id, json);
      
      // Modern High-Fidelity Binary Storage (OPFS)
      const compressed = await compress(json);
      await writeOpfsFile(`save_${user.id}.gz`, compressed);
    } catch (e) {
      logger.warn('SAVE', `Error en persistencia local (LS/OPFS): ${(e as Error).message}`);
    }

    const isOnlineLocalUser = db && db.mode === 'online' && (user.id === 'local_user' || user.id.startsWith('local_'));

    // 2. Database
    if (!db || options.skipRemote || isOnlineLocalUser) {
      if (options.skipRemote || isOnlineLocalUser) {
        logger.info('SAVE', `Database save skipped (${isOnlineLocalUser ? 'Local User in Online Mode' : 'Session Locked'}). Local storage only.`);
      } else {
        logger.warn('SAVE', 'No DBRouter instance provided. Skipping DB save.');
      }
      
      if (showNotif && notifyFn && (options.skipRemote || isOnlineLocalUser) && user.id !== 'local_user' && !user.id.startsWith('local_')) {
        notifyFn('Progreso guardado localmente (Sesión Bloqueada)', '🟠');
      }
      
      return { success: true, remote: false };
    }

    try {
      const { data: res, error } = await db.rpc('save_game_trusted', {
        p_save_data: save_data,
        p_expected_id: options.lastSaveId || null
      });

      if (error) throw error;
      
      const resData = res as { success: boolean; error: string; last_save_id: string } | null;
      if (resData && resData.success === false && resData.error === 'OUT_OF_SYNC') {
        logger.warn('SAVE', 'Concurrencia detectada. El servidor tiene una versión más nueva.');
        return { rollback: true, outOfSync: true };
      }

      // Sincronizar campos principales en la tabla profiles para mantener consistencia
      try {
        const { data: existingProf } = await db.from('profiles').select('id').eq('id', user.id).maybeSingle();
        const finalUsername = save_data.trainer || user.user_metadata?.username || 'Entrenador';
        
        if (existingProf) {
          await db.from('profiles').update({
            username: finalUsername,
            trainer_level: save_data.trainerLevel,
            player_class: save_data.playerClass,
            faction: save_data.faction,
            avatar_style: save_data.avatar_style,
            nick_style: save_data.nick_style,
            badges: save_data.badges || 0
          }).eq('id', user.id);
        } else {
          await db.from('profiles').insert({
            id: user.id,
            username: finalUsername,
            email: user.email || `${user.id}@local`,
            trainer_level: save_data.trainerLevel || 1,
            player_class: save_data.playerClass || 'entrenador',
            faction: save_data.faction || null,
            avatar_style: save_data.avatar_style || '',
            nick_style: save_data.nick_style || '',
            badges: save_data.badges || 0,
            role: 'user'
          });
        }
        logger.success('SAVE', 'Campos de perfil sincronizados en la base de datos.');
      } catch (e) {
        logger.warn('SAVE', `Error al sincronizar campos del perfil: ${(e as Error).message}`);
      }

      // IF successful migration save, we MUST update the user's version to v2
      let migrated = false;
      if (isLegacy) {
        try {
          await db.from('profiles').update({ db_version: 2 }).eq('id', user.id);
          migrated = true;
          logger.success('SAVE', 'Account migrated to db_version v2');
        } catch(e) {
          logger.warn('SAVE', `Migration update failed: ${(e as Error).message}`);
        }
      }

      if (showNotif && notifyFn) {
        if (migrated) notifyFn('¡Cuenta migrada a Seguridad v2!', '✨');
        else if (hadDuplicates) notifyFn('Cache saneada (duplicados eliminados)', '🛡️');
        else notifyFn('Juego Guardado', '💾');
      }
      
      return { 
        success: true, 
        sanitized: hadDuplicates, 
        migrated,
        lastSaveId: resData?.last_save_id 
      };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      logger.warn('SAVE', `Error en DB Persistente: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  } finally {
    _isSaving = false;
  }
}
