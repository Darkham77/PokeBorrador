import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'

export const useShopStore = defineStore('shop', () => {
  const gameStore = useGameStore()
  
  const categories = ['todos', 'pokeballs', 'pociones', 'stones', 'especial', 'held', 'utility', 'booster']
  const activeCategory = ref('todos')
  const searchQuery = ref('')
  
  const shopItems = ref([
    // Pociones
    { id: 'pocion', name: 'Poción', cat: 'pociones', price: 200, unlockLv: 1, tier: 'common', desc: 'Restaura 20 HP a un Pokémon.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png', icon: '🧪' },
    { id: 'super_pocion', name: 'Super Poción', cat: 'pociones', price: 600, unlockLv: 3, tier: 'rare', desc: 'Restaura 50 HP a un Pokémon.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png', icon: '🔵' },
    { id: 'hiper_pocion', name: 'Hiper Poción', cat: 'pociones', price: 1500, unlockLv: 8, tier: 'epic', desc: 'Restaura 200 HP a un Pokémon.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hyper-potion.png', icon: '🟣' },
    { id: 'pocion_max', name: 'Poción Máxima', cat: 'pociones', price: 2500, unlockLv: 12, tier: 'legend', desc: 'Restaura todo el HP de un Pokémon.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-potion.png', icon: '💜' },
    { id: 'revivir', name: 'Revivir', cat: 'pociones', price: 2000, unlockLv: 8, tier: 'epic', desc: 'Revive a un Pokémon debilitado con la mitad del HP.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.png', icon: '❤️' },
    { id: 'revivir_max', name: 'Revivir Máximo', cat: 'pociones', price: 3000, unlockLv: 15, tier: 'legend', desc: 'Revive a un Pokémon debilitado con el HP al máximo.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-revive.png', icon: '💖' },
    { id: 'antidoto', name: 'Antídoto', cat: 'pociones', price: 100, unlockLv: 1, tier: 'common', desc: 'Cura el envenenamiento de un Pokémon.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/antidote.png', icon: '💚' },
    { id: 'quemadura', name: 'Cura Quemadura', cat: 'pociones', price: 250, unlockLv: 2, tier: 'common', desc: 'Cura la quemadura de un Pokémon.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/burn-heal.png', icon: '🧊' },
    { id: 'despertar', name: 'Despertar', cat: 'pociones', price: 250, unlockLv: 1, tier: 'common', desc: 'Despierta a un Pokémon dormido.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/awakening.png', icon: '☕' },
    { id: 'cura_total', name: 'Cura Total', cat: 'pociones', price: 600, unlockLv: 5, tier: 'rare', desc: 'Cura todos los estados alterados de un Pokémon.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/full-heal.png', icon: '✨' },
    { id: 'elixir', name: 'Éter', cat: 'pociones', price: 1200, unlockLv: 5, tier: 'rare', desc: 'Restaura 10 PP de un movimiento.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ether.png', icon: '💎' },
    { id: 'elixir_max', name: 'Elixir Máximo', cat: 'pociones', price: 4500, unlockLv: 15, tier: 'legend', desc: 'Restaura todos los PP de todos los movimientos.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-elixir.png', icon: '🌟' },
    
    // Pokeballs
    { id: 'pokeball', name: 'Pokéball', cat: 'pokeballs', price: 200, unlockLv: 1, tier: 'common', desc: 'Captura Pokémon salvajes. Tasa de captura estándar.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png', icon: '⚪' },
    { id: 'great_ball', name: 'Súper Ball', cat: 'pokeballs', price: 500, unlockLv: 3, tier: 'rare', desc: 'Tasa de captura x1.5 respecto a la Pokéball normal.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png', icon: '🔵' },
    { id: 'ultra_ball', name: 'Ultra Ball', cat: 'pokeballs', price: 1000, unlockLv: 8, tier: 'epic', desc: 'Tasa de captura x2. Alta efectividad contra Pokémon raros.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png', icon: '⚫' },
    { id: 'net_ball', name: 'Red Ball', cat: 'pokeballs', price: 800, unlockLv: 5, tier: 'rare', desc: 'Tasa de captura x3 contra Pokémon de tipo Agua o Bicho.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/net-ball.png', icon: '🕸️' },
    { id: 'dusk_ball', name: 'Ocaso Ball', cat: 'pokeballs', price: 800, unlockLv: 5, tier: 'rare', desc: 'Tasa de captura x3 en cuevas o de noche.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png', icon: '🌑' },
    { id: 'timer_ball', name: 'Turno Ball', cat: 'pokeballs', price: 800, unlockLv: 10, tier: 'epic', desc: 'Tasa de captura que aumenta según turnos transcurridos.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/timer-ball.png', icon: '⏱️' },
    { id: 'master_ball', name: 'Master Ball', cat: 'pokeballs', price: 100000, unlockLv: 25, tier: 'legend', desc: 'Captura cualquier Pokémon sin fallar. ¡Sin excepción!', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png', icon: '🟣' },

    // Piedras
    { id: 'piedra_fuego', name: 'Piedra Fuego', cat: 'stones', price: 20000, unlockLv: 10, tier: 'rare', desc: 'Hace evolucionar a Vulpix, Growlithe, Eevee y otros.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fire-stone.png', icon: '🔥' },
    { id: 'piedra_agua', name: 'Piedra Agua', cat: 'stones', price: 20000, unlockLv: 10, tier: 'rare', desc: 'Hace evolucionar a Poliwhirl, Shellder, Staryu y Eevee.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/water-stone.png', icon: '💧' },
    { id: 'piedra_trueno', name: 'Piedra Trueno', cat: 'stones', price: 20000, unlockLv: 10, tier: 'rare', desc: 'Hace evolucionar a Pikachu and Eevee.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thunder-stone.png', icon: '⚡' },
    { id: 'piedra_hoja', name: 'Piedra Hoja', cat: 'stones', price: 20000, unlockLv: 10, tier: 'rare', desc: 'Hace evolucionar a Gloom, Weepinbell y Exeggcute.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leaf-stone.png', icon: '🌿' },
    { id: 'piedra_luna', name: 'Piedra Lunar', cat: 'stones', price: 20000, unlockLv: 10, tier: 'epic', desc: 'Hace evolucionar a Nidorina, Nidorino, Clefairy.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/moon-stone.png', icon: '🌙' },

    // Breeding & Special (Trainer Shop mostly)
    { id: 'everstone', name: 'Piedra Eterna', cat: 'breeding', price: 10000, unlockLv: 15, tier: 'epic', desc: 'Asegura heredar naturaleza en la guardería.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/everstone.png', icon: '🪨', market: false, trainerShop: false },
    { id: 'exp_share', name: 'Compartir EXP', cat: 'held', price: 0, bcPrice: 800, unlockLv: 5, tier: 'rare', desc: 'El portador gana EXP aunque no participe.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-share.png', icon: '🎒', market: false, trainerShop: true },
    { id: 'rare_candy', name: 'Caramelo Raro', cat: 'utility', price: 0, bcPrice: 2500, unlockLv: 22, tier: 'epic', desc: 'Sube un nivel al instante.', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png', icon: '🍬', market: false, trainerShop: true }
  ])

  const filteredItems = computed(() => {
    return shopItems.value.filter(item => {
      const matchCat = activeCategory.value === 'todos' || item.cat === activeCategory.value
      const matchSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      // Default to showing only "market" items unless in trainer shop mode
      return matchCat && matchSearch && (item.market !== false)
    })
  })

  const trainerShopItems = computed(() => {
    return shopItems.value.filter(item => item.trainerShop === true)
  })

  // Actions
  const buyItem = (itemId, quantity = 1) => {
    const item = shopItems.value.find(i => i.id === itemId)
    if (!item) return false
    
    const totalPrice = item.price * quantity
    if (gameStore.state.money < totalPrice) {
      window.notify?.('No tenés suficiente dinero (₽).', '❌')
      return false
    }

    // Process purchase in legacy state for backward compatibility
    gameStore.state.money -= totalPrice
    gameStore.state.inventory[item.name] = (gameStore.state.inventory[item.name] || 0) + quantity
    
    // Specific item side effects (like adding to balls counter)
    if (item.cat === 'pokeballs') {
      const multiplier = item.id === 'great_ball' ? 1.5 : (item.id === 'ultra_ball' ? 2 : (item.id === 'net_ball' || item.id === 'dusk_ball' ? 1.8 : 1))
      gameStore.state.balls += Math.floor(quantity * multiplier)
    }

    window.notify?.(`¡Compraste x${quantity} ${item.name}!`, item.icon)
    if (typeof window.saveGame === 'function') window.saveGame(false)
    return true
  }

  return {
    activeCategory,
    searchQuery,
    categories,
    filteredItems,
    trainerShopItems,
    buyItem
  }
})
