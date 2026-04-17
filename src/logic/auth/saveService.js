/**
 * Serializes the current state into a format suitable for database storage.
 * Matches the legacy 01_auth.js structure exactly for backward compatibility.
 */
export function serializeState(state) {
  let activeBattle = null;
  if (state.battle && !state.battle.over && (state.battle.isTrainer || state.battle.isGym)) {
    try {
      activeBattle = {
        isGym: state.battle.isGym || false,
        gymId: state.battle.gymId || null,
        isTrainer: state.battle.isTrainer || false,
        trainerName: state.battle.trainerName || null,
        locationId: state.battle.locationId || null,
        enemyTeam: state.battle.enemyTeam
          ? state.battle.enemyTeam.map(p => ({
              uid: p.uid, id: p.id, name: p.name, emoji: p.emoji, type: p.type,
              level: p.level, hp: p.hp, maxHp: p.maxHp, atk: p.atk, def: p.def,
              spa: p.spa, spd: p.spd, spe: p.spe, moves: p.moves,
              status: p.status || null, isShiny: p.isShiny || false,
              gender: p.gender || null, ivs: p.ivs, nature: p.nature,
              ability: p.ability, exp: p.exp || 0, expNeeded: p.expNeeded || 100,
              friendship: p.friendship || 70,
              _revealed: p._revealed || false, _gymLeader: p._gymLeader || null,
              _gymBadge: p._gymBadge || null,
            }))
          : null,
        timestamp: Date.now(),
      };
    } catch(e) {
      console.warn('[SAVE] Error serializando batalla activa:', e);
      activeBattle = null;
    }
  } else if (state.activeBattle && state.activeBattle.isPvP) {
    activeBattle = { ...state.activeBattle };
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
      ? Array.from(new Set(state.rankedRewardsClaimed.map(id => String(id))))
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
    shinyBoostSecs: state.shinyBoostSecs || 0,
    amuletCoinSecs: state.amuletCoinSecs || 0,
    luckyEggSecs: state.luckyEggSecs || 0,
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
    warDailyCoins: state.warDailyCoins || {},
    warMyPtsLocal: state.warMyPtsLocal || {},
    notificationHistory: state.notificationHistory || [],
    marketSoldSeenIds: state.marketSoldSeenIds || []
  };
}

/**
 * Validates the state before saving to prevent cache hacking or data corruption.
 */
export function validateAndSanitize(data) {
  if (!data) return { valid: false, error: 'No data' };
  
  const issues = [];
  
  // 1. Basic numeric validation
  if (data.money < 0) { data.money = 0; issues.push('Dinero negativo corregido'); }
  if (data.battleCoins < 0) { data.battleCoins = 0; issues.push('BattleCoins negativos corregidos'); }
  if (data.trainerLevel < 1) { data.trainerLevel = 1; issues.push('Nivel inválido corregido'); }
  
  // 2. Inventory sanity
  if (data.inventory) {
    Object.keys(data.inventory).forEach(item => {
      if (data.inventory[item] < 0) {
        data.inventory[item] = 0;
        issues.push(`Cantidad negativa de ${item} corregida`);
      }
    });
  }

  // 3. Unique ID (UID) integrity for Pokemon
  const uids = new Set();
  const duplicateUids = new Set();
  
  const checkPoke = (p, listName) => {
    if (!p.uid) return;
    if (uids.has(p.uid)) {
      duplicateUids.add(p.uid);
      issues.push(`Duplicado de UID detectado: ${p.uid} (${p.name}) en ${listName}`);
    }
    uids.add(p.uid);
  };

  if (Array.isArray(data.team)) data.team.forEach(p => checkPoke(p, 'equipo'));
  if (Array.isArray(data.box)) data.box.forEach(p => checkPoke(p, 'caja'));

  if (duplicateUids.size > 0) {
    // We sanitize by removing subsequent duplicates
    const finalUids = new Set();
    if (Array.isArray(data.team)) {
      data.team = data.team.filter(p => {
        if (!p.uid) return true;
        if (finalUids.has(p.uid)) return false;
        finalUids.add(p.uid);
        return true;
      });
    }
    if (Array.isArray(data.box)) {
      data.box = data.box.filter(p => {
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

export function isValidState(data) {
  return validateAndSanitize(data).valid;
}

/**
 * Saves the game to localStorage and the database.
 */
let _isSaving = false;
export async function saveGame(state, user, options = {}) {
  const { showNotif = true, notifyFn, db } = options;
  if (!user || _isSaving) return null;

  const raw_data = serializeState(state);
  const { data: save_data, hadDuplicates, issues } = validateAndSanitize(raw_data);

  // VERSIONED SECURITY LOGIC
  const currentVersion = options.userVersion || 1;
  const isLegacy = currentVersion < 2;

  // IF Duplicates found AND we are ONLINE AND NOT LEGACY -> Protocol ROLLBACK
  // Legacy accounts (v1) get a "graceful cleanup" on their first save
  if (hadDuplicates && db && db.mode === 'online' && !isLegacy) {
    console.error('[SAVE] Duplicados críticos detectados en v2+. Iniciando ROLLBACK.', issues);
    try {
      const { data: serverSave } = await db.from('game_saves').select('save_data').eq('user_id', user.id).single();
      if (serverSave?.save_data) {
        return { rollback: true, serverData: serverSave.save_data };
      }
    } catch(e) {
      console.error('[SAVE] Error durante rollback:', e);
    }
    return { rollback: true, error: 'Inconsistencia detectada. Recarga la página.' };
  }

  save_data._last_updated = Date.now();

  // 1. LocalStorage
  try {
    localStorage.setItem('pokemon_local_save_' + user.id, JSON.stringify(save_data));
  } catch (e) {
    console.warn('[SAVE] Error en localStorage:', e);
  }

  // 2. Database
  if (!db) {
    console.warn('[SAVE] No se proporcionó instancia de DBRouter. Omitiendo guardado en base de datos.');
    return null;
  }

  _isSaving = true;
  try {
    const { data: res, error } = await db.rpc('save_game_trusted', {
      p_save_data: save_data,
      p_expected_id: options.lastSaveId || null
    });

    if (error) throw error;
    
    if (res && res.success === false && res.error === 'OUT_OF_SYNC') {
      console.warn('[SAVE] Concurrencia detectada. El servidor tiene una versión más nueva.');
      return { rollback: true, outOfSync: true };
    }

    // IF successful migration save, we MUST update the user's version to v2
    let migrated = false;
    if (isLegacy) {
      try {
        await db.from('profiles').update({ db_version: 2 }).eq('id', user.id);
        migrated = true;
        console.log('[SAVE] Account migrated to db_version v2');
      } catch(e) {
        console.warn('[SAVE] Migration update failed:', e);
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
      lastSaveId: res.last_save_id 
    };
  } catch (e) {
    console.warn('[SAVE] Error en DB Persistente:', e);
    return { success: false, error: e.message };
  } finally {
    _isSaving = false;
  }
}
