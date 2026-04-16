/**
 * Mission data for the different player classes.
 */

export const CLASS_MISSIONS = [
  { id: 'mission_6h',  durationHs: 6,  reqLv: 1,  name: 'Misión Básica (6h)',     color: '#22c55e' },
  { id: 'mission_12h', durationHs: 12, reqLv: 15, name: 'Misión Avanzada (12h)',  color: '#3b82f6' },
  { id: 'mission_24h', durationHs: 24, reqLv: 25, name: 'Misión Experta (24h)',   color: '#a855f7' }
];

export function getMissionCostInfo(missionId, playerClass) {
  if (playerClass === 'cazabichos') {
    const costs = { mission_6h: 5000, mission_12h: 10000, mission_24h: 20000 };
    const ivFloor = { mission_6h: 5, mission_12h: 10, mission_24h: 15 };
    const shinyDiv = { mission_6h: 2, mission_12h: 4, mission_24h: 8 };
    return { type: 'money', cost: costs[missionId], ivFloor: ivFloor[missionId], shinyDiv: shinyDiv[missionId] };
  }
  if (playerClass === 'rocket') {
    const pokReq = { mission_6h: 1, mission_12h: 2, mission_24h: 3 };
    const mult = { mission_6h: 1.0, mission_12h: 1.3, mission_24h: 1.8 };
    return { type: 'pokemon_sacrifice', pokReq: pokReq[missionId], mult: mult[missionId] };
  }
  if (playerClass === 'entrenador') {
    const costs = { mission_6h: 5000, mission_12h: 10000, mission_24h: 20000 };
    const blocks = { mission_6h: 1, mission_12h: 2, mission_24h: 4 };
    const bonusLevel = missionId === 'mission_24h';
    return { type: 'money_pokemon', cost: costs[missionId], blocks: blocks[missionId], bonusLevel };
  }
  if (playerClass === 'criador') {
    const costs = { mission_6h: 300, mission_12h: 600, mission_24h: 1000 };
    const blocks = { mission_6h: 1, mission_12h: 2, mission_24h: 4 };
    const vigorSaveChance = missionId === 'mission_24h' ? 0.10 : 0;
    return { type: 'bc_pokemon', cost: costs[missionId], blocks: blocks[missionId], vigorSaveChance };
  }
  return null;
}
