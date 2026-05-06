import { defineStore } from 'pinia'
import { ref, reactive, onUnmounted } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { usePvPStore } from './pvp'
import { resolvePvPTurn, applyPvPTurnResult } from '@/logic/pvp/pvpEngine'

export const useLivePvPStore = defineStore('livePvP', () => {
  const authStore = useAuthStore() as any
  const gameStore = useGameStore() as any
  const uiStore = useUIStore() as any
  const _pvpStore = usePvPStore() as any

  const activeInvite = ref(null)
  const isSearching = ref(false)
  const battleState = reactive({
    active: false, ch: null, isHost: false, isRanked: false,
    opponentId: null, opponentName: 'Rival', opponentElo: 1000,
    phase: 'sync', myTeam: [], enemyTeam: [],
    myActiveIdx: 0, enemyActiveIdx: 0, myHp: [], enemyHp: [],
    myStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
    enemyStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
    myPick: null, enemyPick: null, logs: [], deadline: null,
  })

  let invitePoller = null; let matchmakingPoller = null

  function _pollMatchmaking() {
    if (!isSearching.value) return
    gameStore.db.from('ranked_queue').select('*').neq('user_id', authStore.user.id).order('looking_since', { ascending: true }).limit(1).then(async ({ data }) => {
      if (data?.length) {
        const match = data[0]
        const { data: invite, error } = await (gameStore.db as any).from('battle_invites').insert({ challenger_id: authStore.user.id, opponent_id: match.user_id, status: 'ranked_match' }).select().single()
        if (!error && invite) {
          await (gameStore.db as any).from('ranked_queue').delete().in('user_id', [authStore.user.id, match.user_id])
          isSearching.value = false; startBattle(invite, true, true)
        }
      }
    })
  }

  function initInvitePoller() {
    if (invitePoller) clearInterval(invitePoller)
    if (authStore.sessionMode === 'offline') return
    invitePoller = setInterval(async () => {
      if (!authStore.user) return
      const { data } = await (gameStore.db as any).from('battle_invites').select('*').eq('opponent_id', authStore.user.id).in('status', ['pending', 'ranked_match']).order('created_at', { ascending: false }).limit(1)
      if (data?.length) {
        const inv = data[0]
        if (Date.now() - new Date(inv.created_at).getTime() > 60000) return
        if (inv.status === 'ranked_match') { if (isSearching.value) acceptInvite(inv.id, true); else await (gameStore.db as any).from('battle_invites').update({ status: 'declined' }).eq('id', inv.id) }
        else activeInvite.value = inv
      }
    }, 4000)
  }

  async function startSearch() {
    isSearching.value = true
    await (gameStore.db as any).from('ranked_queue').upsert({ user_id: authStore.user.id, elo: gameStore.state.eloRating || 1000, looking_since: new Date().toISOString() })
    uiStore.notify('Buscando oponente...', '🔍')
    if (matchmakingPoller) clearInterval(matchmakingPoller)
    matchmakingPoller = setInterval(_pollMatchmaking, 3000)
  }

  async function cancelSearch() {
    isSearching.value = false; if (matchmakingPoller) clearInterval(matchmakingPoller)
    await (gameStore.db as any).from('ranked_queue').delete().eq('user_id', authStore.user.id)
  }

  async function sendInvite(opponentId, opponentName) {
    const { data, error } = await (gameStore.db as any).from('battle_invites').insert({ challenger_id: authStore.user.id, opponent_id: opponentId, status: 'pending' }).select().single()
    if (error) { uiStore.notify('Error al enviar invitación', '❌'); return }
    uiStore.notify(`Invitación enviada a ${opponentName}`, '✉️'); startBattle(data, true, false)
  }

  async function acceptInvite(inviteId, isRanked = false) {
    const status = isRanked ? 'ranked_accepted' : 'accepted'
    await (gameStore.db as any).from('battle_invites').update({ status }).eq('id', inviteId)
    const { data: invite } = await (gameStore.db as any).from('battle_invites').select('*').eq('id', inviteId).single()
    if (invite) startBattle(invite, false, isRanked)
    activeInvite.value = null
  }

  async function declineInvite(inviteId) { await (gameStore.db as any).from('battle_invites').update({ status: 'declined' }).eq('id', inviteId); activeInvite.value = null }

  function _commitPick(pick) { if (battleState.phase !== 'choosing') return; battleState.myPick = pick; battleState.phase = 'waiting'; if (battleState.isHost) { if (battleState.enemyPick) resolveTurn() } else { battleState.ch.send({ type: 'broadcast', event: 'pvp_pick', payload: pick }) } }

  function _forfeit() { if (battleState.ch) battleState.ch.send({ type: 'broadcast', event: 'pvp_forfeit', payload: {} }); endBattle(false, 'Te has rendido.') }

  async function endBattle(won, reason) {
    battleState.active = false; battleState.phase = 'over'; if (battleState.ch) battleState.ch.unsubscribe()
    let eloDelta = 0; if (battleState.isRanked) eloDelta = await _pvpStore.updateElo(won)
    uiStore.notify(`${reason || (won ? '¡Has ganado!' : 'Has perdido.')}${eloDelta !== 0 ? ` (${eloDelta > 0 ? '+' : ''}${eloDelta} ELO)` : ''}`, won ? '🏆' : '💀')
    if (gameStore.state) { gameStore.state.activeBattle = null; gameStore.save(false) }
  }

  function resolveTurn() { const res = resolvePvPTurn(battleState); if (res) applyTurnResult(res) }
  async function applyTurnResult(result) { await applyPvPTurnResult(battleState, result, endBattle) }

  function startBattle(invite, isHost, isRanked) {
    battleState.active = true; battleState.isHost = isHost; battleState.isRanked = isRanked; battleState.opponentId = isHost ? invite.opponent_id : invite.challenger_id
    battleState.myTeam = JSON.parse(JSON.stringify(gameStore.state.team)); battleState.myHp = battleState.myTeam.map(p => (p as any).hp); battleState.myActiveIdx = 0
    battleState.phase = 'sync'; battleState.logs = ['¡Comienza la batalla!']; battleState.myPick = null; battleState.enemyPick = null
    setupBattleChannel(invite.id)
    const broadcastTeam = () => { if (battleState.ch) battleState.ch.send({ type: 'broadcast', event: 'pvp_team', payload: { team: battleState.myTeam } }) }
    setTimeout(broadcastTeam, 500); setTimeout(broadcastTeam, 2000)
  }

  function setupBattleChannel(inviteId) {
    battleState.ch = gameStore.db.channel(`pvp-${inviteId}`)
    battleState.ch.on('broadcast', { event: 'pvp_team' }, handleOpponentTeam).on('broadcast', { event: 'pvp_pick' }, handleOpponentPick).on('broadcast', { event: 'pvp_turn_result' }, handleTurnResult).on('broadcast', { event: 'pvp_forfeit' }, handleOpponentForfeit)
      .subscribe((status) => { if (status === 'SUBSCRIBED') battleState.ch.send({ type: 'broadcast', event: 'pvp_team', payload: { team: battleState.myTeam } }) })
  }

  function handleOpponentTeam({ payload }) {
    if (battleState.enemyTeam.length > 0) return
    battleState.enemyTeam = payload.team; battleState.enemyHp = payload.team.map(p => (p as any).hp); battleState.enemyActiveIdx = 0
    if (battleState.phase === 'sync') { battleState.phase = 'choosing'; battleState.logs.push(`¡El rival está listo!`) }
  }

  function handleOpponentPick({ payload }) { battleState.enemyPick = payload; if (battleState.isHost && battleState.myPick) resolveTurn() }
  function handleTurnResult({ payload }) { if (!battleState.isHost) applyTurnResult(payload) }
  function handleOpponentForfeit() { endBattle(true, 'El oponente se ha rendido.') }

  function _checkPostTurn() {
    const myHp = battleState.myHp[battleState.myActiveIdx]
    const enHp = battleState.enemyHp[battleState.enemyActiveIdx]
    if (myHp <= 0) {
      if (!battleState.myHp.some(h => h > 0)) endBattle(false, '¡Has sido derrotado!')
      else battleState.phase = 'faint_switch'
    } else if (enHp <= 0) {
      if (!battleState.enemyHp.some(h => h > 0)) endBattle(true, '¡Has ganado la batalla!')
      else battleState.phase = 'waiting'
    } else {
      battleState.phase = 'choosing'
      battleState.myPick = null
      battleState.enemyPick = null
    }
  }

  onUnmounted(() => { if (invitePoller) clearInterval(invitePoller); if (matchmakingPoller) clearInterval(matchmakingPoller); if (battleState.ch) battleState.ch.unsubscribe() })

  return { activeInvite, isSearching, battleState, initInvitePoller, sendInvite, acceptInvite, declineInvite, startBattle, startSearch, cancelSearch, _commitPick, _forfeit, handleOpponentPick, _checkPostTurn }
})
