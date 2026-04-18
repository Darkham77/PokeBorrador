import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useSocialStore } from './social'
import { useAudioStore } from './audio'

export const useTradeStore = defineStore('trade', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const socialStore = useSocialStore()
  const audioStore = useAudioStore()

  const tradeTarget = ref(null)
  const tradeFriendSave = ref(null)
  
  const tradeOfferPoke = ref(null)
  const tradeRequestPoke = ref(null)
  const tradeOfferItems = reactive({})
  const tradeRequestItems = reactive({})
  
  const pendingIncoming = ref([])
  const pendingOutgoing = ref([])
  const pendingAccepted = ref([])

  let tradeChannel = null

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

  async function openTradeModal(friendId, friendUsername) {
    tradeTarget.value = { id: friendId, username: friendUsername }
    tradeOfferPoke.value = null
    tradeRequestPoke.value = null
    Object.keys(tradeOfferItems).forEach(k => delete tradeOfferItems[k])
    Object.keys(tradeRequestItems).forEach(k => delete tradeRequestItems[k])

    const db = gameStore.db
    const { data, error } = await db.from('game_saves').select('save_data').eq('user_id', friendId).single()
    
    if (error || !data) {
      tradeFriendSave.value = { team: [], inventory: {}, money: 0 }
      uiStore.notify('No se pudo cargar el inventario del amigo.', '⚠️')
    } else {
      tradeFriendSave.value = data.save_data
    }
  }

  async function sendTradeOffer({ isGift, offerMoney, requestMoney, message }) {
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

    const { data: tradeId, error } = await gameStore.db.rpc('send_trade_offer_v2', {
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

  async function acceptTrade(tradeId) {
    if (authStore.sessionMode === 'offline') return false
    
    try {
      gameStore.state.overlayMessage = 'Procesando intercambio...'
      gameStore.state.isOverlayLoading = true
      
      // MANDATORY: Pre-Action Flush
      uiStore.notify('Sincronizando inventario...', '🔄')
      await gameStore.save(false)

      const db = gameStore.db
      const { error: rpcErr } = await db.rpc('accept_trade_v2', {
        p_trade_id: tradeId
      })
    
      if (rpcErr) throw new Error(rpcErr.message)

      uiStore.notify('¡Intercambio aceptado! Los activos están en tu cola de reclamo.', '🎉')
      await gameStore.fetchClaimQueue()
      
      gameStore.state.isOverlayLoading = false
      await refreshPendingTrades()
      return true
    } catch (err) {
      gameStore.state.isOverlayLoading = false
      console.error('[TRADE ERROR]', err)
      uiStore.notify('Error en el intercambio: ' + err.message, '❌')
      return false
    }
  }

  async function rejectTrade(tradeId) {
    await gameStore.db.from('trade_offers').update({ status: 'rejected' }).eq('id', tradeId)
    uiStore.notify('Oferta rechazada.', '👋')
    await refreshPendingTrades()
  }

  async function claimTrade(tradeId) {
    const { error } = await gameStore.db.from('trade_offers').update({ status: 'claimed' }).eq('id', tradeId)
    if (!error) await refreshPendingTrades()
  }

  const lockedUids = computed(() => {
    const locked = new Set()
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
