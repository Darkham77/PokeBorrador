/**
 * Logic for class-specific missions.
 */

export function calcRocketMissionMoney(pokeList, mult) {
  const subtotal = pokeList.reduce((acc, p) => {
    const totalIvs = Object.values(p.ivs || {}).reduce((s, v) => s + (v || 0), 0);
    const pLevel = p.level || 1;
    const val = 2000 + (pLevel * 200) + (totalIvs * 50);
    return acc + val;
  }, 0);
  return Math.floor(subtotal * mult);
}

export function generateBugNetPokemon(options = {}) {
  const { state, POKEMON_DB, FIRE_RED_MAPS, GAME_RATIOS, makePokemon, ivFloor, shinyDivisor } = options;
  
  const badgeCount = (Array.isArray(state.badges) ? state.badges.length : (parseInt(state.badges) || 0));
  const BUG_TYPES = ['bug'];
  
  const accessibleBugs = [];
  FIRE_RED_MAPS.forEach(map => {
    if (map.badges > badgeCount) return;
    const allWild = Object.values(map.wild || {}).flat();
    allWild.forEach(id => {
      const pData = POKEMON_DB[id];
      if (pData && BUG_TYPES.includes(pData.type) && !accessibleBugs.includes(id)) {
        accessibleBugs.push({ id, lv: map.lv });
      }
    });
  });

  if (!accessibleBugs.length) return [];
  
  const shinyRate = Math.floor((GAME_RATIOS?.shinyRate || 4096) / (shinyDivisor || 1));
  const results = [];
  for (let i = 0; i < 3; i++) {
    const pick = accessibleBugs[Math.floor(Math.random() * accessibleBugs.length)];
    const level = Math.floor(Math.random() * (pick.lv[1] - pick.lv[0] + 1)) + pick.lv[0];
    const poke = makePokemon(pick.id, level);
    if (poke.ivs) {
      ['hp','atk','def','spa','spd','spe'].forEach(stat => {
        if (poke.ivs[stat] < ivFloor) poke.ivs[stat] = ivFloor;
      });
    }
    if (Math.random() < 1 / shinyRate) poke.shiny = true;
    results.push(poke);
  }
  return results;
}

/**
 * Common logic to start a mission.
 */
export function startMission(state, missionId, hs, metadata = {}) {
  state.classData = state.classData || {};
  state.classData.activeMission = {
    id: missionId,
    startedAt: Date.now(),
    endsAt: Date.now() + (hs * 3600 * 1000),
    metadata
  };
  return state.classData.activeMission;
}
