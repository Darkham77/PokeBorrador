import { defineStore } from 'pinia'
import { reactive } from 'vue'

export const useGameStore = defineStore('game', () => {
  const state = reactive({
    trainer: '',
    level: 1,
    exp: 0,
    expNeeded: 100,
    money: 3000,
    battleCoins: 0,
    badges: 0,
    balls: 10,
    eggs: [],
    inventory: {},
    team: [],
    box: [],
    pokedex: [],
    seenPokedex: [],
    defeatedGyms: [],
    gymProgress: {},
    lastSave: null,
    starterChosen: false,
    playerClass: null,
    classLevel: 1,
    classXP: 0,
    nick_style: null,
    avatar_style: null,
    classData: {},
    missions: [],
    isReady: false
  })

  function updateState(newData) {
    Object.assign(state, newData)
  }

  /**
   * Sincroniza el store global de Vue con el estado interno del motor legacy.
   * Se usa para que los cambios en window.state se reflejen en la UI de Vue.
   */
  function syncFromLegacy(legacyState) {
    if (!legacyState) return
    
    // Mapeo directo de propiedades comunes
    const props = [
      'money', 'battleCoins', 'badges', 'balls', 'eggs', 
      'inventory', 'team', 'box', 'boxCount', 'pokedex', 'seenPokedex',
      'defeatedGyms', 'gymProgress', 'starterChosen',
      'playerClass', 'classLevel', 'classXP', 'classData', 'missions', 
      'nick_style', 'avatar_style'
    ]
    
    props.forEach(prop => {
      if (legacyState[prop] !== undefined) {
        state[prop] = legacyState[prop]
      }
    })

    // Mapeos con nombres diferentes
    if (legacyState.trainer) state.trainer = legacyState.trainer
    if (legacyState.trainerLevel !== undefined) state.level = legacyState.trainerLevel
    if (legacyState.trainerExp !== undefined) state.exp = legacyState.trainerExp
    if (legacyState.trainerExpNeeded !== undefined) state.expNeeded = legacyState.trainerExpNeeded
  }

  return {
    state,
    updateState,
    syncFromLegacy
  }
})
