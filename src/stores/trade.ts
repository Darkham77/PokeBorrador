import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useSocialStore } from '@/stores/social/social.ts'
import { useAudioStore } from '@/stores/audio.ts'
import { useLoadingStore } from '@/stores/loading.ts'
import { logger } from '@/logic/utils/logger'
import { validateTradeOffer } from '@/logic/validation/schemas'
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality'
import type { 
  TradeOffer
} from '@/types/system/stores'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { GameState } from '@/types/system/game'
import type { RealtimeChannel } from '@supabase/supabase-js'

import type { ItemId } from '@/data/inventory/itemIds.ts'
import { isItemId } from '@/data/inventory/items.ts'

export const useTradeStore = defineStore('trade', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const socialStore = useSocialStore()
  const audioStore = useAudioStore()
  const loadingStore = useLoadingStore()

  const tradeTarget = ref<{ id: string; username: string } | null>(null)
  const tradeFriendSave = ref<GameState | null>(null)
  
  const tradeOfferPoke = ref<Pokemon | null>(null)
  const tradeRequestPoke = ref<Pokemon | null>(null)
  const tradeOfferItems = reactive<Partial<Record<ItemId, number>>>({})
  const tradeRequestItems = reactive<Partial<Record<ItemId, number>>>({})
  
  const pendingIncoming = ref<TradeOffer[]>([])
  const pendingOutgoing = ref<TradeOffer[]>([])
  const pendingAccepted = ref<TradeOffer[]>([])

  let tradeChannel: RealtimeChannel | null = null

  async function subscribeTradeNotifs() {
    if (!authStore.user || authStore.sessionMode === 'offline') return
    if (tradeChannel) tradeChannel.unsubscribe()

    const db = gameStore.db
    if (!db) return
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
        audioStore.play('shiny') // Sonido de notificación
        refreshPendingTrades()
      })
      .subscribe()
  }

  async function refreshPendingTrades() {
    if (!authStore.user) return

    const db = gameStore.db
    const [incRes, outRes, accRes] = await Promise.all([
      db.from('trade_offers').select('*').eq('receiver_id', authStore.user.id).eq('status', 'pending'),
      db.from('trade_offers').select('*').eq('sender_id', authStore.user.id).eq('status', 'pending'),
      db.from('trade_offers').select('*').eq('sender_id', authStore.user.id).eq('status', 'accepted')
    ])

    const incomingRes = { data: incRes.data as TradeOffer[] | null } // domain-ok
    const outgoingRes = { data: outRes.data as TradeOffer[] | null } // domain-ok
    const acceptedRes = { data: accRes.data as TradeOffer[] | null } // domain-ok

    const validateOffers = (offers: TradeOffer[] | null): TradeOffer[] => {
      if (!offers) return []
      return offers.filter(o => {
        const v = validateTradeOffer(o)
        if (!v.success) {
          logger.error('TRADE', 'Oferta de intercambio inválida omitida de la lista:', v.issues)
          return false
        }
        return true
      })
    }

    pendingIncoming.value = validateOffers(incomingRes.data)
    pendingOutgoing.value = validateOffers(outgoingRes.data)
    pendingAccepted.value = validateOffers(acceptedRes.data)
    
    // Sincronizar contador en socialStore
    await socialStore.refreshNotificationCount()
  }

  async function openTradeModal(friendId: string, friendUsername: string) {
    tradeTarget.value = { id: friendId, username: friendUsername }
    tradeOfferPoke.value = null
    tradeRequestPoke.value = null
    Object.keys(tradeOfferItems).forEach(k => {
      if (isItemId(k)) delete tradeOfferItems[k]
    })
    Object.keys(tradeRequestItems).forEach(k => {
      if (isItemId(k)) delete tradeRequestItems[k]
    })

    const saveRes = await gameStore.db.from('game_saves').select('save_data').eq('user_id', friendId).single()
    const data = saveRes.data as { save_data: GameState } | null // domain-ok
    const error = saveRes.error
    
    if (error || !data) {
      tradeFriendSave.value = null
      uiStore.notify('No se pudo cargar el inventario del amigo.', '⚠️')
    } else {
      tradeFriendSave.value = data.save_data
    }
    uiStore.open('Trade')
  }

  async function sendTradeOffer({ isGift, offerMoney, requestMoney, message }: { isGift: boolean; offerMoney: number; requestMoney: number; message: string }) {
    if (!tradeTarget.value) return false

    const hasOffer = tradeOfferPoke.value !== null || Object.keys(tradeOfferItems).length > 0 || offerMoney > 0
    if (!hasOffer) {
      uiStore.notify('Tenés que ofrecer algo.', '⚠️')
      return false
    }

    if (offerMoney > gameStore.state.money) {
      uiStore.notify('No tenés suficiente dinero.', '💸')
      return false
    }

    // Anti-Duplicate and Legality check
    if (tradeOfferPoke.value) {
      const isIllegal = tradeOfferPoke.value.isIllegal || (
        tradeOfferPoke.value.id && tradeOfferPoke.value.species && tradeOfferPoke.value.moves
          ? !checkPokemonLegality(tradeOfferPoke.value).isLegal
          : false
      )
      if (isIllegal) {
        uiStore.notify('No puedes comerciar o intercambiar un Pokémon ilegal.', '⚠️')
        return false
      }
      if (lockedUids.value.has(tradeOfferPoke.value.uid)) {
        uiStore.notify('Este Pokémon ya está en otra oferta pendiente.', '⚠️')
        return false
      }
    }

    // MANDATORY: Deduct items locally before saving to SQLite so DBs match
    for (const [itemName, qty] of Object.entries(tradeOfferItems)) {
      if (isItemId(itemName) && typeof qty === 'number' && gameStore.state.inventory[itemName]) {
        gameStore.state.inventory[itemName] -= qty
        if (gameStore.state.inventory[itemName] <= 0) {
          delete gameStore.state.inventory[itemName]
        }
      }
    }
    if (offerMoney > 0) {
      gameStore.state.money -= offerMoney
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
      audioStore.play('sentMsg') 
      await gameStore.loadGame() // <-- OBLIGATORIO: Actualizar cliente post-escrow
      refreshPendingTrades()
      return true
    } else {
      // ROLLBACK LOCAL: Si falla, devolver los items
      for (const [itemName, qty] of Object.entries(tradeOfferItems)) {
        if (isItemId(itemName) && typeof qty === 'number') {
          gameStore.state.inventory[itemName] = (gameStore.state.inventory[itemName] || 0) + qty
        }
      }
      if (offerMoney > 0) {
        gameStore.state.money += offerMoney
      }
      logger.error('TRADE', `Error al enviar oferta: ${(error as Error).message}`)
      uiStore.notify('Error al enviar oferta: ' + (error as { message: string }).message, '❌')
      return false
    }
  }

  async function acceptTrade(tradeId: string | number) {
    
    try {
      loadingStore.start('accept_trade', 'Procesando intercambio...', 'Sincronizando con el servidor', true, '🔄')
      
      // MANDATORY: Pre-Action Flush
      uiStore.notify('Sincronizando inventario...', '🔄')
      await gameStore.save(false)

      const db = gameStore.db
      const { error: rpcErr } = await db.rpc('accept_trade_v2', {
        p_trade_id: tradeId
      })
    
      if (rpcErr) throw new Error((rpcErr as { message: string }).message)

      uiStore.notify('¡Intercambio aceptado! Los activos están en tu cola de reclamo.', '🎉')
      await gameStore.fetchClaimQueue()
      
      loadingStore.finish('accept_trade')
      await refreshPendingTrades()
      return true
    } catch (err) {
      loadingStore.finish('accept_trade')
      logger.error('TRADE', `Error en el intercambio: ${(err as Error).message}`)
      uiStore.notify('Error en el intercambio: ' + (err as { message: string }).message, '❌')
      return false
    }
  }

  async function rejectTrade(tradeId: string | number) {
    try {
      loadingStore.start('reject_trade', 'Cancelando intercambio...', 'Sincronizando con el servidor', true, '🔄')
      
      // MANDATORY: Pre-Action Flush
      uiStore.notify('Sincronizando inventario...', '🔄')
      await gameStore.save(false)

      const { error } = await gameStore.db.rpc('reject_trade_v2', {
        p_trade_id: tradeId
      })
      if (error) throw new Error((error as { message: string }).message)
      
      uiStore.notify('Oferta cancelada/rechazada. Reembolso enviado a Reclamos.', '👋')
      await gameStore.fetchClaimQueue()
      await gameStore.loadGame() // <-- OBLIGATORIO: Actualizar cliente tras cambios de escrow
      await refreshPendingTrades()
      
      loadingStore.finish('reject_trade')
    } catch (err) {
      loadingStore.finish('reject_trade')
      logger.error('TRADE', `Error al cancelar/rechazar intercambio: ${(err as Error).message}`)
      uiStore.notify('Error al procesar: ' + (err as { message: string }).message, '❌')
    }
  }

  async function claimTrade(tradeId: string | number) {
    try {
      const { error } = await gameStore.db.from('trade_offers').update({ status: 'claimed' }).eq('id', tradeId)
      if (error) throw new Error((error as { message: string }).message)
      await refreshPendingTrades()
    } catch (err) {
      logger.error('TRADE', `Error al confirmar intercambio: ${(err as Error).message}`)
      uiStore.notify('Error al confirmar: ' + (err as { message: string }).message, '❌')
    }
  }

  const lockedUids = computed(() => {
    const locked = new Set<string>()
    pendingIncoming.value.forEach((t: TradeOffer) => {
      if (t.request_pokemon?.uid) locked.add(t.request_pokemon.uid)
    })
    pendingOutgoing.value.forEach((t: TradeOffer) => {
      if (t.offer_pokemon?.uid) locked.add(t.offer_pokemon.uid)
    })
    return locked
  })

  const pendingCount = computed(() => pendingIncoming.value.length)
  
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
    pendingCount,
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
