import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useSocialStore } from './social'

export const useTradeStore = defineStore('trade', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const socialStore = useSocialStore()

  const tradeTarget = ref(null)
  const tradeFriendSave = ref(null)
  
  const tradeOfferPoke = ref(null)
  const tradeRequestPoke = ref(null)
  const tradeOfferItems = reactive({})
  const tradeRequestItems = reactive({})
  
  const pendingIncoming = ref([])
  const pendingAccepted = ref([])

  let tradeChannel = null

  async function subscribeTradeNotifs() {
    if (!authStore.user || authStore.sessionMode === 'offline') return
    if (tradeChannel) tradeChannel.unsubscribe()

    const db = gameStore.db
    tradeChannel = db.router.client.channel('trade-notifs-' + authStore.user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'trade_offers',
        filter: `receiver_id=eq.${authStore.user.id}`
      }, () => {
        uiStore.notify(' ¡Recibiste una oferta de intercambio!', '🔄')
        window.SFX?.tradeInvite() // Sonido de oferta recibida
        refreshPendingTrades()
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'trade_offers',
        filter: `sender_id=eq.${authStore.user.id}`
      }, async ({ new: row }) => {
        if (row?.status === 'accepted') {
          // Sync state automatically using DBRouter
          const { data: save } = await db.from('game_saves').select('save_data').eq('user_id', authStore.user.id).single()
          if (save?.save_data) {
            gameStore.updateState(save.save_data)
            if (window.updateHud) window.updateHud()
            refreshPendingTrades()
            uiStore.notify(' ¡Tu oferta de intercambio fue aceptada y procesada!', '🎉')
          }
        }
      })
      .subscribe()
  }

  async function refreshPendingTrades() {
    if (!authStore.user || authStore.sessionMode === 'offline') return

    const db = gameStore.db
    const [incomingRes, acceptedRes] = await Promise.all([
      db.from('trade_offers').select('*').eq('receiver_id', authStore.user.id).eq('status', 'pending'),
      db.from('trade_offers').select('*').eq('sender_id', authStore.user.id).eq('status', 'accepted')
    ])

    pendingIncoming.value = incomingRes.data || []
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

    const { error } = await gameStore.db.from('trade_offers').insert({
      sender_id: authStore.user.id,
      receiver_id: tradeTarget.value.id,
      offer_pokemon: tradeOfferPoke.value,
      offer_items: { ...tradeOfferItems },
      offer_money: offerMoney,
      request_pokemon: isGift ? null : tradeRequestPoke.value,
      request_items: isGift ? {} : { ...tradeRequestItems },
      request_money: isGift ? 0 : requestMoney,
      message,
    })

    if (!error) {
      uiStore.notify(`¡Oferta enviada a ${tradeTarget.value.username}!`, '🔄')
      window.SFX?.sentMsg() // Sonido de oferta enviada
      return true
    }
    
    uiStore.notify('Error al enviar: ' + error.message, '❌')
    return false
  }

  async function acceptTrade(tradeId) {
    if (authStore.sessionMode === 'offline') return false
    
    try {
      if (window.setAuthLoading) window.setAuthLoading(true)
      
      const db = gameStore.db
      const { error: rpcErr } = await db.router.client.rpc('execute_trade', {
        p_trade_id: tradeId
      })
    
      if (rpcErr) throw new Error(rpcErr.message)

      const [tradeRes, saveRes] = await Promise.all([
        db.from('trade_offers').select('*').eq('id', tradeId).single(),
        db.from('game_saves').select('save_data').eq('user_id', authStore.user.id).single()
      ])
      
      if (saveRes.data?.save_data) {
        gameStore.updateState(saveRes.data.save_data)
        if (window.updateHud) window.updateHud()
        
        const trade = tradeRes.data
        if (trade && trade.offer_pokemon && window.checkTradeEvolution) {
          const receivedPokemon = gameStore.state.team.find(p => p.uid === trade.offer_pokemon.uid)
          if (receivedPokemon) window.checkTradeEvolution(receivedPokemon)
        }
        
        uiStore.notify('¡Intercambio realizado con éxito!', '🎉')
      }
      
      if (window.setAuthLoading) window.setAuthLoading(false)
      await refreshPendingTrades()
      return true
    } catch (err) {
      if (window.setAuthLoading) window.setAuthLoading(false)
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

  return {
    tradeTarget,
    tradeFriendSave,
    tradeOfferPoke,
    tradeRequestPoke,
    tradeOfferItems,
    tradeRequestItems,
    pendingIncoming,
    pendingAccepted,
    subscribeTradeNotifs,
    refreshPendingTrades,
    openTradeModal,
    sendTradeOffer,
    acceptTrade,
    rejectTrade,
    claimTrade
  }
})
