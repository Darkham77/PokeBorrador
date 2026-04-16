import { supabase } from '@/logic/supabase';

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
 * Validates the state before saving.
 */
export function isValidState(data) {
  if (!data) return false;
  if (data.money < 0 || data.battleCoins < 0) return false;
  if (data.trainerLevel < 1 || data.trainerLevel > 100) return false;
  if (!Array.isArray(data.team)) return false;
  return true;
}

/**
 * Saves the game to localStorage and the database.
 */
let _isSaving = false;
export async function saveGame(state, user, options = {}) {
  const { showNotif = true, notifyFn } = options;
  if (!user || _isSaving) return;

  const save_data = serializeState(state);
  if (!isValidState(save_data)) {
    console.error('[SAVE] Estado inválido detectado. Abortando guardado.');
    return;
  }

  save_data._last_updated = Date.now();

  // 1. LocalStorage
  try {
    localStorage.setItem('pokemon_local_save_' + user.id, JSON.stringify(save_data));
  } catch (e) {
    console.warn('[SAVE] Error en localStorage:', e);
  }

  // 2. Database
  _isSaving = true;
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('game_saves').upsert({
      user_id: user.id,
      save_data,
      updated_at: nowIso,
    });

    if (error) throw error;
    if (showNotif && notifyFn) notifyFn('Juego Guardado', '💾');
  } catch (e) {
    console.warn('[SAVE] Error en Supabase:', e);
  } finally {
    _isSaving = false;
  }
}
