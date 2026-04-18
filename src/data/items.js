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
  },
  // ── FÓSILES ────────────────────────────────────────────────────────────────
  {
    id: 'helix_fossil', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/helix-fossil.webp',
    name: 'Fósil Hélix', icon: '🐚', price: 50000, unlockLv: 30, tier: 'rare', market: false, trainerShop: false,
    desc: 'Un fósil de un Pokémon marino antiguo. Parece un caracol.'
  },
  {
    id: 'dome_fossil', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dome-fossil.webp',
    name: 'Fósil Domo', icon: '🛡️', price: 50000, unlockLv: 30, tier: 'rare', market: false, trainerShop: false,
    desc: 'Un fósil de un Pokémon prehistórico con caparazón rígido.'
  },
  {
    id: 'old_amber', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/old-amber.webp',
    name: 'Ámbar Viejo', icon: '💎', price: 75000, unlockLv: 30, tier: 'rare', market: false, trainerShop: false,
    desc: 'Una pieza de ámbar que contiene material genético de un Pokémon volador antiguo.'
  },
  // ── VALUABLES ──────────────────────────────────────────────────────────────
  {
    id: 'nugget', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nugget.webp',
    name: 'Pepita', icon: '🟡', price: 5000, market: false, trainerShop: false, tier: 'rare',
    desc: 'Una pepita de oro puro. Se vende a buen precio.'
  },
  {
    id: 'pearl', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pearl.webp',
    name: 'Perla', icon: '⚪', price: 1000, market: false, trainerShop: false, tier: 'common',
    desc: 'Una perla pequeña. Se vende a buen precio.'
  },
  {
    id: 'big_pearl', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/big-pearl.webp',
    name: 'Perla Grande', icon: '🔘', price: 4000, market: false, trainerShop: false, tier: 'rare',
    desc: 'Una perla grande y hermosa. Se vende a muy buen precio.'
  },
  {
    id: 'stardust', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/stardust.webp',
    name: 'Polvo Estelar', icon: '✨', price: 1000, market: false, trainerShop: false, tier: 'common',
    desc: 'Arena roja muy fina. Se vende a buen precio.'
  },
  {
    id: 'star_piece', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/star-piece.webp',
    name: 'Trozo Estrella', icon: '⭐', price: 5000, market: false, trainerShop: false, tier: 'rare',
    desc: 'Un trozo de gema roja. Se vende a muy buen precio.'
  },
  // ── SPECIAL HELD ITEMS ─────────────────────────────────────────────────────
  {
    id: 'light_ball', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/light-ball.webp',
    name: 'Bola Luminosa', icon: '⚡', price: 5000, market: false, trainerShop: true, bcPrice: 1500, unlockLv: 8, tier: 'rare', type: 'held',
    desc: 'Equipado en Pikachu: Duplica su Ataque y At. Especial.'
  },
  {
    id: 'thick_club', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thick-club.webp',
    name: 'Hueso Grueso', icon: '🦴', price: 5000, market: false, trainerShop: true, bcPrice: 1500, unlockLv: 8, tier: 'rare', type: 'held',
    desc: 'Equipado en Cubone o Marowak: Duplica su Ataque.'
  },
  {
    id: 'stick', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/stick.webp',
    name: 'Palo', icon: '🎋', price: 2000, market: false, trainerShop: true, bcPrice: 800, unlockLv: 5, tier: 'common', type: 'held',
    desc: 'Equipado en Farfetch\'d: Aumenta mucho el ratio de críticos.'
  },
  {
    id: 'metal_powder', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/metal-powder.webp',
    name: 'Polvo Metálico', icon: '✨', price: 3000, market: false, trainerShop: true, bcPrice: 1000, unlockLv: 8, tier: 'rare', type: 'held',
    desc: 'Equipado en Ditto: Aumenta su Defensa un 50%.'
  },
  {
    id: 'twisted_spoon', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/twisted-spoon.webp',
    name: 'Cuchara Torcida', icon: '🥄', price: 2000, market: false, trainerShop: true, bcPrice: 500, unlockLv: 4, tier: 'common', type: 'held',
    desc: 'Equipado: Potencia ataques de tipo Psíquico (+20%).'
  },
  {
    id: 'spell_tag', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/spell-tag.webp',
    name: 'Hechizo', icon: '📜', price: 2000, market: false, trainerShop: true, bcPrice: 500, unlockLv: 4, tier: 'common', type: 'held',
    desc: 'Equipado: Potencia ataques de tipo Fantasma (+20%).'
  },
  // ── TICKETS & SCANNER ──────────────────────────────────────────────────────
  {
    id: 'ticket_articuno', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/eon-ticket.webp',
    name: 'Ticket Articuno', icon: '❄️', price: 0, market: false, trainerShop: false, tier: 'epic', type: 'booster',
    desc: 'Aumenta la probabilidad de que aparezca Articuno en las Islas Espuma (30 min).'
  },
  {
    id: 'ticket_mewtwo', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/eon-ticket.webp',
    name: 'Ticket Mewtwo', icon: '✨', price: 0, market: false, trainerShop: false, tier: 'legend', type: 'booster',
    desc: 'Aumenta la probabilidad de que aparezca Mewtwo en la Cueva Celeste (30 min).'
  },
  {
    id: 'iv_scanner', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-radar.webp',
    name: 'Escáner de IVs', icon: '🔍', price: 0, market: false, trainerShop: false, tier: 'epic', type: 'booster',
    desc: 'Revela los IVs totales de los Pokémon salvajes durante 1 hora.'
  },
  // ── TMs (MT01-MT50) ────────────────────────────────────────────────────────
  { id: 'tm01', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fighting.webp', name: 'MT01 Puño Certero', icon: '📀', price: 0, unlockLv: 15, tier: 'epic', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Puño Certero. Requiere concentración.' },
  { id: 'tm02', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dragon.webp', name: 'MT02 Garra Dragón', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Garra Dragón. Poderoso ataque de tipo Dragón.' },
  { id: 'tm03', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-water.webp', name: 'MT03 Hidropulso', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: false, bcPrice: 1500, desc: 'Enseña Hidropulso. Puede confundir al rival.' },
  { id: 'tm04', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.webp', name: 'MT04 Paz Mental', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: false, bcPrice: 1500, desc: 'Enseña Paz Mental. Sube At. Esp. y Def. Esp.' },
  { id: 'tm05', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT05 Rugido', icon: '📀', price: 0, unlockLv: 5, tier: 'common', market: false, trainerShop: true, bcPrice: 1000, desc: 'Enseña Rugido. Ahuyenta al rival.' },
  { id: 'tm06', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-poison.webp', name: 'MT06 Tóxico', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: false, bcPrice: 2500, desc: 'Enseña Tóxico. Envenena gravemente al rival.' },
  { id: 'tm07', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ice.webp', name: 'MT07 Granizo', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Granizo. Crea una tormenta de hielo.' },
  { id: 'tm08', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fighting.webp', name: 'MT08 Corpulencia', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Corpulencia. Sube Ataque y Defensa.' },
  { id: 'tm09', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-grass.webp', name: 'MT09 Recurrente', icon: '📀', price: 0, unlockLv: 8, tier: 'common', market: false, trainerShop: true, bcPrice: 1000, desc: 'Enseña Recurrente. Ataca 2-5 veces.' },
  { id: 'tm10', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT10 Poder Oculto', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Poder Oculto. El tipo varía según el Pokémon.' },
  { id: 'tm11', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fire.webp', name: 'MT11 Día Soleado', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Día Soleado. Despierta un sol radiante.' },
  { id: 'tm12', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dark.webp', name: 'MT12 Mofa', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Mofa. Impide movimientos de estado.' },
  { id: 'tm13', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ice.webp', name: 'MT13 Rayo Hielo', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Rayo Hielo. Puede congelar al rival.' },
  { id: 'tm14', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ice.webp', name: 'MT14 Ventisca', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Ventisca. Poderoso ataque de hielo.' },
  { id: 'tm15', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT15 Hiperrayo', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Hiperrayo. Potencia máxima, requiere descanso.' },
  { id: 'tm16', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.webp', name: 'MT16 Pantalla de Luz', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Pantalla Luz. Reduce daño especial.' },
  { id: 'tm17', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT17 Protección', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Protección. Evita ataques ese turno.' },
  { id: 'tm18', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-water.webp', name: 'MT18 Danza Lluvia', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Danza Lluvia. Invoca la lluvia.' },
  { id: 'tm19', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-grass.webp', name: 'MT19 Gigadrenado', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: false, bcPrice: 2500, desc: 'Enseña Gigadrenado. Roba vida al rival.' },
  { id: 'tm20', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT20 Velo Sagrado', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Velo Sagrado. Protege de estados.' },
  { id: 'tm21', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT21 Frustración', icon: '📀', price: 0, unlockLv: 5, tier: 'common', market: false, trainerShop: true, bcPrice: 1000, desc: 'Enseña Frustración. Más fuerte si te odia.' },
  { id: 'tm22', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-grass.webp', name: 'MT22 Rayo Solar', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 3500, desc: 'Enseña Rayo Solar. Tarda un turno en cargar.' },
  { id: 'tm23', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-steel.webp', name: 'MT23 Cola Férrea', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Cola Férrea. Puede bajar la defensa.' },
  { id: 'tm24', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-electric.webp', name: 'MT24 Rayo', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Rayo. Ataque eléctrico fiable.' },
  { id: 'tm25', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-electric.webp', name: 'MT25 Trueno', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Trueno. Máximo poder, poca precisión.' },
  { id: 'tm26', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ground.webp', name: 'MT26 Terremoto', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: false, bcPrice: 5000, desc: 'Enseña Terremoto. El mejor ataque de tierra.' },
  { id: 'tm27', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT27 Retribución', icon: '📀', price: 0, unlockLv: 5, tier: 'common', market: false, trainerShop: true, bcPrice: 1000, desc: 'Enseña Retribución. Más fuerte si te quiere.' },
  { id: 'tm28', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ground.webp', name: 'MT28 Excavar', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Excavar. Se oculta bajo tierra.' },
  { id: 'tm29', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.webp', name: 'MT29 Psíquico', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Psíquico. El mejor ataque psíquico.' },
  { id: 'tm30', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ghost.webp', name: 'MT30 Bola Sombra', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 3500, desc: 'Enseña Bola Sombra. Gran ataque de tipo Fantasma.' },
  { id: 'tm31', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fighting.webp', name: 'MT31 Demolición', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Demolición. Destruye pantallas.' },
  { id: 'tm32', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT32 Doble Equipo', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Doble Equipo. Sube la evasión.' },
  { id: 'tm33', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.webp', name: 'MT33 Reflejo', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Reflejo. Reduce daño físico.' },
  { id: 'tm34', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-electric.webp', name: 'MT34 Onda Voltio', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: false, bcPrice: 1500, desc: 'Enseña Onda Voltio. Nunca falla.' },
  { id: 'tm35', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fire.webp', name: 'MT35 Lanzallamas', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Lanzallamas. Ataque ígneo fiable.' },
  { id: 'tm36', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-poison.webp', name: 'MT36 Bomba Lodo', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 3500, desc: 'Enseña Bomba Lodo. Puede envenenar.' },
  { id: 'tm37', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-rock.webp', name: 'MT37 Tormenta de Arena', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña T. Arena. Tormenta de arena.' },
  { id: 'tm38', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fire.webp', name: 'MT38 Llamarada', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: false, bcPrice: 5000, desc: 'Enseña Llamarada. Máximo poder de fuego.' },
  { id: 'tm39', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-rock.webp', name: 'MT39 Tumba Rocas', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: false, bcPrice: 1500, desc: 'Enseña Tumba Rocas. Baja la velocidad.' },
  { id: 'tm40', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-flying.webp', name: 'MT40 Golpe Aéreo', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Golpe Aéreo. Nunca falla.' },
  { id: 'tm41', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dark.webp', name: 'MT41 Tormento', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Tormento. Impide repetir ataques.' },
  { id: 'tm42', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT42 Imagen', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Imagen. Se potencia con estados.' },
  { id: 'tm43', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT43 Daño Secreto', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Daño Secreto. Efecto según terreno.' },
  { id: 'tm44', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.webp', name: 'MT44 Descanso', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Descanso. Duerme y cura HP.' },
  { id: 'tm45', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.webp', name: 'MT45 Atracción', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Atracción. Enamora al rival.' },
  { id: 'tm46', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dark.webp', name: 'MT46 Ladrón', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Ladrón. Puede robar el item.' },
  { id: 'tm47', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-steel.webp', name: 'MT47 Ala de Acero', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Ala de Acero. Puede subir defensa.' },
  { id: 'tm48', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.webp', name: 'MT48 Intercambio', icon: '📀', price: 0, unlockLv: 22, tier: 'epic', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Intercambio. Cambia habilidades.' },
  { id: 'tm49', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dark.webp', name: 'MT49 Robo', icon: '📀', price: 0, unlockLv: 22, tier: 'epic', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Robo. Roba el efecto positivo.' },
  { id: 'tm50', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fire.webp', name: 'MT50 Sofoco', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Sofoco. Máximo poder, baja At. Esp.' }
];

export const getItemByName = (name) => SHOP_ITEMS.find(i => i.name === name);
export const getItemById = (id) => SHOP_ITEMS.find(i => i.id === id);
