import { useSocialStore } from '@/stores/social.js'
import { useWarStore } from '@/stores/war'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import * as missionData from '@/data/missionData';
import * as missionLogic from '@/logic/missions';
import * as missionUI from '@/logic/missionUI';

export function initSocialBridge() {
  const socialStore = useSocialStore()
  const warStore = useWarStore()
  const eventStore = useEventStore()
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const chatStore = useChatStore()

  // Social & Auth
  window.socialStore = socialStore
  window.doLogout = () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      authStore.logout()
    }
  }

  // War & Faction Logic
  window.warStore = warStore
  window.addWarPoints = (mapId, eventType, success, overridePts = null) => {
    const PTS_TABLE = { capture: 5, trainer_win: 8, wild_win: 1, shiny_capture: 40 };
    const pts = overridePts !== null ? overridePts : (PTS_TABLE[eventType] || 1);
    warStore.addPoints(mapId, pts);
  };

  // Events
  window.eventStore = eventStore
  window.loadActiveEvents = () => eventStore.fetchEvents();
  window.checkPendingAwards = () => eventStore.checkPendingAwards();

  // Missions
  window.CLASS_MISSIONS = missionData.CLASS_MISSIONS;
  window.getMissionCostInfo = missionData.getMissionCostInfo;
  window.calcRocketMissionMoney = missionLogic.calcRocketMissionMoney;
  window.generateBugNetPokemon = missionLogic.generateBugNetPokemon;
  window.startMission = missionLogic.startMission;
  window.getMissionDescription = missionUI.getMissionDescription;

  // --- Team Rocket & Release Modes (Selection Logic) ---
  window.toggleTeamRocketMode = () => {
    if (window.state?.playerClass !== 'rocket') return
    const ui = gameStore.state.uiSelection
    ui.teamRocketMode = !ui.teamRocketMode
    ui.teamRocketSelected = []
    
    // Legacy DOM side-effect
    const grid = document.getElementById('team-grid')
    if (grid) grid.dataset.rocketMode = ui.teamRocketMode
    
    if (typeof window.renderTeam === 'function') window.renderTeam()
    if (typeof window.triggerVueSync === 'function') window.triggerVueSync()
  }

  window.toggleTeamRocketSelect = (index) => {
    const ui = gameStore.state.uiSelection
    const idx = ui.teamRocketSelected.indexOf(index)
    if (idx > -1) ui.teamRocketSelected.splice(idx, 1)
    else ui.teamRocketSelected.push(index)
    
    if (typeof window.renderTeam === 'function') window.renderTeam()
    if (typeof window.triggerVueSync === 'function') window.triggerVueSync()
  }

  window.confirmTeamRocketSell = () => {
    const ui = gameStore.state.uiSelection
    const indices = ui.teamRocketSelected
    if (indices.length === 0) return
    
    if (confirm(`¿Estás seguro de que quieres vender ${indices.length} Pokémon al Team Rocket? Recibirás $${indices.length * 1500}.`)) {
      let totalPrice = 0
      indices.sort((a, b) => b - a).forEach(i => {
        const p = window.state.team.splice(i, 1)[0]
        if (p && typeof window.returnHeldItem === 'function') window.returnHeldItem(p)
        totalPrice += 1500
      })

      window.state.money = (window.state.money || 0) + totalPrice
      window.state.classData = window.state.classData || {}
      window.state.classData.blackMarketSales = (window.state.classData.blackMarketSales || 0) + indices.length
      
      if (typeof window.addCriminality === 'function') window.addCriminality(indices.length * 15)
      if (typeof window.addClassXP === 'function') window.addClassXP(25 * indices.length)

      ui.teamRocketSelected = []
      ui.teamRocketMode = false
      if (typeof window.renderTeam === 'function') window.renderTeam()
      if (typeof window.updateHud === 'function') window.updateHud()
      if (typeof window.triggerVueSync === 'function') window.triggerVueSync()
    }
  }

  window.toggleReleaseMode = () => {
    const ui = gameStore.state.uiSelection
    ui.teamReleaseMode = !ui.teamReleaseMode
    ui.teamReleaseSelected = []

    const grid = document.getElementById('team-grid')
    if (grid) grid.dataset.releaseMode = ui.teamReleaseMode
    
    if (typeof window.renderTeam === 'function') window.renderTeam()
    if (typeof window.triggerVueSync === 'function') window.triggerVueSync()
  }

  window.toggleReleaseSelect = (index) => {
    const ui = gameStore.state.uiSelection
    const idx = ui.teamReleaseSelected.indexOf(index)
    if (idx > -1) ui.teamReleaseSelected.splice(idx, 1)
    else ui.teamReleaseSelected.push(index)
    
    if (typeof window.triggerVueSync === 'function') window.triggerVueSync()
    if (typeof window.renderTeam === 'function') window.renderTeam()
  }

  window.confirmRelease = () => {
    const ui = gameStore.state.uiSelection
    const indices = ui.teamReleaseSelected
    if (indices.length === 0) return

    if (window.state.team.length - indices.length < 1) {
      if (typeof window.notify === 'function') window.notify('No puedes soltar a todos tus Pokémon.', '⚠️')
      return
    }

    if (confirm(`¿Estás seguro de que quieres soltar ${indices.length} Pokémon?`)) {
      indices.sort((a, b) => b - a).forEach(i => {
        const p = window.state.team.splice(i, 1)[0]
        if (p && typeof window.returnHeldItem === 'function') window.returnHeldItem(p)
      })

      ui.teamReleaseSelected = []
      ui.teamReleaseMode = false
      if (typeof window.renderTeam === 'function') window.renderTeam()
      if (typeof window.updateHud === 'function') window.updateHud()
      if (typeof window.scheduleSave === 'function') window.scheduleSave()
      if (typeof window.triggerVueSync === 'function') window.triggerVueSync()
    }
  }

  // Battle & Trade Invites (Legacy Integration)
  window.sendBattleInvite = (opponentId, opponentUsername) => {
    if (typeof window._sendBattleInviteLegacy === 'function') {
      window._sendBattleInviteLegacy(opponentId, opponentUsername)
    } else {
      console.warn('[SocialBridge] Legacy sendBattleInvite not found')
    }
  }

  window.openTradeModal = (friendId, friendUsername) => {
    if (typeof window._openTradeModalLegacy === 'function') {
      window._openTradeModalLegacy(friendId, friendUsername)
    } else {
      console.warn('[SocialBridge] Legacy openTradeModal not found')
    }
  }

  window.openChat = (friendId, friendUsername) => {
    chatStore.openChat(friendId, friendUsername)
  }

  // Initial Syncs
  warStore.loadWarData();
  eventStore.fetchEvents();
  eventStore.checkPendingAwards();

  console.log('[SocialBridge] Social, War and Event bindings initialized.')
}
