import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useSocialStore } from './social'
import { useAudioStore } from './audio'
import { useLoadingStore } from './loading'
import { logger } from '@/logic/utils/logger'

export const useTradeStore = defineStore('trade', () => {
  const authStore = useAuthStore() as any
  const gameStore = useGameStore() as any
  const uiStore = useUIStore() as any
  const socialStore = useSocialStore() as any
  const audioStore = useAudioStore() as any
  const loadingStore = useLoadingStore() as any

  const tradeTarget = ref<{ id: string; username: string } | null>(null)
  const tradeFriendSave = ref<any>(null)
  
  const tradeOfferPoke = ref<any>(null)
  const tradeRequestPoke = ref<any>(null)
  const tradeOfferItems = reactive<Record<string, number>>({})
  const tradeRequestItems = reactive<Record<string, number>>({})
  
  const pendingIncoming = ref<any[]>([])
  const pendingOutgoing = ref<any[]>([])
  const pendingAccepted = ref<any[]>([])

  let tradeChannel: any = null

  async function subscribeTradeNotifs() {
    if (!authStore.user || authStore.sessionMode === 'offline') return
    if (tradeChannel) tradeChannel.unsubscribe()

    const db = gameStore.db
    tradeChannel = db.channel('trade-notifs-' + authStore.user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'claim_queue',
        filter: `user_id=eq.${authStore.user.id}`
      }, () => {
        uiStore.notify(' ¡Nuevos activos disponibles para reclamar!', '🎁')
        gameStore.fetchClaimQueue()
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'trade_offers',
        filter: `receiver_id=eq.${authStore.user.id}`
      }, () => {
        uiStore.notify('¡Has recibido una nueva oferta de intercambio!', '🔄')
        audioStore.notif()
        refreshPendingTrades()
      })
      .subscribe()
  }

  async function refreshPendingTrades() {
    if (!authStore.user || authStore.sessionMode === 'offline') return

    const db = gameStore.db
    const [incomingRes, outgoingRes, acceptedRes] = await Promise.all([
      db.from('trade_offers').select('*').eq('receiver_id', authStore.user.id).eq('status', 'pending'),
      db.from('trade_offers').select('*').eq('sender_id', authStore.user.id).eq('status', 'pending'),
      db.from('trade_offers').select('*').eq('sender_id', authStore.user.id).eq('status', 'accepted')
    ])

    pendingIncoming.value = incomingRes.data || []
    pendingOutgoing.value = outgoingRes.data || []
    pendingAccepted.value = acceptedRes.data || []
    
    // Sincronizar contador en socialStore
    await socialStore.refreshNotificationCount()
  }

  async function openTradeModal(friendId: string, friendUsername: string) {
    tradeTarget.value = { id: friendId, username: friendUsername }
    tradeOfferPoke.value = null
    tradeRequestPoke.value = null
    Object.keys(tradeOfferItems).forEach(k => delete tradeOfferItems[k])
    Object.keys(tradeRequestItems).forEach(k => delete tradeRequestItems[k])

    const db = gameStore.db
    const { data, error } = await (db as any).from('game_saves').select('save_data').eq('user_id', friendId).single()
    
    if (error || !data) {
      tradeFriendSave.value = { team: [], inventory: {}, money: 0 }
      uiStore.notify('No se pudo cargar el inventario del amigo.', '⚠️')
    } else {
      tradeFriendSave.value = data.save_data
    }
  }

  async function sendTradeOffer({ isGift, offerMoney, requestMoney, message }: { isGift: boolean; offerMoney: number; requestMoney: number; message: string }) {
    if (!tradeTarget.value) return false
    if (authStore.sessionMode === 'offline') return false

    const hasOffer = tradeOfferPoke.value !== null || Object.keys(tradeOfferItems).length > 0 || offerMoney > 0
    if (!hasOffer) {
      uiStore.notify('Tenés que ofrecer algo.', '⚠️')
      return false
    }

    if (offerMoney > gameStore.state.money) {
      uiStore.notify('No tenés suficiente dinero.', '💸')
      return false
    }

    // Anti-Duplicate check
    if (tradeOfferPoke.value && lockedUids.value.has(tradeOfferPoke.value.uid)) {
      uiStore.notify('Este Pokémon ya está en otra oferta pendiente.', '⚠️')
      return false
    }

    // MANDATORY: Pre-Action Flush (Always save before social actions with assets)
    uiStore.notify('Sincronizando inventario...', '🔄')
    await gameStore.save(false)

    const { data: tradeId, error } = await (gameStore.db as any).rpc('send_trade_offer_v2', {
      p_receiver_id: tradeTarget.value.id,
      p_offer_pokemon: tradeOfferPoke.value,
      p_offer_items: { ...tradeOfferItems },
      p_offer_money: offerMoney,
      p_request_pokemon: isGift ? null : tradeRequestPoke.value,
      p_request_items: isGift ? {} : { ...tradeRequestItems },
      p_request_money: isGift ? 0 : requestMoney,
      p_message: message || ''
    })

    if (!error && tradeId) {
      uiStore.notify(`¡Oferta enviada a ${tradeTarget.value.username}!`, '🔄')
      audioStore.sentMsg() 
      refreshPendingTrades()
      return true
    }
    
    uiStore.notify('Error al enviar: ' + (error?.message || 'Error desconocido'), '❌')
    return false
  }

  async function acceptTrade(tradeId: string | number) {
    if (authStore.sessionMode === 'offline') return false
    
    try {
      loadingStore.start('accept_trade', 'Procesando intercambio...', 'Sincronizando con el servidor')
      
      // MANDATORY: Pre-Action Flush
      uiStore.notify('Sincronizando inventario...', '🔄')
      await gameStore.save(false)

      const db = gameStore.db
      const { error: rpcErr } = await (db as any).rpc('accept_trade_v2', {
        p_trade_id: tradeId
      })
    
      if (rpcErr) throw new Error((rpcErr as any).message)

      uiStore.notify('¡Intercambio aceptado! Los activos están en tu cola de reclamo.', '🎉')
      await gameStore.fetchClaimQueue()
      
      loadingStore.finish('accept_trade')
      await refreshPendingTrades()
      return true
    } catch (err) {
      loadingStore.finish('accept_trade')
      logger.error('TRADE', `Error en el intercambio: ${(err as Error).message}`)
      uiStore.notify('Error en el intercambio: ' + (err as any).message, '❌')
      return false
    }
  }

  async function rejectTrade(tradeId: string | number) {
    await (gameStore.db as any).from('trade_offers').update({ status: 'rejected' }).eq('id', tradeId)
    uiStore.notify('Oferta rechazada.', '👋')
    await refreshPendingTrades()
  }

  async function claimTrade(tradeId: string | number) {
    const { error } = await (gameStore.db as any).from('trade_offers').update({ status: 'claimed' }).eq('id', tradeId)
    if (!error) await refreshPendingTrades()
  }

  const lockedUids = computed(() => {
    const locked = new Set<string>()
    pendingIncoming.value.forEach(t => {
      if (t.request_pokemon?.uid) locked.add(t.request_pokemon.uid)
    })
    pendingOutgoing.value.forEach(t => {
      if (t.offer_pokemon?.uid) locked.add(t.offer_pokemon.uid)
    })
    return locked
  })

  return {
    tradeTarget,
    tradeFriendSave,
    tradeOfferPoke,
    tradeRequestPoke,
    tradeOfferItems,
    tradeRequestItems,
    pendingIncoming,
    pendingOutgoing,
    pendingAccepted,
    lockedUids,
    subscribeTradeNotifs,
    refreshPendingTrades,
    openTradeModal,
    sendTradeOffer,
    acceptTrade,
    rejectTrade,
    claimTrade
  }
})
