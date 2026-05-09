
import { defineStore } from 'pinia'
import { ref, reactive, onUnmounted } from 'vue'
import { useAuthStore } from './auth.ts'
import { useGameStore } from './game.ts'
import { useUIStore } from './ui.ts'
import { usePvPStore } from './pvp.ts'
import { resolvePvPTurn, applyPvPTurnResult, type PvPBattleState, type PvPTurnResult, type PvPAction } from '@/logic/pvp/pvpEngine'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Pokemon } from '@/types/pokemon'


export interface BattleInvite {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'ranked_match' | 'ranked_accepted';
  created_at: string;
}

export interface RankedQueueEntry {
  user_id: string;
  elo: number;
  looking_since: string;
}

export const useLivePvPStore = defineStore('livePvP', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const _pvpStore = usePvPStore()

  const activeInvite = ref<BattleInvite | null>(null)
  const isSearching = ref(false)

  interface LiveBattleState extends PvPBattleState {
    active: boolean;
    opponentId: string | null;
    opponentName: string;
    opponentElo: number;
    deadline: number | null;
    ch: RealtimeChannel | null;
  }

  const battleState = reactive<LiveBattleState>({
    active: false, 
    ch: null,
    isHost: false, isRanked: false,
    opponentId: null, opponentName: 'Rival', opponentElo: 1000,
    phase: 'sync', myTeam: [], enemyTeam: [],
    myActiveIdx: 0, enemyActiveIdx: 0, myHp: [], enemyHp: [],
    myStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 },
    enemyStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 },
    myPick: null, enemyPick: null, logs: [], deadline: null,
  })

  let invitePoller: ReturnType<typeof setInterval> | null = null
  let matchmakingPoller: ReturnType<typeof setInterval> | null = null

  function _pollMatchmaking() {
    if (!isSearching.value || !gameStore.db || !authStore.user) return
    gameStore.db.from('ranked_queue').select('*').neq('user_id', authStore.user.id).order('looking_since', { ascending: true }).limit(1).then(async (res) => {
      const { data } = res as unknown as { data: RankedQueueEntry[] | null, error: { message: string } | null }
      if (data && data.length > 0 && authStore.user && gameStore.db) {
        const match = data[0]
        if (!match) return
        const { data: invite, error } = await gameStore.db.from('battle_invites').insert({ challenger_id: authStore.user.id, opponent_id: match.user_id, status: 'ranked_match' }).select().single() as unknown as { data: BattleInvite | null, error: { message: string } | null }
        if (!error && invite) {
          await gameStore.db.from('ranked_queue').delete().in('user_id', [authStore.user.id, match.user_id])
          isSearching.value = false; startBattle(invite, true, true)
        }
      }
    })
  }

  function initInvitePoller() {
    if (invitePoller) clearInterval(invitePoller)
    if (authStore.sessionMode === 'offline') return
    invitePoller = setInterval(async () => {
      if (!authStore.user || !gameStore.db) return
      const { data } = await gameStore.db.from('battle_invites').select('*').eq('opponent_id', authStore.user.id).in('status', ['pending', 'ranked_match']).order('created_at', { ascending: false }).limit(1) as { data: BattleInvite[] | null }
      if (data && data.length > 0 && gameStore.db) {
        const inv = data[0]
        if (!inv) return
        if (Temporal.Now.instant().epochMilliseconds - Temporal.Instant.from(inv.created_at).epochMilliseconds > 60000) return
        if (inv.status === 'ranked_match') { if (isSearching.value) acceptInvite(inv.id, true); else await gameStore.db.from('battle_invites').update({ status: 'declined' }).eq('id', inv.id) }
        else activeInvite.value = inv
      }
    }, 4000)
  }

  async function startSearch() {
    if (!authStore.user || !gameStore.db) return
    isSearching.value = true
    await gameStore.db.from('ranked_queue').upsert({ user_id: authStore.user.id, elo: gameStore.state.eloRating || 1000, looking_since: Temporal.Now.instant().toString() })
    uiStore.notify('Buscando oponente...', '🔍')
    if (matchmakingPoller) clearInterval(matchmakingPoller)
    matchmakingPoller = setInterval(_pollMatchmaking, 3000)
  }

  async function cancelSearch() {
    if (!authStore.user || !gameStore.db) return
    isSearching.value = false; if (matchmakingPoller) clearInterval(matchmakingPoller)
    await gameStore.db.from('ranked_queue').delete().eq('user_id', authStore.user.id)
  }

  async function sendInvite(opponentId: string, opponentName: string) {
    if (!authStore.user || !gameStore.db) return
    const { data, error } = await gameStore.db.from('battle_invites').insert({ challenger_id: authStore.user.id, opponent_id: opponentId, status: 'pending' }).select().single() as unknown as { data: BattleInvite | null, error: { message: string } | null }
    if (error || !data) { uiStore.notify('Error al enviar invitación', '❌'); return }
    uiStore.notify(`Invitación enviada a ${opponentName}`, '✉️'); startBattle(data, true, false)
  }

  async function acceptInvite(inviteId: string, isRanked = false) {
    if (!gameStore.db) return
    const status = isRanked ? 'ranked_accepted' : 'accepted'
    await gameStore.db.from('battle_invites').update({ status }).eq('id', inviteId)
    const { data: invite } = await gameStore.db.from('battle_invites').select('*').eq('id', inviteId).single() as { data: BattleInvite | null }
    if (invite) startBattle(invite, false, isRanked)
    activeInvite.value = null
  }

  async function declineInvite(inviteId: string) { 
    if (!gameStore.db) return
    await gameStore.db.from('battle_invites').update({ status: 'declined' }).eq('id', inviteId); 
    activeInvite.value = null 
  }

  function _commitPick(pick: PvPAction) { if (battleState.phase !== 'choosing') return; battleState.myPick = pick; battleState.phase = 'waiting'; if (battleState.isHost) { if (battleState.enemyPick) resolveTurn() } else { if (battleState.ch) battleState.ch.send({ type: 'broadcast', event: 'pvp_pick', payload: pick }) } }

  function _forfeit() { if (battleState.ch) battleState.ch.send({ type: 'broadcast', event: 'pvp_forfeit', payload: {} }); endBattle(false, 'Te has rendido.') }

  async function endBattle(won: boolean, reason: string) {
    battleState.active = false; battleState.phase = 'over'; if (battleState.ch) battleState.ch.unsubscribe()
    let eloDelta = 0; if (battleState.isRanked) eloDelta = await _pvpStore.updateElo(won)
    uiStore.notify(`${reason || (won ? '¡Has ganado!' : 'Has perdido.')}${eloDelta !== 0 ? ` (${eloDelta > 0 ? '+' : ''}${eloDelta} ELO)` : ''}`, won ? '🏆' : '💀')
    if (gameStore.state) { gameStore.state.activeBattle = null; gameStore.save(false) }
  }

  function resolveTurn() { const res = resolvePvPTurn(battleState); if (res) applyTurnResult(res) }
  async function applyTurnResult(result: PvPTurnResult) { await applyPvPTurnResult(battleState, result, endBattle) }

  function startBattle(invite: BattleInvite, isHost: boolean, isRanked: boolean) {
    battleState.active = true; battleState.isHost = isHost; battleState.isRanked = isRanked; battleState.opponentId = isHost ? invite.opponent_id : invite.challenger_id
    battleState.myTeam = JSON.parse(JSON.stringify(gameStore.state.team)); 
    battleState.myHp = battleState.myTeam.map((p: Pokemon) => p.hp); 
    battleState.myActiveIdx = 0
    battleState.phase = 'sync'; battleState.logs = ['¡Comienza la batalla!']; battleState.myPick = null; battleState.enemyPick = null
    setupBattleChannel(invite.id)
    const broadcastTeam = () => { if (battleState.ch) battleState.ch.send({ type: 'broadcast', event: 'pvp_team', payload: { team: battleState.myTeam } }) }
    setTimeout(broadcastTeam, 500); setTimeout(broadcastTeam, 2000)
  }

  function setupBattleChannel(inviteId: string) {
    if (!gameStore.db) return
    const ch = gameStore.db.channel(`pvp-${inviteId}`)
    battleState.ch = ch
    ch.on('broadcast' as const, { event: 'pvp_team' }, handleOpponentTeam)
      .on('broadcast' as const, { event: 'pvp_pick' }, handleOpponentPick)
      .on('broadcast' as const, { event: 'pvp_turn_result' }, handleTurnResult)
      .on('broadcast' as const, { event: 'pvp_forfeit' }, handleOpponentForfeit)
      .subscribe((status: string) => { if (status === 'SUBSCRIBED') ch.send({ type: 'broadcast', event: 'pvp_team', payload: { team: battleState.myTeam } }) })
  }

  function handleOpponentTeam({ payload }: { payload: { team: Pokemon[] } }) {
    if (battleState.enemyTeam.length > 0) return
    battleState.enemyTeam = payload.team; 
    battleState.enemyHp = payload.team.map((p: Pokemon) => p.hp); 
    battleState.enemyActiveIdx = 0
    if (battleState.phase === 'sync') { battleState.phase = 'choosing'; battleState.logs.push(`¡El rival está listo!`) }
  }

  function handleOpponentPick({ payload }: { payload: PvPAction }) { battleState.enemyPick = payload; if (battleState.isHost && battleState.myPick) resolveTurn() }
  function handleTurnResult({ payload }: { payload: PvPTurnResult }) { if (!battleState.isHost) applyTurnResult(payload) }
  function handleOpponentForfeit() { endBattle(true, 'El oponente se ha rendido.') }

  function _checkPostTurn() {
    const myHp = battleState.myHp[battleState.myActiveIdx] || 0
    const enHp = battleState.enemyHp[battleState.enemyActiveIdx] || 0
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
