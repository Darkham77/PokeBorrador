import { defineStore } from 'pinia'
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { usePvPStore } from './pvp'

export const useLivePvPStore = defineStore('livePvP', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const pvpStore = usePvPStore()

  // State
  const activeInvite = ref(null)
  const isSearching = ref(false)
  const battleState = reactive({
    active: false,
    ch: null,
    isHost: false,
    isRanked: false,
    opponentId: null,
    opponentName: 'Rival',
    opponentElo: 1000,
    phase: 'sync', // sync, choosing, animating, faint_switch, over
    myTeam: [],
    enemyTeam: [],
    myActiveIdx: 0,
    enemyActiveIdx: 0,
    myHp: [],
    enemyHp: [],
    myStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
    enemyStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
    myPick: null,
    enemyPick: null,
    logs: [],
    deadline: null,
  })

  let invitePoller = null

  // Actions
  function initInvitePoller() {
    if (invitePoller) clearInterval(invitePoller)
    if (authStore.sessionMode === 'offline') return

    invitePoller = setInterval(async () => {
      if (!authStore.user) return
      const db = gameStore.db
      const { data } = await db.from('battle_invites')
        .select('*')
        .eq('opponent_id', authStore.user.id)
        .in('status', ['pending', 'ranked_match'])
        .order('created_at', { ascending: false })
        .limit(1)

      if (data?.length) {
        const inv = data[0]
        // Evitar procesar invitaciones viejas (>1 min)
        if (Date.now() - new Date(inv.created_at).getTime() > 60000) return

        if (inv.status === 'ranked_match') {
          if (!isSearching.value) {
            await db.from('battle_invites').update({ status: 'declined' }).eq('id', inv.id)
            return
          }
          // Auto-accept ranked match
          acceptInvite(inv.id, true)
        } else {
          activeInvite.value = inv
        }
      }
    }, 4000)
  }

  async function sendInvite(opponentId, opponentName) {
    if (authStore.sessionMode === 'offline') return
    const db = gameStore.db
    const { error } = await db.from('battle_invites').insert({
      challenger_id: authStore.user.id,
      opponent_id: opponentId,
      status: 'pending'
    })

    if (error) {
      uiStore.notify('Error al enviar desafío: ' + error.message, '❌')
      return
    }

    uiStore.notify(`¡Desafío enviado a ${opponentName}!`, '⚔️')
  }

  async function acceptInvite(inviteId, isRanked = false) {
    const db = gameStore.db
    const status = isRanked ? 'ranked_accepted' : 'accepted'
    await db.from('battle_invites').update({ status }).eq('id', inviteId)
    
    // Fetch invite data to start battle
    const { data: invite } = await db.from('battle_invites').select('*').eq('id', inviteId).single()
    if (invite) {
      startBattle(invite, false, isRanked)
    }
    activeInvite.value = null
  }

  async function declineInvite(inviteId) {
    const db = gameStore.db
    await db.from('battle_invites').update({ status: 'declined' }).eq('id', inviteId)
    activeInvite.value = null
  }

  function commitPick(pick) {
    if (battleState.phase !== 'choosing') return
    battleState.myPick = pick
    battleState.phase = 'waiting'
    
    if (battleState.isHost) {
      if (battleState.enemyPick) resolveTurn()
    } else {
      battleState.ch.send({ type: 'broadcast', event: 'pvp_pick', payload: pick })
    }
  }

  function forfeit() {
    if (battleState.ch) {
      battleState.ch.send({ type: 'broadcast', event: 'pvp_forfeit', payload: {} })
    }
    endBattle(false, 'Te has rendido.')
  }

  function endBattle(won, reason) {
    battleState.active = false
    battleState.phase = 'over'
    if (battleState.ch) battleState.ch.unsubscribe()
    uiStore.notify(reason || (won ? '¡Has ganado la batalla!' : 'Has perdido la batalla.'), won ? '🏆' : '💀')
    
    // Cleanup activeBattle in gameStore to prevent reconnection
    gameStore.state.activeBattle = null
    gameStore.save(false)
  }

  function resolveTurn() {
    if (!battleState.isHost) return
    battleState.phase = 'resolving'
    
    // TODO: Implement actual calculation logic (ported from 14_pvp.js)
    // For now, placeholder result
    const result = {
      firstIsHost: true,
      first: { type: 'move', moveName: 'Impactrueno', damage: 20 },
      second: { type: 'move', moveName: 'Placaje', damage: 15 }
    }
    
    battleState.ch.send({ type: 'broadcast', event: 'pvp_turn_result', payload: result })
    applyTurnResult(result)
  }

  function applyTurnResult(result) {
    // Sequential animations/logs
    battleState.logs.push(`Turno resuelto: ${result.first.moveName} vs ${result.second.moveName}`)
    battleState.phase = 'choosing'
    battleState.myPick = null
    battleState.enemyPick = null
  }

  function startBattle(invite, isHost, isRanked) {
    battleState.active = true
    battleState.isHost = isHost
    battleState.isRanked = isRanked
    battleState.opponentId = isHost ? invite.opponent_id : invite.challenger_id
    battleState.phase = 'sync'
    battleState.logs = ['¡Comienza la batalla!']
    
    // Setup channel logic here (Supabase Realtime)
    setupBattleChannel(invite.id)
  }

  function setupBattleChannel(inviteId) {
    const db = gameStore.db
    const channelName = `pvp-${inviteId}`
    battleState.ch = db.channel(channelName)

    battleState.ch
      .on('broadcast', { event: 'pvp_team' }, handleOpponentTeam)
      .on('broadcast', { event: 'pvp_pick' }, handleOpponentPick)
      // ... more events
      .subscribe()
  }

  function handleOpponentTeam({ payload }) {
    battleState.enemyTeam = payload.team
    battleState.enemyHp = payload.team.map(p => p.hp)
    if (battleState.phase === 'sync') battleState.phase = 'choosing'
  }

  function handleOpponentPick({ payload }) {
    battleState.enemyPick = payload.pick
    // If I already picked, resolve turn if I am host
  }

  onUnmounted(() => {
    if (invitePoller) clearInterval(invitePoller)
    if (battleState.ch) battleState.ch.unsubscribe()
  })

  return {
    activeInvite,
    isSearching,
    battleState,
    initInvitePoller,
    sendInvite,
    acceptInvite,
    declineInvite,
    startBattle
  }
})
