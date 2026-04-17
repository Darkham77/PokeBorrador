/**
 * Database of all items in the game.
 * Migrated from public/js/08_shop.js and public/js/11_battle_ui.js
 */

export const ITEM_CATEGORIES = ['todos', 'pokeballs', 'pociones', 'stones', 'especial'];

export const CATEGORY_LABELS = {
  todos: 'Todo',
  pokeballs: 'Pokéballs',
  pociones: 'Pociones',
  stones: 'Piedras',
  especial: 'Especial'
};

export const MARKET_CAT_ORDER = {
  pokeballs: 1,
  pociones: 2,
  stones: 3,
  especial: 4
};

// What unlocks at each trainer level
export const MARKET_UNLOCKS = {
  3: ['Súper Ball', 'Super Poción'],
  5: ['Red Ball', 'Ocaso Ball', 'Cura Total', 'Compartir EXP', 'MT27 Retribución'],
  8: ['Hiper Poción', 'Ultra Ball', 'Revivir', 'Lente Zoom', 'Subida de PP'],
  10: ['Turno Ball', 'Restos', 'Cascabel Concha', 'Piedras de Evolución'],
  12: ['Poción Máxima', 'Huevo Suerte Pequeño', 'Cinta Elegida', 'MT14 Ventisca'],
  15: ['Revivir Máximo', 'Elixir Máximo', 'Banda Focus'],
  22: ['Caramelo Raro'],
  25: ['Master Ball']
};

export const SHOP_ITEMS = [
  // ── BREEDING ITEMS ──────────────────────────────────────────────────────────
  {
    id: 'berry_bronze', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/oran-berry.webp',
    name: 'Baya de Bronce', icon: '🥉', price: 5000, unlockLv: 5, tier: 'common', market: false, trainerShop: false,
    desc: 'Acorta el tiempo de la guardería un 10%. Solo un uso por ciclo.'
  },
  {
    id: 'berry_silver', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sitrus-berry.webp',
    name: 'Baya de Plata', icon: '🥈', price: 15000, unlockLv: 10, tier: 'rare', market: false, trainerShop: false,
    desc: 'Acorta el tiempo de la guardería un 30%. Solo un uso por ciclo.'
  },
  {
    id: 'berry_gold', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lum-berry.webp',
    name: 'Baya de Oro', icon: '🥇', price: 25000, unlockLv: 15, tier: 'epic', market: false, trainerShop: false,
    desc: 'Acorta el tiempo de la guardería un 50%. Solo un uso por ciclo.'
  },
  {
    id: 'everstone', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/everstone.webp',
    name: 'Piedra Eterna', icon: '🪨', price: 10000, unlockLv: 15, tier: 'epic', market: false, trainerShop: false,
    desc: 'Equipada en la guardería, asegura que la cría herede la naturaleza de este padre.'
  },
  {
    id: 'destiny_knot', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/destiny-knot.webp',
    name: 'Lazo Destino', icon: '🧶', price: 0, unlockLv: 20, tier: 'legend', market: false, trainerShop: true, bcPrice: 4800,
    desc: 'Equipado en la guardería, hace que la cría herede 5 IVs de los padres en lugar de 3.'
  },
  {
    id: 'vigor_restorer', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.webp',
    name: 'Restaurador de Vigor', icon: '⚡', price: 50000, unlockLv: 10, tier: 'epic', market: true,
    desc: 'Restaura el vigor de un Pokémon veterano para que pueda volver a criar. ¡Uso limitado!'
  },
  {
    id: 'power_weight', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-weight.webp',
    name: 'Pesa Recia', icon: '🏋️', price: 0, unlockLv: 15, tier: 'epic', market: false, trainerShop: true, bcPrice: 1500,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de HP de este padre.'
  },
  {
    id: 'power_bracer', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/items/power-bracer.webp',
    name: 'Brazal Recio', icon: '🥊', price: 0, unlockLv: 15, tier: 'epic', market: false, trainerShop: true, bcPrice: 1500,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de Ataque de este padre.'
  },
  {
    id: 'power_belt', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/items/power-belt.webp',
    name: 'Cinto Recio', icon: '🛡️', price: 0, unlockLv: 15, tier: 'epic', market: false, trainerShop: true, bcPrice: 1500,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de Defensa de este padre.'
  },
  {
    id: 'power_lens', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/items/power-lens.webp',
    name: 'Lente Recia', icon: '🔍', price: 0, unlockLv: 15, tier: 'epic', market: false, trainerShop: true, bcPrice: 1500,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de At. Especial de este padre.'
  },
  {
    id: 'power_band', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/items/power-band.webp',
    name: 'Banda Recia', icon: '🎗️', price: 0, unlockLv: 15, tier: 'epic', market: false, trainerShop: true, bcPrice: 1500,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de Def. Especial de este padre.'
  },
  {
    id: 'power_anklet', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/items/power-anklet.webp',
    name: 'Franja Recia', icon: '👢', price: 0, unlockLv: 15, tier: 'epic', market: false, trainerShop: true, bcPrice: 1500,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de Velocidad de este padre.'
  },
  // ── POKÉBALLS ──────────────────────────────────────────────────────────────
  {
    id: 'pokeball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.webp',
    name: 'Pokéball', icon: '⚪', price: 200, unlockLv: 1, tier: 'common',
    desc: 'Captura Pokémon salvajes. Tasa de captura estándar.'
  },
  {
    id: 'great_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.webp',
    name: 'Súper Ball', icon: '🔵', price: 500, unlockLv: 3, tier: 'rare',
    desc: 'Tasa de captura x1.5 respecto a la Pokéball normal.'
  },
  {
    id: 'ultra_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.webp',
    name: 'Ultra Ball', icon: '⚫', price: 1000, unlockLv: 8, tier: 'epic',
    desc: 'Tasa de captura x2. Alta efectividad contra Pokémon raros.'
  },
  {
    id: 'net_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/net-ball.webp',
    name: 'Red Ball', icon: '🕸️', price: 800, unlockLv: 5, tier: 'rare',
    desc: 'Tasa de captura x3 contra Pokémon de tipo Agua o Bicho.'
  },
  {
    id: 'dusk_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.webp',
    name: 'Ocaso Ball', icon: '🌑', price: 800, unlockLv: 5, tier: 'rare',
    desc: 'Tasa de captura x3 en cuevas o de noche.'
  },
  {
    id: 'timer_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/timer-ball.webp',
    name: 'Turno Ball', icon: '⏱️', price: 800, unlockLv: 10, tier: 'epic',
    desc: 'Tasa de captura que aumenta según turnos transcurridos.'
  },
  {
    id: 'master_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.webp',
    name: 'Master Ball', icon: '🟣', price: 100000, unlockLv: 25, tier: 'legend',
    desc: 'Captura cualquier Pokémon sin fallar. ¡Sin excepción!'
  },
  // ── POCIONES ───────────────────────────────────────────────────────────────
  {
    id: 'pocion', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.webp',
    name: 'Poción', icon: '🧪', price: 200, unlockLv: 1, tier: 'common',
    desc: 'Restaura 20 HP a un Pokémon.'
  },
  {
    id: 'super_pocion', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.webp',
    name: 'Super Poción', icon: '🔵', price: 600, unlockLv: 3, tier: 'rare',
    desc: 'Restaura 50 HP a un Pokémon.'
  },
  {
    id: 'hiper_pocion', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hyper-potion.webp',
    name: 'Hiper Poción', icon: '🟣', price: 1500, unlockLv: 8, tier: 'epic',
    desc: 'Restaura 200 HP a un Pokémon.'
  },
  {
    id: 'pocion_max', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-potion.webp',
    name: 'Poción Máxima', icon: '💜', price: 2500, unlockLv: 12, tier: 'legend',
    desc: 'Restaura todo el HP de un Pokémon.'
  },
  {
    id: 'revivir', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.webp',
    name: 'Revivir', icon: '❤️', price: 2000, unlockLv: 8, tier: 'epic',
    desc: 'Revive a un Pokémon debilitado con la mitad del HP.'
  },
  {
    id: 'revivir_max', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-revive.webp',
    name: 'Revivir Máximo', icon: '💖', price: 3000, unlockLv: 15, tier: 'legend',
    desc: 'Revive a un Pokémon debilitado con el HP al máximo.'
  },
  {
    id: 'antidoto', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/antidote.webp',
    name: 'Antídoto', icon: '💚', price: 100, unlockLv: 1, tier: 'common',
    desc: 'Cura el envenenamiento de un Pokémon.'
  },
  {
    id: 'quemadura', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/burn-heal.webp',
    name: 'Cura Quemadura', icon: '🧊', price: 250, unlockLv: 2, tier: 'common',
    desc: 'Cura la quemadura de un Pokémon.'
  },
  {
    id: 'despertar', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/awakening.webp',
    name: 'Despertar', icon: '☕', price: 250, unlockLv: 1, tier: 'common',
    desc: 'Despierta a un Pokémon dormido.'
  },
  {
    id: 'cura_total', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/full-heal.webp',
    name: 'Cura Total', icon: '✨', price: 600, unlockLv: 5, tier: 'rare',
    desc: 'Cura todos los estados alterados de un Pokémon.'
  },
  {
    id: 'elixir', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ether.webp',
    name: 'Éter', icon: '💎', price: 1200, unlockLv: 5, tier: 'rare',
    desc: 'Restaura 10 PP de un movimiento.'
  },
  {
    id: 'elixir_max', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-elixir.webp',
    name: 'Elixir Máximo', icon: '🌟', price: 4500, unlockLv: 15, tier: 'legend',
    desc: 'Restaura todos los PP de todos los movimientos.'
  },
  // ── PIEDRAS DE EVOLUCIÓN ───────────────────────────────────────────────────
  {
    id: 'piedra_fuego', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fire-stone.webp',
    name: 'Piedra Fuego', icon: '🔥', price: 20000, unlockLv: 10, tier: 'rare',
    desc: 'Hace evolucionar a Vulpix, Growlithe, Eevee y otros Pokémon de Fuego.',
    type: 'stone', stoneType: 'fire'
  },
  {
    id: 'piedra_agua', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/water-stone.webp',
    name: 'Piedra Agua', icon: '💧', price: 20000, unlockLv: 10, tier: 'rare',
    desc: 'Hace evolucionar a Poliwhirl, Shellder, Staryu y Eevee.',
    type: 'stone', stoneType: 'water'
  },
  {
    id: 'piedra_trueno', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thunder-stone.webp',
    name: 'Piedra Trueno', icon: '⚡', price: 20000, unlockLv: 10, tier: 'rare',
    desc: 'Hace evolucionar a Pikachu and Eevee.',
    type: 'stone', stoneType: 'thunder'
  },
  {
    id: 'piedra_hoja', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leaf-stone.webp',
    name: 'Piedra Hoja', icon: '🌿', price: 20000, unlockLv: 10, tier: 'rare',
    desc: 'Hace evolucionar a Gloom, Weepinbell, Exeggcute y Eevee.',
    type: 'stone', stoneType: 'leaf'
  },
  {
    id: 'piedra_luna', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/moon-stone.webp',
    name: 'Piedra Lunar', icon: '🌙', price: 20000, unlockLv: 10, tier: 'epic',
    desc: 'Hace evolucionar a Nidorina, Nidorino, Clefairy y Jigglypuff.',
    type: 'stone', stoneType: 'moon'
  },
  // ── ÍTEMS EQUIPABLES (held items) ──────────────────────────────────────────
  {
    id: 'exp_share', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-share.webp',
    name: 'Compartir EXP', icon: '🎒', price: 0, unlockLv: 5, tier: 'rare', market: false, trainerShop: true, bcPrice: 800,
    desc: 'Equipable. El portador gana EXP aunque no participe en batalla.',
    type: 'held', heldEffect: 'exp_share'
  },
  {
    id: 'leftovers', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leftovers.webp',
    name: 'Restos', icon: '🍖', price: 0, unlockLv: 10, tier: 'epic', market: false, trainerShop: true, bcPrice: 4500,
    desc: 'Equipable. El portador recupera 1/16 de su HP máx. cada turno.',
    type: 'held', heldEffect: 'leftovers'
  },
  {
    id: 'shell_bell', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/shell-bell.webp',
    name: 'Cascabel Concha', icon: '🔔', price: 0, unlockLv: 10, tier: 'epic', market: false, trainerShop: true, bcPrice: 4500,
    desc: 'Equipable. El portador recupera HP igual a 1/8 del daño infligido.',
    type: 'held', heldEffect: 'shell_bell'
  },
  {
    id: 'choice_band', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/choice-band.webp',
    name: 'Cinta Elegida', icon: '🎀', price: 0, unlockLv: 12, tier: 'legend', market: false, trainerShop: true, bcPrice: 4800,
    desc: 'Equipable. Aumenta 50% el Ataque, pero solo permite un movimiento.',
    type: 'held', heldEffect: 'choice_band'
  },
  {
    id: 'focus_sash', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/focus-sash.webp',
    name: 'Banda Focus', icon: '🎗️', price: 0, unlockLv: 15, tier: 'legend', market: false, trainerShop: true, bcPrice: 4200,
    desc: 'Equipable. Sobrevive con 1 HP si el portador tiene HP completo al recibir un golpe KO.',
    type: 'held', heldEffect: 'focus_sash'
  },
  {
    id: 'scope_lens', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/scope-lens.webp',
    name: 'Lente Zoom', icon: '🔍', price: 0, unlockLv: 8, tier: 'epic', market: false, trainerShop: true, bcPrice: 2400,
    desc: 'Equipable. Aumenta la tasa de golpe crítico del portador.',
    type: 'held', heldEffect: 'scope_lens'
  },
  // ── ESPECIALES / UTILITY ───────────────────────────────────────────────────
  {
    id: 'rare_candy', cat: 'utility', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.webp',
    name: 'Caramelo Raro', icon: '🍬', price: 0, unlockLv: 22, tier: 'epic', market: false, trainerShop: true, bcPrice: 2500,
    desc: 'Sube un nivel a cualquier Pokémon del equipo al instante.',
    type: 'usable'
  },
  {
    id: 'pp_up', cat: 'utility', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pp-up.webp',
    name: 'Subida de PP', icon: '📈', price: 0, unlockLv: 8, tier: 'epic', market: false, trainerShop: true, bcPrice: 1000,
    desc: 'Aumenta los PP máximos de un movimiento en un 20%.'
  },
  {
    id: 'lucky_egg', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucky-egg.webp',
    name: 'Huevo Suerte Pequeño', icon: '🥚', price: 0, unlockLv: 12, tier: 'legend', market: false, trainerShop: true, bcPrice: 2000,
    desc: 'Aumenta la EXP ganada en un 50% durante 30 minutos.',
    type: 'booster'
  },
  {
    id: 'repelente', cat: 'utility', market: false, trainerShop: true, bcPrice: 500, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/repel.webp',
    name: 'Repelente', icon: '🚫', price: 20000, unlockLv: 1, tier: 'common',
    desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo durante 10 min.'
  },
  {
    id: 'super_repel', cat: 'utility', market: false, trainerShop: true, bcPrice: 1000, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-repel.webp',
    name: 'Superrepelente', icon: '🚫', price: 40000, unlockLv: 3, tier: 'rare',
    desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo durante 20 min.'
  },
  {
    id: 'max_repel', cat: 'utility', market: false, trainerShop: true, bcPrice: 1500, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-repel.webp',
    name: 'Máximo Repelente', icon: '🚫', price: 60000, unlockLv: 22, tier: 'epic',
    desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo durante 30 min.'
  }
];

export const getItemByName = (name) => SHOP_ITEMS.find(i => i.name === name);
export const getItemById = (id) => SHOP_ITEMS.find(i => i.id === id);
