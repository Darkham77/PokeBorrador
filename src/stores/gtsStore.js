import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useAudioStore } from './audio'
import { applyMarketFilters, markMarketSoldSeen, isMarketSoldSeen } from '@/logic/market'
import { SHOP_ITEMS } from '@/data/items'

export const useGTSStore = defineStore('gts', () => {
  const auth = useAuthStore()
  const game = useGameStore()
  const ui = useUIStore()
  const audio = useAudioStore()

  // State
  const listings = ref([])
  const myListings = ref([])
  const salesHistory = ref([])
  const loading = ref(false)
  const publishing = ref(false)

  // Filters state
  const filters = ref({
    mode: 'pokemon', // 'pokemon' | 'item'
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

  let salesChannel = null

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
    if (auth.sessionMode === 'offline') return
    
    loading.value = true
    try {
      const { data, error } = await game.db.from('market_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (!error) listings.value = data || []
    } finally {
      loading.value = false
    }
  }

  async function fetchUserData() {
    if (auth.sessionMode === 'offline' || !auth.user) return

    const [mine, history] = await Promise.all([
      game.db.from('market_listings')
        .select('*')
        .eq('seller_id', auth.user.id)
        .neq('status', 'sold')
        .order('created_at', { ascending: false }),
      game.db.from('market_listings')
        .select('*')
        .eq('seller_id', auth.user.id)
        .eq('status', 'sold')
        .order('created_at', { ascending: false })
        .limit(20)
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
    
    salesChannel = game.db.channel(`market-sales-${auth.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'market_listings',
        filter: `seller_id=eq.${auth.user.id}`
      }, (payload) => {
        if (payload.new.status === 'sold' && payload.old.status !== 'sold') {
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

  async function buyListing(listing) {
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
      })

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
      console.error('[GTS BUY ERROR]', e)
      ui.notify(e.message || 'Error en la compra', '❌')
      return false
    } finally {
      ui.setLoading(false)
    }
  }

  async function publishListing(type, selection, price) {
    if (activeMyListings.value.length >= MAX_LISTINGS) {
      ui.notify(`Límite de publicaciones alcanzado (${MAX_LISTINGS})`, '⚠️')
      return false
    }

    publishing.value = true
    try {
      // MANDATORY: Pre-Action Flush
      ui.notify('Sincronizando inventario...', '🔄')
      await game.save(false)

      const { data: listingId, error } = await game.db.rpc('publish_listing_v2', {
        p_listing_type: type,
        p_asset_data: type === 'pokemon' ? selection : { name: selection.name, qty: 1 },
        p_price: Math.floor(price)
      })

      if (error) throw error

      // Refresh state to confirm removal
      const { data: save } = await game.db.from('game_saves').select('save_data').eq('user_id', auth.user.id).single()
      if (save?.save_data) {
        game.updateState(save.save_data)
      }

      ui.notify('¡ Publicación exitosa ! Objeto en custodia.', '🚀')
      fetchUserData()
      return true
    } catch (e) {
      console.error('[GTS PUB ERROR]', e)
      ui.notify(e.message || 'Error al publicar', '❌')
      return false
    } finally {
      publishing.value = false
    }
  }

  async function cancelListing(listingId) {
    try {
      ui.notify('Retirando publicación...', '🔄')
      const { error } = await game.db.rpc('cancel_listing_v2', {
        p_listing_id: listingId
      })

      if (error) throw error

      ui.notify('Publicación retirada. Reclámala en tus Reclamos.', '↩️')
      await game.fetchClaimQueue()
      fetchUserData()
      return true
    } catch (e) {
      console.error('[GTS CANCEL ERROR]', e)
      ui.notify(e.message || 'Error al retirar', '❌')
      return false
    }
  }

  return {
    listings,
    myListings,
    salesHistory,
    loading,
    publishing,
    filters,
    MARKET_FEE,
    MAX_LISTINGS,
    filteredListings,
    activeMyListings,
    fetchListings,
    fetchUserData,
    initRealtime,
    stopRealtime,
    buyListing,
    publishListing,
    cancelListing
  }
})
