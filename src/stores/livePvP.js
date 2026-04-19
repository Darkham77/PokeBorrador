import { defineStore } from 'pinia'
import { ref, reactive, onUnmounted } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { usePvPStore } from './pvp'
import { calculateDamage } from '@/logic/battle/battleEngine'
import { getStatMultiplier, getAccuracyMultiplier } from '@/logic/pokemon/statEngine'
import { applyMoveEffect } from '@/logic/battle/battleMoves'
import { MOVE_DATA } from '@/data/moves'
import { phaserBridge } from '@/logic/phaserBridge'

export const useLivePvPStore = defineStore('livePvP', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const _pvpStore = usePvPStore()

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
  let matchmakingPoller = null

  function _pollMatchmaking() {
    if (!isSearching.value) return
    const db = gameStore.db
    
    // Matchmaking Logic (Authoritative candidate: oldest in queue)
    db.from('ranked_queue')
      .select('*')
      .neq('user_id', authStore.user.id)
      .order('looking_since', { ascending: true })
      .limit(1)
      .then(async ({ data }) => {
        if (data?.length) {
          const match = data[0]
          
          // Try to create the match invite (atomic-ish)
          const { data: invite, error } = await db.from('battle_invites').insert({
            challenger_id: authStore.user.id,
            opponent_id: match.user_id,
            status: 'ranked_match'
          }).select().single()

          if (!error && invite) {
            await db.from('ranked_queue').delete().in('user_id', [authStore.user.id, match.user_id])
            isSearching.value = false
            startBattle(invite, true, true)
          }
        }
      })
  }

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

  async function startSearch() {
    if (authStore.sessionMode === 'offline') return
    isSearching.value = true
    const db = gameStore.db
    
    // 1. Join Queue
    await db.from('ranked_queue').upsert({
      user_id: authStore.user.id,
      elo: gameStore.state.eloRating || 1000,
      looking_since: new Date().toISOString()
    })

    uiStore.notify('Buscando oponente...', '🔍')
    if (matchmakingPoller) clearInterval(matchmakingPoller)
    matchmakingPoller = setInterval(_pollMatchmaking, 3000)
  }

  async function cancelSearch() {
    isSearching.value = false
    if (matchmakingPoller) clearInterval(matchmakingPoller)
    const db = gameStore.db
    await db.from('ranked_queue').delete().eq('user_id', authStore.user.id)
    uiStore.notify('Búsqueda cancelada.', '🛑')
  }

  async function sendInvite(opponentId, opponentName) {
    if (authStore.sessionMode === 'offline') return
    const db = gameStore.db
    const { data, error } = await db.from('battle_invites').insert({
      challenger_id: authStore.user.id,
      opponent_id: opponentId,
      status: 'pending'
    }).select().single()

    if (error) {
      uiStore.notify('Error al enviar invitación', '❌')
      return
    }
    
    uiStore.notify(`Invitación enviada a ${opponentName}`, '✉️')
    startBattle(data, true, false)
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

  function _commitPick(pick) {
    if (battleState.phase !== 'choosing') return
    battleState.myPick = pick
    battleState.phase = 'waiting'
    
    if (battleState.isHost) {
      if (battleState.enemyPick) resolveTurn()
    } else {
      battleState.ch.send({ type: 'broadcast', event: 'pvp_pick', payload: pick })
    }
  }

  function _forfeit() {
    if (battleState.ch) {
      battleState.ch.send({ type: 'broadcast', event: 'pvp_forfeit', payload: {} })
    }
    endBattle(false, 'Te has rendido.')
  }

  async function endBattle(won, reason) {
    battleState.active = false
    battleState.phase = 'over'
    if (battleState.ch) battleState.ch.unsubscribe()
    
    // Ranked rewards
    let eloDelta = 0
    if (battleState.isRanked) {
      eloDelta = await _pvpStore.updateElo(won)
    }

    const finalReason = eloDelta !== 0 
      ? `${reason} (${eloDelta > 0 ? '+' : ''}${eloDelta} ELO)`
      : reason

    uiStore.notify(finalReason || (won ? '¡Has ganado la batalla!' : 'Has perdido la batalla.'), won ? '🏆' : '💀')
    
    // Cleanup activeBattle in gameStore to prevent reconnection
    if (gameStore.state) {
      gameStore.state.activeBattle = null
      gameStore.save(false)
    }
  }

  function resolveTurn() {
    if (!battleState.isHost || battleState.phase === 'resolving') return
    battleState.phase = 'resolving'
    
    const hostPoke = battleState.myTeam[battleState.myActiveIdx]
    const clientPoke = battleState.enemyTeam[battleState.enemyActiveIdx]
    
    const hostPick = battleState.myPick
    const clientPick = battleState.enemyPick

    // 1. Determine priority and order
    let firstIsHost = true
    if (hostPick.type === 'switch' && clientPick.type !== 'switch') {
      firstIsHost = true
    } else if (clientPick.type === 'switch' && hostPick.type !== 'switch') {
      firstIsHost = false
    } else if (hostPick.type === 'move' && clientPick.type === 'move') {
      const hMove = hostPoke.moves[hostPick.moveIndex]
      const cMove = clientPoke.moves[clientPick.moveIndex]
      const hPrio = MOVE_DATA[hMove?.name]?.priority || 0
      const cPrio = MOVE_DATA[cMove?.name]?.priority || 0

      if (hPrio !== cPrio) {
        firstIsHost = hPrio > cPrio
      } else {
        const hSpe = Math.floor(hostPoke.spe * getStatMultiplier(battleState.myStages.spe))
        const cSpe = Math.floor(clientPoke.spe * getStatMultiplier(battleState.enemyStages.spe))
        firstIsHost = hSpe > cSpe || (hSpe === cSpe && Math.random() < 0.5)
      }
    }

    // 2. Helper to calculate a single action
    const calcAction = (actorIsHost) => {
      const effectLog = []
      const attacker = actorIsHost ? hostPoke : clientPoke
      const defender = actorIsHost ? clientPoke : hostPoke
      const atkS = actorIsHost ? battleState.myStages : battleState.enemyStages
      const defS = actorIsHost ? battleState.enemyStages : battleState.myStages
      const pick = actorIsHost ? hostPick : clientPick

      if (pick.type === 'switch') {
        const newIdx = pick.switchIndex
        return { type: 'switch', newIdx, actorIsHost, effectLog }
      }

      const move = attacker.moves[pick.moveIndex]
      const moveName = move?.name || '???'
      const md = MOVE_DATA[moveName] || { power: 40, type: 'normal', cat: 'physical', acc: 100 }

      // Status checks (Sleep, Paralyze, etc.)
      if (attacker.status === 'sleep') {
        if (attacker.sleepTurns > 0) {
          attacker.sleepTurns--
          return { type: 'move', moveName, actorIsHost, statusBlocked: 'sleep', effectLog }
        }
        attacker.status = null
        effectLog.push(`¡${attacker.name} se despertó!`)
      }

      if (attacker.status === 'paralyze' && Math.random() < 0.25) {
        return { type: 'move', moveName, actorIsHost, statusBlocked: 'paralyze', effectLog }
      }

      // Accuracy
      if (md.acc && Math.random() * 100 > md.acc * getAccuracyMultiplier(atkS.acc || 0)) {
        return { type: 'move', moveName, actorIsHost, missed: true, effectLog }
      }

      // Damage or Status Move
      if (md.cat === 'status') {
        applyMoveEffect(md.effect, attacker, defender, atkS, defS, (m) => effectLog.push(m))
        return { type: 'move', moveName, actorIsHost, isStatus: true, effectLog }
      }

      const { dmg, eff } = calculateDamage(attacker, defender, md, { atkStages: atkS[md.cat === 'physical' ? 'atk' : 'spa'], defStages: defS[md.cat === 'physical' ? 'def' : 'spd'] })
      
      const targetHpArr = actorIsHost ? battleState.enemyHp : battleState.myHp
      const targetIdx = actorIsHost ? battleState.enemyActiveIdx : battleState.myActiveIdx
      const newHp = Math.max(0, targetHpArr[targetIdx] - dmg)
      
      // Secondary effects for damage moves
      if (md.effect && md.effect !== 'none' && dmg > 0) {
        applyMoveEffect(md.effect, attacker, defender, atkS, defS, (m) => effectLog.push(m))
      }

      return { 
        type: 'move', 
        moveName, 
        actorIsHost, 
        damage: dmg, 
        eff, 
        newHp,
        effectLog 
      }
    }

    // 3. Execute actions
    const firstAction = calcAction(firstIsHost)
    
    // Apply first action HP to let second action see it
    if (firstAction.newHp !== undefined) {
      if (firstIsHost) battleState.enemyHp[battleState.enemyActiveIdx] = firstAction.newHp
      else battleState.myHp[battleState.myActiveIdx] = firstAction.newHp
    }

    let secondAction = null
    const defenderHp = firstIsHost ? battleState.enemyHp[battleState.enemyActiveIdx] : battleState.myHp[battleState.myActiveIdx]
    
    if (defenderHp > 0 && firstAction.type !== 'switch') {
      secondAction = calcAction(!firstIsHost)
    }

    const result = {
      firstIsHost,
      first: firstAction,
      second: secondAction,
      hostActiveIdx: battleState.myActiveIdx,
      clientActiveIdx: battleState.enemyActiveIdx,
      hostHp: battleState.myHp,
      clientHp: battleState.enemyHp,
      hostStages: battleState.myStages,
      clientStages: battleState.enemyStages
    }
    
    battleState.ch.send({ type: 'broadcast', event: 'pvp_turn_result', payload: result })
    applyTurnResult(result)
  }

  async function applyTurnResult(result) {
    battleState.phase = 'animating'
    
    const isHost = battleState.isHost
    const actions = [result.first, result.second].filter(Boolean)

    for (const action of actions) {
      if (battleState.phase === 'over') break

      const isMyAction = isHost ? action.actorIsHost : !action.actorIsHost
      
      // Log and Animate
      if (action.type === 'switch') {
        const team = isMyAction ? battleState.myTeam : battleState.enemyTeam
        const pName = team[action.newIdx].name
        battleState.logs.push(`¡${isMyAction ? 'Vas a cambiar a' : 'El rival cambió a'} ${pName}!`)
        
        phaserBridge.sendCommand('BattleScene', 'PLAY_WITHDRAW', { side: isMyAction ? 'player' : 'enemy' })
        await new Promise(r => setTimeout(r, 600))

        if (isMyAction) battleState.myActiveIdx = action.newIdx
        else battleState.enemyActiveIdx = action.newIdx

        phaserBridge.sendCommand('BattleScene', 'PLAY_SEND_OUT', { 
          side: isMyAction ? 'player' : 'enemy', 
          pokemon: team[action.newIdx] 
        })
      } else {
        battleState.logs.push(`¡${isMyAction ? 'Tu' : 'El'} ${action.actorName || 'Pokémon'} usó ${action.moveName}!`)
        
        const moveData = MOVE_DATA[action.moveName] || { type: 'normal' }
        phaserBridge.sendCommand('BattleScene', 'PLAY_MOVE', { side: isMyAction ? 'player' : 'enemy', type: moveData.type })

        if (action.statusBlocked) {
          battleState.logs.push(`¡No pudo moverse por ${action.statusBlocked}!`)
        } else if (action.missed) {
          battleState.logs.push('¡Falló!')
        } else if (action.damage > 0) {
          const effTxt = action.eff >= 2 ? ' ¡Muy eficaz!' : action.eff <= 0.5 ? ' No muy eficaz...' : ''
          battleState.logs.push(`(-${action.damage} HP)${effTxt}`)
          
          phaserBridge.sendCommand('BattleScene', 'PLAY_DAMAGE', { side: isMyAction ? 'enemy' : 'player' })

          if (isMyAction) {
            battleState.enemyHp[battleState.enemyActiveIdx] = action.newHp
          } else {
            battleState.myHp[battleState.myActiveIdx] = action.newHp
          }
        }
        
        action.effectLog?.forEach(m => battleState.logs.push(m))
      }

      await new Promise(r => setTimeout(r, 1200))
    }

    // End of turn checks
    _checkPostTurn()
  }

  function _checkPostTurn() {
    const myHp = battleState.myHp[battleState.myActiveIdx]
    const enHp = battleState.enemyHp[battleState.enemyActiveIdx]

    if (myHp <= 0) {
      const hasAlive = battleState.myHp.some(h => h > 0)
      if (!hasAlive) {
        endBattle(false, '¡Has sido derrotado!')
        return
      }
      battleState.phase = 'faint_switch'
    } else if (enHp <= 0) {
      const hasAlive = battleState.enemyHp.some(h => h > 0)
      if (!hasAlive) {
        endBattle(true, '¡Has ganado la batalla!')
        return
      }
      battleState.phase = 'waiting' // Esperando que el rival cambie
    } else {
      battleState.phase = 'choosing'
      battleState.myPick = null
      battleState.enemyPick = null
    }
  }

  function startBattle(invite, isHost, isRanked) {
    battleState.active = true
    battleState.isHost = isHost
    battleState.isRanked = isRanked
    battleState.opponentId = isHost ? invite.opponent_id : invite.challenger_id
    
    // Initialize My Team
    battleState.myTeam = JSON.parse(JSON.stringify(gameStore.state.team))
    battleState.myHp = battleState.myTeam.map(p => p.hp)
    battleState.myActiveIdx = 0
    battleState.myStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 }
    
    battleState.phase = 'sync'
    battleState.logs = ['¡Comienza la batalla!']
    battleState.myPick = null
    battleState.enemyPick = null
    
    setupBattleChannel(invite.id)

    // Sync team broadcast
    const broadcastTeam = () => {
      if (battleState.ch) {
        battleState.ch.send({ 
          type: 'broadcast', 
          event: 'pvp_team', 
          payload: { team: battleState.myTeam } 
        })
      }
    }
    
    // Multiple attempts to ensure sync in Realtime
    setTimeout(broadcastTeam, 500)
    setTimeout(broadcastTeam, 2000)
  }

  function setupBattleChannel(inviteId) {
    const db = gameStore.db
    const channelName = `pvp-${inviteId}`
    battleState.ch = db.channel(channelName)

    battleState.ch
      .on('broadcast', { event: 'pvp_team' }, handleOpponentTeam)
      .on('broadcast', { event: 'pvp_pick' }, handleOpponentPick)
      .on('broadcast', { event: 'pvp_turn_result' }, handleTurnResult)
      .on('broadcast', { event: 'pvp_forfeit' }, handleOpponentForfeit)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          battleState.ch.send({ 
            type: 'broadcast', 
            event: 'pvp_team', 
            payload: { team: battleState.myTeam } 
          })
        }
      })
  }

  function handleOpponentTeam({ payload }) {
    if (battleState.enemyTeam.length > 0) return // Already synced
    battleState.enemyTeam = payload.team
    battleState.enemyHp = payload.team.map(p => p.hp)
    battleState.enemyActiveIdx = 0
    battleState.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 }
    
    if (battleState.phase === 'sync') {
      battleState.phase = 'choosing'
      battleState.logs.push(`¡El rival ${battleState.opponentName} está listo!`)
    }
  }

  function handleOpponentPick({ payload }) {
    battleState.enemyPick = payload
    if (battleState.isHost && battleState.myPick) {
      resolveTurn()
    }
  }

  function handleTurnResult({ payload }) {
    if (!battleState.isHost) {
      applyTurnResult(payload)
    }
  }

  function handleOpponentForfeit() {
    endBattle(true, 'El oponente se ha rendido.')
  }

  onUnmounted(() => {
    if (invitePoller) clearInterval(invitePoller)
    if (matchmakingPoller) clearInterval(matchmakingPoller)
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
    startBattle,
    startSearch,
    cancelSearch,
    _commitPick,
    _forfeit,
    handleOpponentPick,
    _checkPostTurn
  }
})
