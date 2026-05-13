import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuthStore } from './auth.ts'
import { useGameStore } from './game.ts'
import { useUIStore } from './ui.ts'
import { useAudioStore } from './audio.ts'
import { logger } from '@/logic/utils/logger'
import { applyMarketFilters, markMarketSoldSeen, isMarketSoldSeen } from '@/logic/market'
import type { MarketFilters, MarketListing } from '@/logic/market'
import { SHOP_ITEMS } from '@/data/items'
import type { GameState } from '@/types/game'
import type { Pokemon } from '@/types/pokemon'

export const useGTSStore = defineStore('gts', () => {
  const auth = useAuthStore()
  const game = useGameStore()
  const ui = useUIStore()
  const audio = useAudioStore()

  // State
  const listings = ref<MarketListing[]>([])
  const myListings = ref<MarketListing[]>([])
  const salesHistory = ref<MarketListing[]>([])
  const loading = ref(false)
  const publishing = ref(false)

  const filters = ref<MarketFilters>({
    mode: 'pokemon',
    search: '',
    priceMin: 0,
    priceMax: 1000000,
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: 100,
    ivTotalMin: 0,
    ivTotalMax: 186,
    ivAny31: false,
    itemCat: 'all'
  })

  // Constants
  const MARKET_FEE = 0.05
  const MAX_LISTINGS = 10

  let salesChannel: RealtimeChannel | null = null

  // Getters
  const filteredListings = computed(() => {
    return applyMarketFilters(listings.value, filters.value, 'explore', {
      SHOP_ITEMS
    })
  })

  const activeMyListings = computed(() => {
    return myListings.value.filter(l => l.status === 'active')
  })

  // Actions
  async function fetchListings() {
    loading.value = true
    try {
      const { data, error } = await game.db.from('market_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100) as { data: MarketListing[] | null, error: { message: string } | null }
      
      if (!error) listings.value = data || []
    } finally {
      loading.value = false
    }
  }

  async function fetchUserData() {
    if (!auth.user) return

    const [mine, history] = await Promise.all([
      game.db.from('market_listings')
        .select('*')
        .eq('seller_id', auth.user.id)
        .neq('status', 'sold')
        .order('created_at', { ascending: false }) as unknown as Promise<{ data: MarketListing[] | null }>,
      game.db.from('market_listings')
        .select('*')
        .eq('seller_id', auth.user.id)
        .eq('status', 'sold')
        .order('created_at', { ascending: false })
        .limit(20) as unknown as Promise<{ data: MarketListing[] | null }>
    ])

    myListings.value = mine.data || []
    salesHistory.value = history.data || []

    // Check for new sales
    if (history.data && history.data.length > 0) {
      history.data.forEach(sale => {
        if (!isMarketSoldSeen(sale.id, game.state)) {
          ui.notify(`¡Tu ${sale.data.name} se vendió por ₽${sale.price.toLocaleString()}!`, '💰')
          markMarketSoldSeen(sale.id, game.state)
        }
      })
    }
  }

  function initRealtime() {
    if (auth.sessionMode === 'offline' || !auth.user) return
    if (salesChannel) return
    
    const channelName = `market-sales-${auth.user.id}`
    const db = game.db
    if (!db) return
    salesChannel = db.channel(channelName)
      .on<MarketListing>('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'market_listings',
        filter: `seller_id=eq.${auth.user.id}`
      }, (payload) => {
        if (payload.new?.status === 'sold' && payload.old?.status !== 'sold') {
          ui.notify('¡ Venta realizada en el GTS !', '💰')
          audio.money()
          fetchUserData()
        }
      })
      .subscribe()
  }

  function stopRealtime() {
    if (salesChannel) {
      salesChannel.unsubscribe()
      salesChannel = null
    }
  }

  async function buyListing(listing: MarketListing) {
    if (game.state.money < listing.price) {
      ui.notify('Saldo insuficiente', '💸')
      return false
    }

    try {
      ui.setLoading(true)
      
      // MANDATORY: Pre-Action Flush
      ui.notify('Sincronizando fondos...', '🔄')
      await game.save(false)

      const { data: newSave, error } = await game.db.rpc('buy_listing_v2', {
        p_listing_id: listing.id
      }) as { data: GameState | null, error: { message: string } | null }

      if (error) throw error

      if (newSave) {
        game.updateState(newSave)
        
        ui.notify('¡ Compra exitosa ! Objeto enviado a tus Reclamos.', '✅')
        await game.fetchClaimQueue()
        fetchListings()
        return true
      }
      return false
    } catch (e) {
      const err = e as Error
      logger.error('GTS', `Error en la compra: ${err.message}`)
      ui.notify(err.message || 'Error en la compra', '❌')
      return false
    } finally {
      ui.setLoading(false)
    }
  }

  async function publishListing(type: 'pokemon' | 'item', selection: Pokemon | { name: string; qty: number }, price: number) {
    if (activeMyListings.value.length >= MAX_LISTINGS) {
      ui.notify(`Límite de publicaciones alcanzado (${MAX_LISTINGS})`, '⚠️')
      return false
    }

    publishing.value = true
    try {
      // MANDATORY: Pre-Action Flush
      ui.notify('Sincronizando inventario...', '🔄')
      await game.save(false)

      const { data: _listingId, error } = await game.db.rpc('publish_listing_v2', {
        p_listing_type: type,
        p_asset_data: type === 'pokemon' ? selection : { name: (selection as { name: string }).name, qty: 1 },
        p_price: Math.floor(price)
      })

      if (error) throw error

      // Refresh state to confirm removal
      if (!auth.user) return false
      const { data: save } = await game.db.from('game_saves').select('save_data').eq('user_id', auth.user.id).single() as { data: { save_data: GameState } | null }
      if (save?.save_data) {
        game.updateState(save.save_data)
      }

      ui.notify('¡ Publicación exitosa !', '🚀')
      fetchUserData()
      return true
    } catch (e) {
      const err = e as Error
      logger.error('GTS', `Error al publicar: ${err.message}`)
      ui.notify(err.message || 'Error al publicar', '❌')
      return false
    } finally {
      publishing.value = false
    }
  }

  async function cancelListing(listingId: string) {
    try {
      ui.notify('Retirando publicación...', '🔄')
      const { error } = await game.db.rpc('cancel_listing_v2', {
        p_listing_id: listingId
      })

      if (error) throw error

      ui.notify('Publicación cancelada. El objeto se envió a tus Reclamos.', '✅')
      await game.fetchClaimQueue()
      fetchUserData()
      return true
    } catch (e) {
      const err = e as Error
      logger.error('GTS', `Error al cancelar: ${err.message}`)
      ui.notify(err.message || 'Error al cancelar', '❌')
      return false
    }
  }

  return {
    listings, myListings, salesHistory, loading, publishing, filters,
    MARKET_FEE, MAX_LISTINGS,
    filteredListings, activeMyListings,
    fetchListings, fetchUserData, initRealtime, stopRealtime,
    buyListing, publishListing, cancelListing
  }
})
