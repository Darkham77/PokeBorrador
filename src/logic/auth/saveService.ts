// [PureVue-Ignore-Length]
/**
 * Serializes the current state into a format suitable for database storage.
 * Matches the legacy 01_auth.js structure exactly for backward compatibility.
 */
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import type { AuthUser } from '@/types/auth/auth';
import { compress } from '@/logic/utils/compression';
import { writeOpfsFile } from '@/logic/utils/opfsStorage';
import { logger } from '@/logic/utils/logger';
import type { DBRouter } from '@/logic/db/dbRouter';
import { validateUserProfile, validateSaveData } from '@/logic/validation/schemas';
import { validatePokemon } from '@/logic/pokemon/pokemonFactory';

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
  gender?: 'h' | 'm';
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
    blackMarketDaily?: { date: string; items: string[]; purchased: string[] };
    activeMission?: unknown;
    extortedRouteId?: string | null;
    extortedRouteTimestamp?: string | null;
    lastEggScanDate?: string | null;
    officialRouteId?: string | null;
    kitCaptures?: number;
  };
  faction: string | null;
  warCoins: number;
  warCoinsSpent: number;
  warDailyCap: Record<string, Record<string, number>>;
  warDailyCoins: Record<string, number>;
  warMyPtsLocal: Record<string, number>;
  notificationHistory: unknown[];
  marketSoldSeenIds: string[];
  lastPokemonCenterHeal?: number;
  playtime?: number;
  _last_updated?: number;
}


interface EnemyPokemonSerialized {
  uid: string
  id: string
  name: string
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
  const battle = state.activeBattle;

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
              uid: p.uid, id: p.id, name: p.name, type: p.type,
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
    gender: state.gender || 'h',
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
      criminality: 0,
      extortedRouteId: null,
      extortedRouteTimestamp: null,
      lastEggScanDate: null,
      officialRouteId: null,
      kitCaptures: 0
    },
    faction: state.faction || null,
    warCoins: state.warCoins || 0,
    warCoinsSpent: state.warCoinsSpent || 0,
    warDailyCap: state.warDailyCap || {},
    warDailyCoins: (state.warDailyCoins || {}) as Record<string, number>,
    warMyPtsLocal: (state.warMyPtsLocal || {}) as Record<string, number>,
    notificationHistory: state.notificationHistory || [],
    marketSoldSeenIds: state.marketSoldSeenIds || [],
    lastPokemonCenterHeal: state.lastPokemonCenterHeal || 0,
    playtime: state.playtime || 0
  };
}

let lastBoxHash = '';
let lastValidatedBox: Pokemon[] = [];

/**
 * Validates the state before saving to prevent cache hacking or data corruption.
 */
export function validateAndSanitize(data: SaveData): { valid: boolean, data: SaveData, hadDuplicates?: boolean, issues: string[], error?: string } {
  if (!data) return { valid: false, data: {} as SaveData, issues: [], error: 'No data' };
  
  const issues: string[] = [];


  // Calculate box hash to check if it's dirty
  const currentBoxHash = (data.box || []).map(p => p ? `${p.uid}_${p.level}_${p.exp}_${p.hp}` : '').join(',');
  const isBoxDirty = !lastBoxHash || currentBoxHash !== lastBoxHash || lastValidatedBox.length !== (data.box || []).length;

  let parsedResult;
  if (!isBoxDirty && lastValidatedBox.length > 0) {
    // Optimization: Skip box validation by temporarily substituting it with a validated clone
    const testData = { ...data, box: [] };
    parsedResult = validateSaveData(testData);
    if (parsedResult.success) {
      // Restore the original box array
      parsedResult.output.box = data.box as unknown as typeof parsedResult.output.box;
    }
  } else {
    parsedResult = validateSaveData(data);
    if (parsedResult.success) {
      lastBoxHash = currentBoxHash;
      lastValidatedBox = parsedResult.output.box as unknown as Pokemon[];
    }
  }

  if (!parsedResult.success) {
    const errorMsg = parsedResult.issues.map(i => `${i.path?.[0]?.key || 'campo'}: ${i.message}`).join(', ');
    logger.error('SAVE', 'Error de validación estructural crítico:', parsedResult.issues);
    return {
      valid: false,
      data,
      issues: parsedResult.issues.map(i => i.message),
      error: 'Error de validación: ' + errorMsg
    };
  }

  // Sanitized data from Valibot (with fallbacks applied!)
  const sanitizedData = parsedResult.output as unknown as SaveData;
  
  // 1. Basic numeric validation
  if (sanitizedData.money < 0) { sanitizedData.money = 0; issues.push('Dinero negativo corregido'); }
  if (sanitizedData.battleCoins < 0) { sanitizedData.battleCoins = 0; issues.push('BattleCoins negativos corregidos'); }
  if (sanitizedData.trainerLevel < 1) { sanitizedData.trainerLevel = 1; issues.push('Nivel inválido corregido'); }
  
  // 2. Inventory sanity
  if (sanitizedData.inventory) {
    Object.keys(sanitizedData.inventory).forEach(item => {
      const qty = sanitizedData.inventory[item]
      if (typeof qty === 'number' && qty < 0) {
        sanitizedData.inventory[item] = 0;
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

  try {
    if (sanitizedData.team) {
      sanitizedData.team.forEach((p) => {
        checkPoke(p, 'equipo');
        validatePokemon(p);
      });
    }
    if (sanitizedData.box) {
      sanitizedData.box.forEach((p) => {
        checkPoke(p, 'caja');
        validatePokemon(p);
      });
    }
  } catch (err) {
    logger.error('SAVE', 'Error crítico en estructura de Pokémon al sanitizar/validar:', err);
    return {
      valid: false,
      data: sanitizedData,
      issues,
      error: `Error de estructura de Pokémon: ${(err as Error).message}`
    };
  }

  if (duplicateUids.size > 0) {
    // We sanitize by removing subsequent duplicates
    const finalUids = new Set<string>();
    if (Array.isArray(sanitizedData.team)) {
      sanitizedData.team = sanitizedData.team.filter((p) => {
        if (!p.uid) return true;
        if (finalUids.has(p.uid)) return false;
        finalUids.add(p.uid);
        return true;
      });
    }
    if (Array.isArray(sanitizedData.box)) {
      sanitizedData.box = sanitizedData.box.filter((p) => {
        if (!p.uid) return true;
        if (finalUids.has(p.uid)) return false;
        finalUids.add(p.uid);
        return true;
      });
    }
  }

  return { 
    valid: true, 
    data: sanitizedData, 
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
let _isRollingBack = false;

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
  if (!user || _isSaving || _isRollingBack) return null;

  _isSaving = true;
  try {
    const raw_data = serializeState(state);
    const { data: save_data, valid, hadDuplicates, issues, error: validationError } = validateAndSanitize(raw_data);

    if (!valid) {
      logger.error('SAVE', 'Abortando proceso de guardado por estado de datos erróneo:', validationError || issues);
      _isSaving = false;
      if (showNotif && notifyFn) {
        notifyFn(`Error al guardar: ${validationError || 'Datos corruptos o inválidos'}`, '🔴');
      }
      return { success: false, error: validationError || 'Datos corruptos o inválidos' };
    }

    // VERSIONED SECURITY LOGIC
    const currentVersion = options.userVersion || 1;
    const isLegacy = currentVersion < 3;

    // IF Duplicates found AND we are ONLINE AND NOT LEGACY -> Protocol ROLLBACK
    // Legacy accounts (v1/v2) get a "graceful cleanup" on their first save
    if (hadDuplicates && db && db.mode === 'online' && !isLegacy) {
      logger.error('SAVE', 'Duplicados críticos detectados en v2+. Iniciando ROLLBACK.', issues);
      try {
        const { data } = await db.from('game_saves').select('save_data').eq('user_id', user.id).single();
        const serverSave = data as { save_data: GameState } | null;
        if (serverSave?.save_data) {
          _isRollingBack = true;
          return { rollback: true, serverData: serverSave.save_data };
        }
      } catch(e) {
        logger.error('SAVE', `Error durante rollback: ${(e as Error).message}`);
      }
      _isRollingBack = true;
      return { rollback: true, error: 'Inconsistencia detectada. Recarga la página.' };
    }

    const isOnlineLocalUser = db && db.mode === 'online' && (user.id === 'local_user' || user.id.startsWith('local_'));

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
        _isRollingBack = true;
        return { rollback: true, outOfSync: true };
      }

      // Sincronizar campos principales en la tabla profiles para mantener consistencia
      try {
        const { data: existingProf } = await db.from('profiles').select('id').eq('id', user.id).maybeSingle();
        const finalUsername = save_data.trainer || user.user_metadata?.username || 'Entrenador';
        
        const profileValidation = validateUserProfile({
          id: user.id,
          username: finalUsername,
          level: save_data.trainerLevel,
          is_banned: false,
          coins: save_data.money
        });

        if (!profileValidation.success) {
          logger.warn('SAVE', 'Sincronización de perfil abortada por validación de esquema fallida:', profileValidation.issues);
          throw new Error('Datos del perfil inválidos: ' + (profileValidation.issues[0]?.message || 'Esquema incorrecto'));
        }

        const shinyCount = ((save_data.team || []).filter(p => p.isShiny).length) + ((save_data.box || []).filter(p => p.isShiny).length);
        const statsRecord = (save_data.stats || {}) as Record<string, unknown>;
        const maxDamage = Number(statsRecord.maxDamage) || 0;
        const totalBattles = Number(statsRecord.totalBattles) || 0;
        const tradeVolume = Number(statsRecord.tradeVolume) || 0;
        const captureAttempts = Number(statsRecord.captureAttempts) || 0;
        const captureSuccesses = Number(statsRecord.captureSuccesses) || 0;

        if (existingProf) {
          await db.from('profiles').update({
            username: finalUsername,
            trainer_level: save_data.trainerLevel,
            player_class: save_data.playerClass,
            faction: save_data.faction,
            avatar_style: save_data.avatar_style,
            nick_style: save_data.nick_style,
            badges: save_data.badges || 0,
            gender: save_data.gender || 'h',
            playtime: save_data.playtime || 0,
            last_played_at: Temporal.Now.instant().toString(),
            ranked_max_elo: save_data.rankedMaxElo || 1000,
            class_level: save_data.classLevel || 1,
            box_count: (save_data.box || []).length,
            pvp_draws: save_data.pvpStats?.draws || 0,
            longest_streak: save_data.classData?.longestStreak || 0,
            shiny_count: shinyCount,
            max_damage: maxDamage,
            total_battles: totalBattles,
            trade_volume: tradeVolume,
            capture_attempts: captureAttempts,
            capture_successes: captureSuccesses
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
            role: 'user',
            gender: save_data.gender || 'h',
            playtime: save_data.playtime || 0,
            created_at: Temporal.Now.instant().toString(),
            last_played_at: Temporal.Now.instant().toString(),
            ranked_max_elo: save_data.rankedMaxElo || 1000,
            class_level: save_data.classLevel || 1,
            box_count: (save_data.box || []).length,
            pvp_draws: save_data.pvpStats?.draws || 0,
            longest_streak: save_data.classData?.longestStreak || 0,
            shiny_count: shinyCount,
            max_damage: maxDamage,
            total_battles: totalBattles,
            trade_volume: tradeVolume,
            capture_attempts: captureAttempts,
            capture_successes: captureSuccesses,
            db_version: 3
          });
        }
        user.db_version = 3;
        logger.success('SAVE', 'Campos de perfil sincronizados en la base de datos.');
      } catch (e) {
        logger.warn('SAVE', `Error al sincronizar campos del perfil: ${(e as Error).message}`);
      }

      // IF successful migration save, we MUST update the user's version to v3
      let migrated = false;
      if (isLegacy) {
        try {
          await db.from('profiles').update({ db_version: 3 }).eq('id', user.id);
          user.db_version = 3;
          migrated = true;
          logger.success('SAVE', 'Account migrated to db_version v3');
        } catch(e) {
          logger.warn('SAVE', `Migration update failed: ${(e as Error).message}`);
        }
      }

      if (showNotif && notifyFn) {
        if (migrated) notifyFn('¡Cuenta migrada a Seguridad v3!', '✨');
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
