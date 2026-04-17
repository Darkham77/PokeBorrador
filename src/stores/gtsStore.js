import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { applyMarketFilters, markMarketSoldSeen, isMarketSoldSeen } from '@/logic/market'
import { SHOP_ITEMS } from '@/data/items'

export const useGTSStore = defineStore('gts', () => {
  const auth = useAuthStore()
  const game = useGameStore()
  const ui = useUIStore()

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
          if (window.SFX) window.SFX.play('money')
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
      const { data, error } = await game.db.from('market_listings')
        .update({ status: 'sold', buyer_id: auth.user.id })
        .eq('id', listing.id)
        .eq('status', 'active')
        .select()

      if (error || !data?.length) {
        ui.notify('La oferta ya no está disponible', '⚠️')
        fetchListings()
        return false
      }

      game.state.money -= listing.price
      
      if (listing.listing_type === 'pokemon') {
        game.state.box.push(data[0].data)
      } else {
        const item = data[0].data
        game.state.inventory[item.name] = (game.state.inventory[item.name] || 0) + item.qty
      }

      ui.notify('¡ Compra exitosa !', '✅')
      await game.saveGame(false)
      fetchListings()
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  async function publishListing(type, selection, price) {
    if (activeMyListings.value.length >= MAX_LISTINGS) {
      ui.notify(`Límite de publicaciones alcanzado (${MAX_LISTINGS})`, '⚠️')
      return false
    }

    publishing.value = true
    try {
      const { error } = await game.db.from('market_listings').insert([{
        seller_id: auth.user.id,
        seller_name: game.state.trainer,
        listing_type: type,
        data: type === 'pokemon' ? selection : { name: selection.name, qty: 1 },
        price: Math.floor(price),
        status: 'active'
      }])

      if (error) throw error

      // Remove from player inventory
      if (type === 'pokemon') {
        const idx = game.state.box.findIndex(p => p.uid === selection.uid)
        if (idx !== -1) game.state.box.splice(idx, 1)
      } else {
        game.state.inventory[selection.name]--
        if (game.state.inventory[selection.name] <= 0) delete game.state.inventory[selection.name]
      }

      ui.notify('¡ Publicación exitosa !', '🚀')
      await game.saveGame(false)
      fetchUserData()
      return true
    } catch (e) {
      console.error(e)
      ui.notify('Error al publicar', '❌')
      return false
    } finally {
      publishing.value = false
    }
  }

  async function cancelListing(listingId) {
    try {
      const { data, error } = await game.db.from('market_listings')
        .update({ status: 'cancelled' })
        .eq('id', listingId)
        .eq('seller_id', auth.user.id)
        .eq('status', 'active')
        .select()

      if (error || !data?.length) return false

      const listing = data[0]
      if (listing.listing_type === 'pokemon') {
        game.state.box.push(listing.data)
      } else {
        game.state.inventory[listing.data.name] = (game.state.inventory[listing.data.name] || 0) + listing.data.qty
      }

      ui.notify('Publicación cancelada', '↩️')
      await game.saveGame(false)
      fetchUserData()
      return true
    } catch (e) {
      console.error(e)
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
