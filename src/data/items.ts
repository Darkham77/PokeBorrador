/**
 * Database of all items in the game.
 * Migrated from public/js/08_shop.js and public/js/11_battle_ui.js
 */

export const ITEM_CATEGORIES = [
  'todos', 'raw_material', 'refined_material', 'component', 'pokeballs', 'potions', 'stones', 'combat_held', 'breeding_held', 'machinery', 'tools', 'tms', 'otros'
];

export const CATEGORY_LABELS = {
  todos: 'Todo',
  raw_material: 'Materia Prima',
  refined_material: 'Material Refinado',
  component: 'Componente',
  pokeballs: 'Pokéballs',
  potions: 'Curativos',
  stones: 'Piedras',
  combat_held: 'Combate',
  breeding_held: 'Crianza',
  machinery: 'Maquinaria',
  tools: 'Herramientas',
  tms: 'MTs',
  otros: 'Otros'
};

export const MARKET_CAT_ORDER = {
  pokeballs: 1,
  potions: 2,
  combat_held: 3,
  breeding_held: 4,
  tools: 5,
  machinery: 6,
  tms: 7,
  otros: 8
};

// What unlocks at each trainer level
export const MARKET_UNLOCKS = {
  3: ['Súper Ball', 'Súper Poción'],
  5: ['Red Ball', 'Ocaso Ball', 'Cura Total', 'Compartir EXP', 'MT27 Retribución'],
  8: ['Hiper Poción', 'Ultra Ball', 'Revivir', 'Lente Zoom', 'Subida de PP'],
  10: ['Turno Ball', 'Restos', 'Cascabel Concha', 'Piedras de Evolución'],
  12: ['Poción Máxima', 'Huevo Suerte Pequeño', 'Cinta Elegida', 'MT14 Ventisca'],
  15: ['Revivir Máximo', 'Elixir Máximo', 'Banda Focus'],
  22: ['Caramelo Raro'],
  25: ['Master Ball']
};

export const SHOP_ITEMS = [
  {
    id: 'berry_bronze', craftingTier: 0, cat: 'breeding_held', sprite: 'crafting/tier0/oran_berry', name: 'Baya de Bronce', icon: '🥉', price: 5000, bcPrice: 167, warPrice: 17, unlockLv: 5, tier: 'common', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Acorta el tiempo de la guardería un 10%. Solo un uso por ciclo.'
  },
  {
    id: 'berry_silver', craftingTier: 0, cat: 'breeding_held', sprite: 'crafting/tier0/sitrus_berry', name: 'Baya de Plata', icon: '🥈', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Acorta el tiempo de la guardería un 30%. Solo un uso por ciclo.'
  },
  {
    id: 'berry_gold', craftingTier: 0, cat: 'breeding_held', sprite: 'crafting/tier0/lum_berry', name: 'Baya de Oro', icon: '🥇', price: 25000, bcPrice: 834, warPrice: 84, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Acorta el tiempo de la guardería un 50%. Solo un uso por ciclo.'
  },
  {
    id: 'everstone', craftingTier: 3, cat: 'breeding_held', sprite: 'crafting/tier3/everstone', name: 'Piedra Eterna', icon: '🪨', price: 10000, bcPrice: 334, warPrice: 80, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Equipada en la guardería, asegura que la cría herede la naturaleza de este padre.'
  },
  {
    id: 'destiny_knot', craftingTier: 3, cat: 'breeding_held', sprite: 'crafting/tier3/destiny_knot', name: 'Lazo Destino', icon: '🧶', price: 144000, bcPrice: 4800, warPrice: 480, unlockLv: 20, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipado en la guardería, hace que la cría herede 5 IVs de los padres en lugar de 3.'
  },
  {
    id: 'vigor_restorer', craftingTier: 3, cat: 'breeding_held', sprite: 'crafting/tier3/rare_candy', name: 'Restaurador de Vigor', icon: '⚡', price: 50000, bcPrice: 1667, warPrice: 167, unlockLv: 10, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura el vigor de un Pokémon veterano para que pueda volver a criar. ¡Uso limitado!'
  },
  {
    id: 'power_weight', craftingTier: 3, cat: 'breeding_held', sprite: 'crafting/tier3/power_weight', name: 'Pesa Recia', icon: '🏋️', price: 45000, bcPrice: 1500, warPrice: 120, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de HP de este padre.'
  },
  {
    id: 'power_bracer', craftingTier: 3, cat: 'breeding_held', sprite: 'crafting/tier3/power_bracer', name: 'Brazal Recio', icon: '🥊', price: 45000, bcPrice: 1500, warPrice: 120, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de Ataque de este padre.'
  },
  {
    id: 'power_belt', craftingTier: 3, cat: 'breeding_held', sprite: 'crafting/tier3/power_belt', name: 'Cinto Recio', icon: '🛡️', price: 45000, bcPrice: 1500, warPrice: 120, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de Defensa de este padre.'
  },
  {
    id: 'power_lens', craftingTier: 3, cat: 'breeding_held', sprite: 'crafting/tier3/power_lens', name: 'Lente Recia', icon: '🔍', price: 45000, bcPrice: 1500, warPrice: 120, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de At. Especial de este padre.'
  },
  {
    id: 'power_band', craftingTier: 3, cat: 'breeding_held', sprite: 'crafting/tier3/power_band', name: 'Banda Recia', icon: '🎗️', price: 45000, bcPrice: 1500, warPrice: 120, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de Def. Especial de este padre.'
  },
  {
    id: 'power_anklet', craftingTier: 3, cat: 'breeding_held', sprite: 'crafting/tier3/power_anklet', name: 'Franja Recia', icon: '👢', price: 45000, bcPrice: 1500, warPrice: 120, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Equipado en la guardería, fuerza la herencia del IV de Velocidad de este padre.'
  },
  {
    id: 'pokeball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/poke_ball', name: 'Pokéball', icon: '⚪', price: 200, bcPrice: 7, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Captura Pokémon salvajes. Tasa de captura estándar.'
  },
  {
    id: 'great_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/great_ball', name: 'Súper Ball', icon: '🔵', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 3, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tasa de captura x1.5 respecto a la Pokéball normal.'
  },
  {
    id: 'ultra_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/ultra_ball', name: 'Ultra Ball', icon: '⚫', price: 1000, bcPrice: 34, warPrice: 4, unlockLv: 8, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tasa de captura x2. Alta efectividad contra Pokémon raros.'
  },
  {
    id: 'net_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/net_ball', name: 'Red Ball', icon: '🕸️', price: 800, bcPrice: 27, warPrice: 3, unlockLv: 5, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tasa de captura x3 contra Pokémon de tipo Agua o Bicho.'
  },
  {
    id: 'dusk_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/dusk_ball', name: 'Ocaso Ball', icon: '🌑', price: 800, bcPrice: 27, warPrice: 3, unlockLv: 5, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tasa de captura x3 en cuevas o de noche.'
  },
  {
    id: 'timer_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/timer_ball', name: 'Turno Ball', icon: '⏱️', price: 800, bcPrice: 27, warPrice: 3, unlockLv: 10, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tasa de captura que aumenta según turnos transcurridos.'
  },
  {
    id: 'master_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/master_ball', name: 'Master Ball', icon: '🟣', price: 100000, bcPrice: 3334, warPrice: 334, unlockLv: 25, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Captura cualquier Pokémon sin fallar. ¡Sin excepción!'
  },
  {
    id: 'potion', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/potion', name: 'Poción', icon: '🧪', price: 200, bcPrice: 7, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura 20 HP a un Pokémon.'
  },
  {
    id: 'super_potion', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/super_potion', name: 'Súper Poción', icon: '🔵', price: 600, bcPrice: 20, warPrice: 2, unlockLv: 3, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura 50 HP a un Pokémon.'
  },
  {
    id: 'hyper_potion', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/hyper_potion', name: 'Hiper Poción', icon: '🟣', price: 1500, bcPrice: 50, warPrice: 5, unlockLv: 8, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura 200 HP a un Pokémon.'
  },
  {
    id: 'max_potion', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/max_potion', name: 'Poción Máxima', icon: '💜', price: 2500, bcPrice: 84, warPrice: 9, unlockLv: 12, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura todo el HP de un Pokémon.'
  },
  {
    id: 'refresco', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/soda_pop', name: 'Refresco', icon: '🥤', price: 300, bcPrice: 10, warPrice: 1, unlockLv: 4, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura 60 HP a un Pokémon.'
  },
  {
    id: 'limonada', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/lemonade', name: 'Limonada', icon: '🍋', price: 350, bcPrice: 12, warPrice: 2, unlockLv: 5, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura 80 HP a un Pokémon.'
  },
  {
    id: 'revivir', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/revive', name: 'Revivir', icon: '❤️', price: 2000, bcPrice: 67, warPrice: 7, unlockLv: 8, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Revive a un Pokémon debilitado con la mitad del HP.'
  },
  {
    id: 'revivir_max', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/max_revive', name: 'Revivir Máximo', icon: '💖', price: 3000, bcPrice: 100, warPrice: 10, unlockLv: 15, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Revive a un Pokémon debilitado con el HP al máximo.'
  },
  {
    id: 'antidoto', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/antidote', name: 'Antídoto', icon: '💚', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cura el envenenamiento de un Pokémon.'
  },
  {
    id: 'quemadura', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/burn_heal', name: 'Cura Quemadura', icon: '🧊', price: 250, bcPrice: 9, warPrice: 1, unlockLv: 2, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cura la quemadura de un Pokémon.'
  },
  {
    id: 'despertar', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/awakening', name: 'Despertar', icon: '☕', price: 250, bcPrice: 9, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Despierta a un Pokémon dormido.'
  },
  {
    id: 'cura_total', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/full_heal', name: 'Cura Total', icon: '✨', price: 600, bcPrice: 20, warPrice: 2, unlockLv: 5, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cura todos los estados alterados de un Pokémon.'
  },
  {
    id: 'elixir', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/ether', name: 'Éter', icon: '💎', price: 1200, bcPrice: 40, warPrice: 4, unlockLv: 5, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura 10 PP de un movimiento.'
  },
  {
    id: 'elixir_item', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/elixir', name: 'Elixir', icon: '🧪', price: 3000, bcPrice: 100, warPrice: 10, unlockLv: 10, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura 10 PP de todos los movimientos.'
  },
  {
    id: 'elixir_max', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/max_elixir', name: 'Elixir Máximo', icon: '🌟', price: 4500, bcPrice: 150, warPrice: 15, unlockLv: 15, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura todos los PP de todos los movimientos.'
  },
  {
    id: 'fire_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/fire_stone', name: 'Piedra Fuego', icon: '🔥', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 10, tier: 'rare', type: 'stone', stoneType: 'fire', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Hace evolucionar a Vulpix, Growlithe, Eevee y otros Pokémon de Fuego.'
  },
  {
    id: 'water_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/water_stone', name: 'Piedra Agua', icon: '💧', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 10, tier: 'rare', type: 'stone', stoneType: 'water', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Hace evolucionar a Poliwhirl, Shellder, Staryu y Eevee.'
  },
  {
    id: 'thunder_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/thunder_stone', name: 'Piedra Trueno', icon: '⚡', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 10, tier: 'rare', type: 'stone', stoneType: 'thunder', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Hace evolucionar a Pikachu and Eevee.'
  },
  {
    id: 'leaf_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/leaf_stone', name: 'Piedra Hoja', icon: '🌿', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 10, tier: 'rare', type: 'stone', stoneType: 'leaf', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Hace evolucionar a Gloom, Weepinbell, Exeggcute y Eevee.'
  },
  {
    id: 'moon_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/moon_stone', name: 'Piedra Lunar', icon: '🌙', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 10, tier: 'epic', type: 'stone', stoneType: 'moon', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Hace evolucionar a Nidorina, Nidorino, Clefairy y Jigglypuff.'
  },
  {
    id: 'sun_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/sun_stone', name: 'Piedra Solar', icon: '☀️', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 10, tier: 'rare', type: 'stone', stoneType: 'sun', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Hace evolucionar a Gloom y Sunkern.'
  },
  {
    id: 'exp_share', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/exp_share', name: 'Compartir EXP', icon: '🎒', price: 24000, bcPrice: 800, warPrice: 80, unlockLv: 5, tier: 'rare', type: 'held', heldEffect: 'exp_share', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. El portador gana EXP aunque no participe en batalla.'
  },
  {
    id: 'leftovers', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/leftovers', name: 'Restos', icon: '🍖', price: 135000, bcPrice: 4500, warPrice: 450, unlockLv: 10, tier: 'epic', type: 'held', heldEffect: 'leftovers', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. El portador recupera 1/16 de su HP máx. cada turno.'
  },
  {
    id: 'shell_bell', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/shell_bell', name: 'Cascabel Concha', icon: '🔔', price: 135000, bcPrice: 4500, warPrice: 450, unlockLv: 10, tier: 'epic', type: 'held', heldEffect: 'shell_bell', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. El portador recupera HP igual a 1/8 del daño infligido.'
  },
  {
    id: 'choice_band', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/choice_band', name: 'Cinta Elegida', icon: '🎀', price: 144000, bcPrice: 4800, warPrice: 480, unlockLv: 12, tier: 'legend', type: 'held', heldEffect: 'choice_band', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Aumenta 50% el Ataque, pero solo permite un movimiento.'
  },
  {
    id: 'focus_sash', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/focus_sash', name: 'Banda Focus', icon: '🎗️', price: 126000, bcPrice: 4200, warPrice: 420, unlockLv: 15, tier: 'legend', type: 'held', heldEffect: 'focus_sash', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Sobrevive con 1 HP si el portador tiene HP completo al recibir un golpe KO.'
  },
  {
    id: 'scope_lens', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/scope_lens', name: 'Lente Zoom', icon: '🔍', price: 72000, bcPrice: 2400, warPrice: 240, unlockLv: 8, tier: 'epic', type: 'held', heldEffect: 'scope_lens', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Aumenta la tasa de golpe crítico del portador.'
  },
  {
    id: 'magnet', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/magnet', name: 'Imán', icon: '🧲', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 8, tier: 'rare', type: 'held', heldEffect: 'magnet', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipado: Potencia ataques de tipo Eléctrico (+20%).'
  },
  {
    id: 'rare_candy', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/rare_candy', name: 'Caramelo Raro', icon: '🍬', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 22, tier: 'epic', type: 'usable', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Sube un nivel a cualquier Pokémon del equipo al instante.'
  },
  {
    id: 'vigor_candy', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/rare_candy', name: 'Caramelo de vigor', icon: '⚡', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura 1 punto de vigor a un Pokémon.'
  },
  {
    id: 'move_relearner', craftingTier: 0, cat: 'otros', sprite: 'crafting/tier0/heart_scale', name: 'Recordador de Movimientos', icon: '🧠', price: 60000, bcPrice: 2000, warPrice: 200, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Permite a un Pokémon recordar un movimiento olvidado.'
  },
  {
    id: 'nature_patch', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/ability_capsule', name: 'Parche de naturaleza', icon: '🌿', price: 90000, bcPrice: 3000, warPrice: 300, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Permite cambiar la naturaleza de un Pokémon.'
  },
  {
    id: 'ability_pill', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/ability_capsule', name: 'Píldora de cambio de habilidad', icon: '💊', price: 90000, bcPrice: 3000, warPrice: 300, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Permite cambiar la habilidad de un Pokémon si tiene más de una.'
  },
  {
    id: 'ticket_shiny', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/eon_ticket', name: 'Ticket Shiny', icon: '✨', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 15, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Aumenta la probabilidad de encontrar Pokémon Variocolor durante 1 hora.'
  },
  {
    id: 'amulet_coin', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/amulet_coin', name: 'Moneda Amuleto', icon: '💰', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Duplica el dinero ganado en batallas durante 1 hora.'
  },
  {
    id: 'ticket_safari', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/eon_ticket', name: 'Ticket Safari', icon: '🦁', price: 60000, bcPrice: 2000, warPrice: 200, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Acceso especial o mejoras en la Zona Safari durante 30 min.'
  },
  {
    id: 'ticket_cerulean', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/eon_ticket', name: 'Ticket Cueva Celeste', icon: '🌌', price: 120000, bcPrice: 4000, warPrice: 400, unlockLv: 25, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Aumenta la probabilidad de raros en la Cueva Celeste durante 30 min.'
  },
  {
    id: 'incense_fire', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/luck_incense', name: 'Incienso Fuego', icon: '🔥', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Aumenta la aparición de Pokémon de tipo Fuego durante 30 min.'
  },
  {
    id: 'incense_water', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/luck_incense', name: 'Incienso Agua', icon: '💧', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Aumenta la aparición de Pokémon de tipo Agua durante 30 min.'
  },
  {
    id: 'incense_grass', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/luck_incense', name: 'Incienso Planta', icon: '🌿', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Aumenta la aparición de Pokémon de tipo Planta durante 30 min.'
  },
  {
    id: 'incense_normal', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/luck_incense', name: 'Incienso Normal', icon: '⚪', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Aumenta la aparición de Pokémon de tipo Normal durante 30 min.'
  },
  {
    id: 'incense_ghost', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/luck_incense', name: 'Incienso Fantasma', icon: '👻', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Aumenta la aparición de Pokémon de tipo Fantasma durante 30 min.'
  },
  {
    id: 'incense_psychic', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/luck_incense', name: 'Incienso Psíquico', icon: '🔮', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: false, showInWarShop: true,
    desc: 'Aumenta la aparición de Pokémon de tipo Psíquico durante 30 min.'
  },
  {
    id: 'pp_up', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/pp_up', name: 'Subida de PP', icon: '📈', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 8, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Aumenta los PP máximos de un movimiento en un 20%.'
  },
  {
    id: 'lucky_egg', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/lucky_egg', name: 'Huevo Suerte Pequeño', icon: '🥚', price: 60000, bcPrice: 2000, warPrice: 200, unlockLv: 12, tier: 'legend', type: 'booster', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Aumenta la EXP ganada en un 50% durante 30 minutos.'
  },
  {
    id: 'repel', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/repel', name: 'Repelente', icon: '🚫', price: 20000, bcPrice: 500, warPrice: 67, unlockLv: 1, tier: 'common', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo durante 10 min.'
  },
  {
    id: 'super_repel', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/super_repel', name: 'Superrepelente', icon: '🚫', price: 40000, bcPrice: 1000, warPrice: 134, unlockLv: 3, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo durante 20 min.'
  },
  {
    id: 'max_repel', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/max_repel', name: 'Máximo Repelente', icon: '🚫', price: 60000, bcPrice: 1500, warPrice: 200, unlockLv: 22, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo durante 30 min.'
  },
  {
    id: 'fishing_rod', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/fishing_rod_0', name: 'Caña de pescar', icon: '🎣', price: 15000, bcPrice: 1500, warPrice: 50, unlockLv: 1, tier: 'rare', type: 'usable', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sube mucho la pesca por 20 min. Ver % exacto en el mapa.'
  },
  {
    id: 'fishing_rod_good', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/fishing_rod_1', name: 'Caña Buena', icon: '🎣', price: 35000, bcPrice: 3500, warPrice: 117, unlockLv: 10, tier: 'rare', type: 'usable', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sube la pesca por 40 min y bonifica la aparición de Pokémon raros (+500 pts).'
  },
  {
    id: 'fishing_rod_super', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/fishing_rod_2', name: 'Supercaña', icon: '🎣', price: 65000, bcPrice: 6500, warPrice: 217, unlockLv: 20, tier: 'epic', type: 'usable', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sube la pesca por 60 min, bonifica raros (+1000 pts) y aumenta la chance de Shiny x1.5.'
  },
  {
    id: 'pickaxe', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/pickaxe_0', name: 'Pico de excavación', icon: '⛏️', price: 15000, bcPrice: 1500, warPrice: 50, unlockLv: 1, tier: 'rare', type: 'usable', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sube la arqueología por 20 min. Ver % exacto en el mapa.'
  },
  {
    id: 'pickaxe_silver', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/pickaxe_1', name: 'Pico Bueno', icon: '⛏️', price: 35000, bcPrice: 3500, warPrice: 117, unlockLv: 10, tier: 'rare', type: 'usable', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sube la arqueología por 40 min. Bonifica minerales y gemas (+500 pts).'
  },
  {
    id: 'pickaxe_gold', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/pickaxe_2', name: 'Superpico', icon: '⛏️', price: 65000, bcPrice: 6500, warPrice: 217, unlockLv: 20, tier: 'epic', type: 'usable', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sube la arqueología por 60 min. Bonifica minerales y gemas (+1000 pts).'
  },
  {
    id: 'brush', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/brush_0', name: 'Pincel de excavación', icon: '🖌️', price: 15000, bcPrice: 1500, warPrice: 50, unlockLv: 1, tier: 'rare', type: 'usable', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sube la arqueología por 20 min. Bonifica fósiles.'
  },
  {
    id: 'brush_good', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/brush_1', name: 'Pincel Bueno', icon: '🖌️', price: 35000, bcPrice: 3500, warPrice: 117, unlockLv: 10, tier: 'rare', type: 'usable', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sube la arqueología por 40 min. Bonifica fósiles (+500 pts).'
  },
  {
    id: 'brush_super', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/brush_2', name: 'Superpincel', icon: '🖌️', price: 65000, bcPrice: 6500, warPrice: 217, unlockLv: 20, tier: 'epic', type: 'usable', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sube la arqueología por 60 min. Bonifica fósiles (+1000 pts).'
  },
  {
    id: 'helix_fossil', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/helix_fossil', name: 'Fósil Hélix', icon: '🐚', price: 50000, bcPrice: 2000, warPrice: 167, unlockLv: 30, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Un fósil de un Pokémon marino antiguo. Parece un caracol.'
  },
  {
    id: 'dome_fossil', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/dome_fossil', name: 'Fósil Domo', icon: '🛡️', price: 50000, bcPrice: 2000, warPrice: 167, unlockLv: 30, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Un fósil de un Pokémon prehistórico con caparazón rígido.'
  },
  {
    id: 'old_amber', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/old_amber', name: 'Ámbar Viejo', icon: '💎', price: 75000, bcPrice: 3000, warPrice: 250, unlockLv: 30, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Una pieza de ámbar que contiene material genético de un Pokémon volador antiguo.'
  },
  {
    id: 'nugget', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/nugget', name: 'Pepita', icon: '🟡', price: 5000, bcPrice: 167, warPrice: 17, unlockLv: 1, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Una pepita de oro puro. Se vende a buen precio.'
  },
  {
    id: 'pearl', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pearl', name: 'Perla', icon: '⚪', price: 1000, bcPrice: 34, warPrice: 4, unlockLv: 1, tier: 'common', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Una perla pequeña. Se vende a buen precio.'
  },
  {
    id: 'big_pearl', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/big_pearl', name: 'Perla Grande', icon: '🔘', price: 4000, bcPrice: 134, warPrice: 14, unlockLv: 1, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Una perla grande y hermosa. Se vende a muy buen precio.'
  },
  {
    id: 'stardust', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/stardust', name: 'Polvo Estelar', icon: '✨', price: 1000, bcPrice: 34, warPrice: 4, unlockLv: 1, tier: 'common', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Arena roja muy fina. Se vende a buen precio.'
  },
  {
    id: 'star_piece', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/star_piece', name: 'Trozo Estrella', icon: '⭐', price: 5000, bcPrice: 167, warPrice: 17, unlockLv: 1, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Un trozo de gema roja. Se vende a muy buen precio.'
  },
  {
    id: 'coal_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/coal_ore', name: 'Mineral de Carbón', icon: '🪨', price: 200, bcPrice: 10, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Un trozo de carbón mineral natural obtenido mediante excavación.'
  },
  {
    id: 'copper_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/copper_ore', name: 'Mineral de Cobre', icon: '🟫', price: 600, bcPrice: 20, warPrice: 2, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Una roca con vetas de cobre natural. Se vende tal cual o se purifica.'
  },
  {
    id: 'iron_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/iron_ore', name: 'Mineral de Hierro', icon: '🧱', price: 1200, bcPrice: 40, warPrice: 4, unlockLv: 3, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Roca rica en hierro natural sin refinar.'
  },
  {
    id: 'silver_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/silver_ore', name: 'Mineral de Plata', icon: '⬜', price: 3000, bcPrice: 100, warPrice: 10, unlockLv: 5, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Plata en su estado mineral bruto. Muy valorada en el mercado.'
  },
  {
    id: 'gold_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/gold_ore', name: 'Mineral de Oro', icon: '🟨', price: 6000, bcPrice: 200, warPrice: 20, unlockLv: 8, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Veta natural de oro en bruto. Muy codiciada.'
  },
  {
    id: 'tungsten_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/tungsten_ore', name: 'Mineral de Wolframio', icon: '🌑', price: 2000, bcPrice: 70, warPrice: 7, unlockLv: 8, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Mineral de tungsteno/wolframio pesado y denso en su estado natural.'
  },
  {
    id: 'uranium_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/uranium_ore', name: 'Mineral de Uranio', icon: '🟢', price: 6000, bcPrice: 200, warPrice: 20, unlockLv: 12, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Mineral de uranio natural con un brillo verdoso misterioso.'
  },
  {
    id: 'rubi_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/ruby_ore', name: 'Mineral de Rubí', icon: '🔺', price: 3000, bcPrice: 100, warPrice: 10, unlockLv: 10, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Roca que incrusta un rubí en bruto sin tallar.'
  },
  {
    id: 'zaphire_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/sapphire_ore', name: 'Mineral de Zafiro', icon: '🔹', price: 3000, bcPrice: 100, warPrice: 10, unlockLv: 10, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Roca que incrusta un zafiro en bruto sin tallar.'
  },
  {
    id: 'emmerald_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/emerald_ore', name: 'Mineral de Esmeralda', icon: '💚', price: 6000, bcPrice: 200, warPrice: 20, unlockLv: 15, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Roca que incrusta una esmeralda en bruto sin tallar.'
  },
  {
    id: 'topaz_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/topaz_ore', name: 'Mineral de Topacio', icon: '🟡', price: 3000, bcPrice: 100, warPrice: 10, unlockLv: 10, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Roca que incrusta un topacio en bruto sin tallar.'
  },
  {
    id: 'diamond_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/diamond_ore', name: 'Mineral de Diamante', icon: '💎', price: 12000, bcPrice: 400, warPrice: 40, unlockLv: 20, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Un mineral extremadamente resistente que incrusta un diamante en bruto.'
  },
  {
    id: 'copper', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/copper', name: 'Lingote de Cobre', icon: '🟫', price: 1500, bcPrice: 50, warPrice: 5, unlockLv: 5, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cobre purificado y fundido en un lingote brillante.'
  },
  {
    id: 'iron', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/iron', name: 'Lingote de Hierro', icon: '🧱', price: 3000, bcPrice: 100, warPrice: 10, unlockLv: 8, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Hierro refinado de alta resistencia listo para fundición.'
  },
  {
    id: 'silver', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/silver', name: 'Lingote de Plata', icon: '⬜', price: 7500, bcPrice: 250, warPrice: 25, unlockLv: 10, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Plata pura refinada con acabado brillante. De alto valor.'
  },
  {
    id: 'gold', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/gold', name: 'Lingote de Oro', icon: '🟨', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 12, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Oro puro refinado de 24 quilates fundido en un lingote.'
  },
  {
    id: 'tungsten', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tungsten', name: 'Lingote de Wolframio', icon: '🌑', price: 5000, bcPrice: 180, warPrice: 17, unlockLv: 12, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Wolframio purificado de altísima densidad.'
  },
  {
    id: 'uranium', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/uranium', name: 'Lingote de Uranio', icon: '🟢', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 18, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Lingote purificado de uranio denso y ligeramente brillante.'
  },
  {
    id: 'rubi', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/ruby', name: 'Rubí Pulido', icon: '🔴', price: 7500, bcPrice: 250, warPrice: 25, unlockLv: 15, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Un hermoso rubí tallado y pulido de color rojo intenso.'
  },
  {
    id: 'zaphire', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/sapphire', name: 'Zafiro Pulido', icon: '🔵', price: 7500, bcPrice: 250, warPrice: 25, unlockLv: 15, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Un hermoso zafiro tallado y pulido de color azul profundo.'
  },
  {
    id: 'emmerald', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/emerald', name: 'Esmeralda Pulida', icon: '🟢', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 20, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Una hermosa esmeralda tallada y pulida de color verde brillante.'
  },
  {
    id: 'topaz', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/topaz', name: 'Topacio Pulido', icon: '🟡', price: 7500, bcPrice: 250, warPrice: 25, unlockLv: 15, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Un hermoso topacio tallado y pulido con destellos dorados.'
  },
  {
    id: 'diamond', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/diamond', name: 'Diamante Pulido', icon: '💎', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 25, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Un diamante perfectamente facetado y pulido que refleja la luz.'
  },
  {
    id: 'light_ball', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/light_ball', name: 'Bola Luminosa', icon: '⚡', price: 5000, bcPrice: 1500, warPrice: 17, unlockLv: 8, tier: 'rare', type: 'held', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipado en Pikachu: Duplica su Ataque y At. Especial.'
  },
  {
    id: 'thick_club', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/thick_club', name: 'Hueso Grueso', icon: '🦴', price: 5000, bcPrice: 1500, warPrice: 17, unlockLv: 8, tier: 'rare', type: 'held', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipado en Cubone o Marowak: Duplica su Ataque.'
  },
  {
    id: 'stick', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/stick', name: 'Palo', icon: '🎋', price: 2000, bcPrice: 800, warPrice: 7, unlockLv: 5, tier: 'common', type: 'held', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipado en Farfetch\'d: Aumenta mucho el ratio de críticos.'
  },
  {
    id: 'metal_powder', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/metal_powder', name: 'Polvo Metálico', icon: '✨', price: 3000, bcPrice: 1000, warPrice: 10, unlockLv: 8, tier: 'rare', type: 'held', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipado en Ditto: Aumenta su Defensa un 50%.'
  },
  {
    id: 'twisted_spoon', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/twisted_spoon', name: 'Cuchara Torcida', icon: '🥄', price: 2000, bcPrice: 500, warPrice: 7, unlockLv: 4, tier: 'common', type: 'held', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipado: Potencia ataques de tipo Psíquico (+20%).'
  },
  {
    id: 'spell_tag', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/spell_tag', name: 'Hechizo', icon: '📜', price: 2000, bcPrice: 500, warPrice: 7, unlockLv: 4, tier: 'common', type: 'held', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Equipado: Potencia ataques de tipo Fantasma (+20%).'
  },
  {
    id: 'ticket_articuno', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/eon_ticket', name: 'Ticket Articuno', icon: '❄️', price: 0, bcPrice: 0, warPrice: 0, unlockLv: 1, tier: 'epic', type: 'booster', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Aumenta la probabilidad de que aparezca Articuno en las Islas Espuma (30 min).'
  },
  {
    id: 'ticket_mewtwo', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/eon_ticket', name: 'Ticket Mewtwo', icon: '✨', price: 0, bcPrice: 0, warPrice: 0, unlockLv: 1, tier: 'legend', type: 'booster', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Aumenta la probabilidad de que aparezca Mewtwo en la Cueva Celeste (30 min).'
  },
  {
    id: 'iv_scanner', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/poke_radar', name: 'Escáner de IVs', icon: '🔍', price: 0, bcPrice: 0, warPrice: 0, unlockLv: 1, tier: 'epic', type: 'booster', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Revela los IVs totales de los Pokémon salvajes durante 1 hora.'
  },
  {
    id: 'tm01', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_fighting', name: 'MT01 Puño Certero', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 15, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Puño Certero. Requiere concentración.'
  },
  {
    id: 'tm02', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_dragon', name: 'MT02 Garra Dragón', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 12, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Garra Dragón. Poderoso ataque de tipo Dragón.'
  },
  {
    id: 'tm03', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_water', name: 'MT03 Pulso Agua', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Pulso Agua. Puede confundir al rival.'
  },
  {
    id: 'tm04', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_psychic', name: 'MT04 Paz Mental', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Paz Mental. Sube At. Esp. y Def. Esp.'
  },
  {
    id: 'tm05', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT05 Rugido', icon: '📀', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 5, tier: 'common', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Rugido. Ahuyenta al rival.'
  },
  {
    id: 'tm06', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_poison', name: 'MT06 Tóxico', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Tóxico. Envenena gravemente al rival.'
  },
  {
    id: 'tm07', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_ice', name: 'MT07 Granizo', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Granizo. Crea una tormenta de hielo.'
  },
  {
    id: 'tm08', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_fighting', name: 'MT08 Corpulencia', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Corpulencia. Sube Ataque y Defensa.'
  },
  {
    id: 'tm09', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_grass', name: 'MT09 Recurrente', icon: '📀', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 8, tier: 'common', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Recurrente. Ataca 2-5 veces.'
  },
  {
    id: 'tm10', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT10 Poder Oculto', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Poder Oculto. El tipo varía según el Pokémon.'
  },
  {
    id: 'tm11', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_fire', name: 'MT11 Día Soleado', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Día Soleado. Despierta un sol radiante.'
  },
  {
    id: 'tm12', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_dark', name: 'MT12 Mofa', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Mofa. Impide movimientos de estado.'
  },
  {
    id: 'tm13', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_ice', name: 'MT13 Rayo Hielo', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 20, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Rayo Hielo. Puede congelar al rival.'
  },
  {
    id: 'tm14', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_ice', name: 'MT14 Ventisca', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 25, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Ventisca. Poderoso ataque de hielo.'
  },
  {
    id: 'tm15', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT15 Hiperrayo', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 25, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Hiperrayo. Potencia máxima, requiere descanso.'
  },
  {
    id: 'tm16', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_psychic', name: 'MT16 Pantalla de Luz', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Pantalla Luz. Reduce daño especial.'
  },
  {
    id: 'tm17', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT17 Protección', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Protección. Evita ataques ese turno.'
  },
  {
    id: 'tm18', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_water', name: 'MT18 Danza Lluvia', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Danza Lluvia. Invoca la lluvia.'
  },
  {
    id: 'tm19', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_grass', name: 'MT19 Gigadrenado', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 15, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Gigadrenado. Roba vida al rival.'
  },
  {
    id: 'tm20', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT20 Velo Sagrado', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Velo Sagrado. Protege de estados.'
  },
  {
    id: 'tm21', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT21 Frustración', icon: '📀', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 5, tier: 'common', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Frustración. Más fuerte si te odia.'
  },
  {
    id: 'tm22', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_grass', name: 'MT22 Rayo Solar', icon: '📀', price: 105000, bcPrice: 3500, warPrice: 350, unlockLv: 20, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Rayo Solar. Tarda un turno en cargar.'
  },
  {
    id: 'tm23', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_steel', name: 'MT23 Cola Férrea', icon: '📀', price: 60000, bcPrice: 2000, warPrice: 200, unlockLv: 12, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Cola Férrea. Puede bajar la defensa.'
  },
  {
    id: 'tm24', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_electric', name: 'MT24 Rayo', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 20, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Rayo. Ataque eléctrico fiable.'
  },
  {
    id: 'tm25', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_electric', name: 'MT25 Trueno', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 25, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Trueno. Máximo poder, poca precisión.'
  },
  {
    id: 'tm26', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_ground', name: 'MT26 Terremoto', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 25, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Terremoto. El mejor ataque de tierra.'
  },
  {
    id: 'tm27', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT27 Retribución', icon: '📀', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 5, tier: 'common', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Retribución. Más fuerte si te quiere.'
  },
  {
    id: 'tm28', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_ground', name: 'MT28 Excavar', icon: '📀', price: 60000, bcPrice: 2000, warPrice: 200, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Excavar. Se oculta bajo tierra.'
  },
  {
    id: 'tm29', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_psychic', name: 'MT29 Psíquico', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 20, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Psíquico. El mejor ataque psíquico.'
  },
  {
    id: 'tm30', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_ghost', name: 'MT30 Bola Sombra', icon: '📀', price: 105000, bcPrice: 3500, warPrice: 350, unlockLv: 15, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Bola Sombra. Gran ataque de tipo Fantasma.'
  },
  {
    id: 'tm31', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_fighting', name: 'MT31 Demolición', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 12, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Demolición. Destruye pantallas.'
  },
  {
    id: 'tm32', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT32 Doble Equipo', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Doble Equipo. Sube la evasión.'
  },
  {
    id: 'tm33', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_psychic', name: 'MT33 Reflejo', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Reflejo. Reduce daño físico.'
  },
  {
    id: 'tm34', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_electric', name: 'MT34 Onda Voltio', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 12, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Onda Voltio. Nunca falla.'
  },
  {
    id: 'tm35', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_fire', name: 'MT35 Lanzallamas', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 20, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Lanzallamas. Ataque ígneo fiable.'
  },
  {
    id: 'tm36', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_poison', name: 'MT36 Bomba Lodo', icon: '📀', price: 105000, bcPrice: 3500, warPrice: 350, unlockLv: 15, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Bomba Lodo. Puede envenenar.'
  },
  {
    id: 'tm37', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_rock', name: 'MT37 Tormenta de Arena', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 15, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña T. Arena. Tormenta de arena.'
  },
  {
    id: 'tm38', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_fire', name: 'MT38 Llamarada', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 25, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Llamarada. Máximo poder de fuego.'
  },
  {
    id: 'tm39', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_rock', name: 'MT39 Tumba Rocas', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 12, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Tumba Rocas. Baja la velocidad.'
  },
  {
    id: 'tm40', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_flying', name: 'MT40 Golpe Aéreo', icon: '📀', price: 60000, bcPrice: 2000, warPrice: 200, unlockLv: 15, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Golpe Aéreo. Nunca falla.'
  },
  {
    id: 'tm41', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_dark', name: 'MT41 Tormento', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 15, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Tormento. Impide repetir ataques.'
  },
  {
    id: 'tm42', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT42 Imagen', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 15, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Imagen. Se potencia con estados.'
  },
  {
    id: 'tm43', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT43 Daño Secreto', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 15, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Daño Secreto. Efecto según terreno.'
  },
  {
    id: 'tm44', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_psychic', name: 'MT44 Descanso', icon: '📀', price: 60000, bcPrice: 2000, warPrice: 200, unlockLv: 20, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Descanso. Duerme y cura HP.'
  },
  {
    id: 'tm45', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_normal', name: 'MT45 Atracción', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 15, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Atracción. Enamora al rival.'
  },
  {
    id: 'tm46', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_dark', name: 'MT46 Ladrón', icon: '📀', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Ladrón. Puede robar el item.'
  },
  {
    id: 'tm47', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_steel', name: 'MT47 Ala de Acero', icon: '📀', price: 60000, bcPrice: 2000, warPrice: 200, unlockLv: 12, tier: 'rare', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Ala de Acero. Puede subir defensa.'
  },
  {
    id: 'tm48', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_psychic', name: 'MT48 Intercambio', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 22, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Intercambio. Cambia habilidades.'
  },
  {
    id: 'tm49', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_dark', name: 'MT49 Robo', icon: '📀', price: 75000, bcPrice: 2500, warPrice: 250, unlockLv: 22, tier: 'epic', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Robo. Roba el efecto positivo.'
  },
  {
    id: 'tm50', craftingTier: 3, cat: 'tms', sprite: 'crafting/tier3/tm_fire', name: 'MT50 Sofoco', icon: '📀', price: 150000, bcPrice: 5000, warPrice: 500, unlockLv: 25, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Enseña Sofoco. Máximo poder, baja At. Esp.'
  },
  {
    id: 'acid', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/acid', name: 'Ácido', icon: '🧪', price: 350, bcPrice: 12, warPrice: 2, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Frasco con sustancia ácida corrosiva, usada en procesos químicos de refinamiento.'
  },
  {
    id: 'apricorn_blue', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/apricorn_blue', name: 'Bonguri Azul', icon: '🔵', price: 150, bcPrice: 5, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Fruto silvestre de cáscara dura, usado tradicionalmente para fabricar Pokéballs artesanales.'
  },
  {
    id: 'apricorn_red', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/apricorn_red', name: 'Bonguri Rojo', icon: '🔴', price: 150, bcPrice: 5, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Fruto silvestre de cáscara dura, usado tradicionalmente para fabricar Pokéballs artesanales.'
  },
  {
    id: 'apricorn_yellow', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/apricorn_yellow', name: 'Bonguri Amarillo', icon: '🟡', price: 150, bcPrice: 5, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Fruto silvestre de cáscara dura, usado tradicionalmente para fabricar Pokéballs artesanales.'
  },
  {
    id: 'berry_sugar', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/berry_sugar', name: 'Azúcar de Baya', icon: '🍬', price: 120, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Azúcar refinado a partir de bayas silvestres, ideal para endulzar platillos.'
  },
  {
    id: 'bone_fragment', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/bone_fragment', name: 'Fragmento de Hueso', icon: '🦴', price: 180, bcPrice: 6, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Fragmento de hueso antiguo y resistente, utilizado para herramientas y artesanías.'
  },
  {
    id: 'broccoli', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/broccoli', name: 'Brócoli', icon: '🥦', price: 80, bcPrice: 3, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Ingrediente fresco y nutritivo para cocinar deliciosas recetas en la olla.'
  },
  {
    id: 'carrot', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/carrot', name: 'Zanahoria', icon: '🥕', price: 80, bcPrice: 3, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Ingrediente fresco y nutritivo para cocinar deliciosas recetas en la olla.'
  },
  {
    id: 'cloth', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/cloth', name: 'Tela', icon: '🧶', price: 250, bcPrice: 9, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Retazo de tela resistente de algodón, útil para bolsas y vestimentas básicas.'
  },
  {
    id: 'combee_honey', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/combee_honey', name: 'Miel de Combee', icon: '🍯', price: 300, bcPrice: 10, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Miel natural y extremadamente dulce producida por Combee, ideal para atraer Pokémon.'
  },
  {
    id: 'dawn_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/dawn_stone', name: 'Piedra Alba', icon: '✨', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Piedra evolutiva especial que induce la evolución en ciertas especies de Pokémon.'
  },
  {
    id: 'dusk_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/dusk_stone', name: 'Piedra Crepúsculo', icon: '🌑', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Piedra evolutiva especial que induce la evolución en ciertas especies de Pokémon.'
  },
  {
    id: 'electronic_scrap', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/electronic_scrap', name: 'Chatarra Electrónica', icon: '⚙️', price: 400, bcPrice: 14, warPrice: 2, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Chatarra electrónica recuperada de dispositivos rotos, útil para componentes simples.'
  },
  {
    id: 'energy_powder', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/energy_powder', name: 'Polvo Energía', icon: '💊', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Polvo medicinal amargo que restaura energía pero reduce la amistad del Pokémon.'
  },
  {
    id: 'food_scraps', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/food_scraps', name: 'Sobras de Comida', icon: '🍎', price: 120, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sobras de comida utilizables para cocinar o alimentar Pokémon.'
  },
  {
    id: 'fresh_water', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/fresh_water', name: 'Agua Fresca', icon: '🥤', price: 200, bcPrice: 7, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Agua mineral pura, excelente hidratante.'
  },
  {
    id: 'herb_rare', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/herb_rare', name: 'Hierba Rara', icon: '🌿', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Hierba silvestre rara con potentes propiedades curativas y químicas.'
  },
  {
    id: 'ice_crystal', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/ice_crystal', name: 'Cristal de Hielo', icon: '❄️', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cristal de hielo perenne que no se derrite a temperatura ambiente.'
  },
  {
    id: 'ice_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/ice_stone', name: 'Piedra Hielo', icon: '❄️', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Piedra evolutiva especial que induce la evolución en ciertas especies de Pokémon.'
  },
  {
    id: 'leather_strip', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/leather_strip', name: 'Tira de Cuero', icon: '💼', price: 300, bcPrice: 10, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tira de cuero curtido y flexible, ideal para ataduras y empuñaduras de herramientas.'
  },
  {
    id: 'lettuce', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/lettuce', name: 'Lechuga', icon: '🥬', price: 80, bcPrice: 3, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Ingrediente fresco y nutritivo para cocinar deliciosas recetas en la olla.'
  },
  {
    id: 'liechi_berry', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/liechi_berry', name: 'Baya Lichi', icon: '🍒', price: 1000, bcPrice: 34, warPrice: 4, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Baya rara y valiosa con propiedades potenciadoras especiales.'
  },
  {
    id: 'metal_scrap', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/metal_scrap', name: 'Chatarra de Metal', icon: '⚙️', price: 350, bcPrice: 12, warPrice: 2, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Trozo de chatarra metálica, reciclable en lingotes u otros objetos mecánicos.'
  },
  {
    id: 'mushroom', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/mushroom', name: 'Champiñón', icon: '🍄', price: 80, bcPrice: 3, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Ingrediente fresco y nutritivo para cocinar deliciosas recetas en la olla.'
  },
  {
    id: 'nickel_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/nickel_ore', name: 'Mineral de Níquel', icon: '🪨', price: 1000, bcPrice: 34, warPrice: 4, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Mineral de níquel denso obtenido mediante excavación.'
  },
  {
    id: 'oil', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/oil', name: 'Aceite', icon: '🛢️', price: 300, bcPrice: 10, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Aceite lubricante natural, ideal para el mantenimiento de maquinaria.'
  },
  {
    id: 'onion', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/onion', name: 'Cebolla', icon: '🧅', price: 80, bcPrice: 3, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Ingrediente fresco y nutritivo para cocinar deliciosas recetas en la olla.'
  },
  {
    id: 'pecha_berry_wild', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pecha_berry_wild', name: 'Baya Meloc Silvestre', icon: '🍑', price: 300, bcPrice: 10, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Baya silvestre dulce con propiedades curativas contra el veneno.'
  },
  {
    id: 'petrified_sap', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/petrified_sap', name: 'Savia Petrificada', icon: '💎', price: 400, bcPrice: 14, warPrice: 2, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Savia fosilizada y endurecida por el tiempo.'
  },
  {
    id: 'pigment_black', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pigment_black', name: 'Pigmento Negro', icon: '⚫', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pigmento concentrado de carbón para teñir o pintar.'
  },
  {
    id: 'pigment_blue', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pigment_blue', name: 'Pigmento Azul', icon: '🔵', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pigmento concentrado mineral para teñir o pintar.'
  },
  {
    id: 'pigment_green', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pigment_green', name: 'Pigmento Verde', icon: '🟢', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pigmento concentrado vegetal para teñir o pintar.'
  },
  {
    id: 'pigment_orange', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pigment_orange', name: 'Pigmento Naranja', icon: '🟠', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pigmento concentrado cítrico para teñir o pintar.'
  },
  {
    id: 'pigment_purple', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pigment_purple', name: 'Pigmento Morado', icon: '🟣', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pigmento concentrado floral para teñir o pintar.'
  },
  {
    id: 'pigment_red', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pigment_red', name: 'Pigmento Rojo', icon: '🔴', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pigmento concentrado de arcilla para teñir o pintar.'
  },
  {
    id: 'pigment_white', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pigment_white', name: 'Pigmento Blanco', icon: '⚪', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pigmento concentrado de tiza para teñir o pintar.'
  },
  {
    id: 'pigment_yellow', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/pigment_yellow', name: 'Pigmento Amarillo', icon: '🟡', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pigmento concentrado de polen para teñir o pintar.'
  },
  {
    id: 'potato', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/potato', name: 'Patata', icon: '🥔', price: 80, bcPrice: 3, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Ingrediente fresco y nutritivo para cocinar deliciosas recetas en la olla.'
  },
  {
    id: 'revive_root', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/revive_root', name: 'Raíz de Revivir', icon: '🌱', price: 800, bcPrice: 27, warPrice: 3, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Raíz medicinal amarga que revive a un Pokémon debilitado.'
  },
  {
    id: 'rubber_compound', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/rubber_compound', name: 'Compuesto de Goma', icon: '🪵', price: 300, bcPrice: 10, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Compuesto flexible y aislante obtenido del látex natural.'
  },
  {
    id: 'salac_berry', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/salac_berry', name: 'Baya Salac', icon: '🍇', price: 1000, bcPrice: 34, warPrice: 4, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Baya rara y valiosa con propiedades potenciadoras especiales.'
  },
  {
    id: 'sand_silica', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/sand_silica', name: 'Arena de Sílice', icon: '⏳', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Arena de sílice pura, materia prima fundamental para la fabricación de vidrio.'
  },
  {
    id: 'saw_dust', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/saw_dust', name: 'Serrín', icon: '🧹', price: 50, bcPrice: 2, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Serrín fino obtenido del corte de madera, utilizado como absorbente o aglomerante.'
  },
  {
    id: 'shiny_stone', craftingTier: 0, cat: 'stones', sprite: 'crafting/tier0/shiny_stone', name: 'Piedra Día', icon: '✨', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Piedra evolutiva especial que induce la evolución en ciertas especies de Pokémon.'
  },
  {
    id: 'sweet_sap', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/sweet_sap', name: 'Savia Dulce', icon: '🍯', price: 200, bcPrice: 7, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Savia dulce extraída de árboles, muy codiciada por Pokémon de tipo Bicho.'
  },
  {
    id: 'tiny_mushroom', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/tiny_mushroom', name: 'Mini Champiñón', icon: '🍄', price: 40, bcPrice: 2, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Ingrediente fresco y nutritivo para cocinar deliciosas recetas en la olla.'
  },
  {
    id: 'tin_ore', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/tin_ore', name: 'Mineral de Estaño', icon: '🪨', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Mineral de estaño bruto extraído de excavaciones.'
  },
  {
    id: 'tomato', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/tomato', name: 'Tomate', icon: '🍅', price: 80, bcPrice: 3, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Ingrediente fresco y nutritivo para cocinar deliciosas recetas en la olla.'
  },
  {
    id: 'wood', craftingTier: 0, cat: 'raw_material', sprite: 'crafting/tier0/wood', name: 'Madera', icon: '🪵', price: 150, bcPrice: 5, warPrice: 1, unlockLv: 1, tier: 'common', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Madera básica recolectada de árboles, utilizada en construcciones simples y mangos de herramientas.'
  },
  {
    id: 'bronze_alloy', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/bronze_alloy', name: 'Aleación de Bronce', icon: '📦', price: 2000, bcPrice: 67, warPrice: 7, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Aleación de cobre y estaño, resistente a la corrosión.'
  },
  {
    id: 'chemical_base', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/chemical_base', name: 'Base Química', icon: '📦', price: 1200, bcPrice: 40, warPrice: 4, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Solución química neutral utilizada como solvente base para compuestos médicos.'
  },
  {
    id: 'coal', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/coal', name: 'Carbón Refinado', icon: '📦', price: 800, bcPrice: 27, warPrice: 3, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Carbón refinado y purificado para un alto poder calorífico.'
  },
  {
    id: 'electrum_alloy', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/electrum_alloy', name: 'Aleación de Electrum', icon: '📦', price: 12000, bcPrice: 400, warPrice: 40, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Aleación noble de oro y plata con excelente conductividad eléctrica.'
  },
  {
    id: 'glass_bottle', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/glass_bottle', name: 'Botella de Vidrio', icon: '📦', price: 400, bcPrice: 14, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Botella de vidrio vacía lista para contener líquidos o pociones químicas.'
  },
  {
    id: 'hardened_alloy', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/hardened_alloy', name: 'Aleación Endurecida', icon: '📦', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Aleación de acero con tratamientos térmicos para máxima durabilidad.'
  },
  {
    id: 'nickel', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/nickel', name: 'Lingote de Níquel', icon: '📦', price: 2200, bcPrice: 74, warPrice: 8, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Lingote de níquel puro, utilizado para endurecer aleaciones y evitar corrosión.'
  },
  {
    id: 'paint_splint', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/paint_splint', name: 'Astilla de Pintura', icon: '📦', price: 800, bcPrice: 27, warPrice: 3, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Astilla de pintura de color concentrado para recubrimiento superficial.'
  },
  {
    id: 'plastic', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/plastic', name: 'Plástico', icon: '📦', price: 1000, bcPrice: 34, warPrice: 4, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Plástico moldeado de calidad industrial, ligero y aislante.'
  },
  {
    id: 'steel_alloy', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/steel_alloy', name: 'Aleación de Acero', icon: '📦', price: 4000, bcPrice: 134, warPrice: 14, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Aleación de hierro y carbono altamente resistente y versátil.'
  },
  {
    id: 'timber', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/timber', name: 'Madera de Construcción', icon: '📦', price: 800, bcPrice: 27, warPrice: 3, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Madera procesada y cortada en tablones listos para la construcción.'
  },
  {
    id: 'tin', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tin', name: 'Lingote de Estaño', icon: '📦', price: 1200, bcPrice: 40, warPrice: 4, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Lingote de estaño refinado, muy maleable y útil para soldaduras.'
  },
  {
    id: 'tint_black', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tint_black', name: 'Tinte Negro', icon: '📦', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tinte líquido de color negro vibrante para personalizar objetos y estructuras.'
  },
  {
    id: 'tint_blue', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tint_blue', name: 'Tinte Azul', icon: '📦', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tinte líquido de color azul vibrante para personalizar objetos y estructuras.'
  },
  {
    id: 'tint_green', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tint_green', name: 'Tinte Verde', icon: '📦', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tinte líquido de color verde vibrante para personalizar objetos y estructuras.'
  },
  {
    id: 'tint_orange', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tint_orange', name: 'Tinte Naranja', icon: '📦', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tinte líquido de color naranja vibrante para personalizar objetos y estructuras.'
  },
  {
    id: 'tint_purple', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tint_purple', name: 'Tinte Morado', icon: '📦', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tinte líquido de color morado vibrante para personalizar objetos y estructuras.'
  },
  {
    id: 'tint_red', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tint_red', name: 'Tinte Rojo', icon: '📦', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tinte líquido de color rojo vibrante para personalizar objetos y estructuras.'
  },
  {
    id: 'tint_white', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tint_white', name: 'Tinte Blanco', icon: '📦', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tinte líquido de color blanco vibrante para personalizar objetos y estructuras.'
  },
  {
    id: 'tint_yellow', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/tint_yellow', name: 'Tinte Amarillo', icon: '📦', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Tinte líquido de color yellow vibrante para personalizar objetos y estructuras.'
  },
  {
    id: 'woven_thread', craftingTier: 1, cat: 'refined_material', sprite: 'crafting/tier1/woven_thread', name: 'Hilo Tejido', icon: '📦', price: 600, bcPrice: 20, warPrice: 2, unlockLv: 1, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Hilo fuertemente tejido y resistente para costuras complejas.'
  },
  {
    id: 'advanced_electronics_module', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/advanced_electronics_module', name: 'Módulo Electrónico Avanzado', icon: '⚙️', price: 18000, bcPrice: 600, warPrice: 60, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Módulo electrónico de última generación para automatización avanzada.'
  },
  {
    id: 'antidote_reactive', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/antidote_reactive', name: 'Reactivo de Antídoto', icon: '⚙️', price: 2500, bcPrice: 84, warPrice: 9, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Sustancia neutralizadora de toxinas para síntesis médica.'
  },
  {
    id: 'big_battery', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/big_battery', name: 'Batería Grande', icon: '⚙️', price: 6000, bcPrice: 200, warPrice: 20, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Batería de alta capacidad para maquinaria y dispositivos de mediano tamaño.'
  },
  {
    id: 'big_cpu', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/big_cpu', name: 'Procesador Grande', icon: '⚙️', price: 10000, bcPrice: 334, warPrice: 34, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Procesador de alto rendimiento para servidores y computadoras industriales.'
  },
  {
    id: 'bolt_nut', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/bolt_nut', name: 'Tornillo y Tuerca', icon: '⚙️', price: 200, bcPrice: 7, warPrice: 1, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Juego de tornillo y tuerca metálicos para sujeción estructural.'
  },
  {
    id: 'bronze_nectar', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/bronze_nectar', name: 'Néctar de Bronce', icon: '🍯', price: 5000, bcPrice: 167, warPrice: 17, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Néctar floral concentrado que atrae Pokémon salvajes comunes.'
  },
  {
    id: 'cable', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/cable', name: 'Cable', icon: '⚙️', price: 500, bcPrice: 17, warPrice: 2, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cable de cobre aislado para transmisión de energía y datos.'
  },
  {
    id: 'calibrated_weight', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/calibrated_weight', name: 'Peso Calibrado', icon: '⚙️', price: 3000, bcPrice: 100, warPrice: 10, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Peso de precisión calibrado para balanzas o mecanismos de presión.'
  },
  {
    id: 'chemical_essence', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/chemical_essence', name: 'Esencia Química', icon: '⚙️', price: 3500, bcPrice: 117, warPrice: 12, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Extracto químico concentrado para elaboración de reactivos complejos.'
  },
  {
    id: 'chemical_resuscitant', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/chemical_resuscitant', name: 'Resucitador Químico', icon: '⚙️', price: 5000, bcPrice: 167, warPrice: 17, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Compuesto químico activo utilizado para reanimar tejidos biológicos.'
  },
  {
    id: 'chip', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/chip', name: 'Chip Electrónico', icon: '⚙️', price: 2000, bcPrice: 67, warPrice: 7, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Circuito integrado básico para control de señales eléctricas.'
  },
  {
    id: 'electronics_module', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/electronics_module', name: 'Módulo Electrónico', icon: '⚙️', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Módulo integrado con circuitos de control estándar.'
  },
  {
    id: 'fat_monitor', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/fat_monitor', name: 'Monitor CRT', icon: '⚙️', price: 4000, bcPrice: 134, warPrice: 14, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Monitor CRT de tubo clásico, pesado pero funcional.'
  },
  {
    id: 'flat_monitor', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/flat_monitor', name: 'Monitor Plano', icon: '⚙️', price: 12000, bcPrice: 400, warPrice: 40, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Monitor plano de alta resolución para estaciones avanzadas.'
  },
  {
    id: 'gear', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/gear', name: 'Engranaje', icon: '⚙️', price: 1500, bcPrice: 50, warPrice: 5, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Engranaje de metal para transmisión de fuerza mecánica.'
  },
  {
    id: 'golden_nectar', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/golden_nectar', name: 'Néctar Dorado', icon: '🍯', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Néctar floral concentrado que atrae Pokémon salvajes legendarios o muy raros.'
  },
  {
    id: 'gpu', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/gpu', name: 'Unidad GPU', icon: '⚙️', price: 18000, bcPrice: 600, warPrice: 60, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Procesador gráfico de alta velocidad para renderizado visual.'
  },
  {
    id: 'industrial_electronics', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/industrial_electronics', name: 'Electrónica Industrial', icon: '⚙️', price: 25000, bcPrice: 834, warPrice: 84, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Circuitos robustecidos diseñados para soportar altas tensiones industriales.'
  },
  {
    id: 'medicinal_extract', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/medicinal_extract', name: 'Extracto Medicinal', icon: '⚙️', price: 4000, bcPrice: 134, warPrice: 14, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Concentrado herbal purificado para medicina Pokémon.'
  },
  {
    id: 'metal_container', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/metal_container', name: 'Contenedor de Metal', icon: '⚙️', price: 4000, bcPrice: 134, warPrice: 14, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Contenedor de metal estándar para almacenamiento seguro.'
  },
  {
    id: 'metal_frame', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/metal_frame', name: 'Marco de Metal', icon: '⚙️', price: 3500, bcPrice: 117, warPrice: 12, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Estructura o marco metálico de soporte para montaje.'
  },
  {
    id: 'motherboard', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/motherboard', name: 'Placa Base', icon: '⚙️', price: 12000, bcPrice: 400, warPrice: 40, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Placa de circuito principal para interconectar procesadores y memoria.'
  },
  {
    id: 'nails', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/nails', name: 'Clavos', icon: '⚙️', price: 100, bcPrice: 4, warPrice: 1, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Clavos de acero para fijar madera y estructuras simples.'
  },
  {
    id: 'npu', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/npu', name: 'Unidad NPU', icon: '⚙️', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Unidad de procesamiento neuronal especializada en inteligencia artificial.'
  },
  {
    id: 'nuclear_waste', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/nuclear_waste', name: 'Desecho Nuclear', icon: '⚙️', price: 5000, bcPrice: 167, warPrice: 17, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Residuos nucleares radiactivos, deben manejarse con extremo cuidado.'
  },
  {
    id: 'optical_lens', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/optical_lens', name: 'Lente Óptica', icon: '⚙️', price: 4000, bcPrice: 134, warPrice: 14, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Lente de cristal pulido para enfoque óptico de precisión.'
  },
  {
    id: 'optic_fiber', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/optic_fiber', name: 'Fibra Óptica', icon: '⚙️', price: 2500, bcPrice: 84, warPrice: 9, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cable de fibra óptica de alta velocidad para comunicaciones de datos.'
  },
  {
    id: 'organic_fertilizer', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/organic_fertilizer', name: 'Fertilizante Orgánico', icon: '⚙️', price: 1500, bcPrice: 50, warPrice: 5, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Fertilizante rico en nutrientes orgánicos que acelera el crecimiento de bayas.'
  },
  {
    id: 'paint_coating', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/paint_coating', name: 'Recubrimiento de Pintura', icon: '⚙️', price: 1800, bcPrice: 60, warPrice: 6, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Recubrimiento de pintura especial anticorrosivo y aislante.'
  },
  {
    id: 'plastic_shell', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/plastic_shell', name: 'Carcasa de Plástico', icon: '⚙️', price: 2000, bcPrice: 67, warPrice: 7, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Carcasa plástica exterior protectora para dispositivos electrónicos.'
  },
  {
    id: 'reinforced_container', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/reinforced_container', name: 'Contenedor Reforzado', icon: '⚙️', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Contenedor de aleación reforzada para materiales peligrosos o reactivos.'
  },
  {
    id: 'reinforced_plastic_shell', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/reinforced_plastic_shell', name: 'Carcasa de Plástico Reforzada', icon: '⚙️', price: 4500, bcPrice: 150, warPrice: 15, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Carcasa plástica reforzada con fibra para entornos hostiles.'
  },
  {
    id: 'reinforced_strap', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/reinforced_strap', name: 'Correa Reforzada', icon: '⚙️', price: 1200, bcPrice: 40, warPrice: 4, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Correa trenzada de alta resistencia para sujeción y transporte.'
  },
  {
    id: 'rubber_gasket', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/rubber_gasket', name: 'Junta de Goma', icon: '⚙️', price: 300, bcPrice: 10, warPrice: 1, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Junta de goma flexible para sellar conexiones y evitar fugas.'
  },
  {
    id: 'screen', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/screen', name: 'Pantalla', icon: '⚙️', price: 5000, bcPrice: 167, warPrice: 17, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Panel de visualización digital para interfaces de usuario.'
  },
  {
    id: 'sensor', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/sensor', name: 'Sensor', icon: '⚙️', price: 3000, bcPrice: 100, warPrice: 10, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Dispositivo de detección ambiental para temperatura, presión y movimiento.'
  },
  {
    id: 'sensor_crystal', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/sensor_crystal', name: 'Cristal de Sensor', icon: '⚙️', price: 7000, bcPrice: 234, warPrice: 24, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cristal óptico de alta pureza utilizado para enfocar sensores avanzados.'
  },
  {
    id: 'silver_nectar', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/silver_nectar', name: 'Néctar de Plata', icon: '🍯', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Néctar floral concentrado que atrae Pokémon salvajes raros.'
  },
  {
    id: 'small_antenna', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/small_antenna', name: 'Antena Pequeña', icon: '⚙️', price: 1500, bcPrice: 50, warPrice: 5, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Antena emisora/receptora para comunicaciones de corto alcance.'
  },
  {
    id: 'small_battery', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/small_battery', name: 'Batería Pequeña', icon: '⚙️', price: 2500, bcPrice: 84, warPrice: 9, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Batería pequeña para alimentar dispositivos electrónicos portátiles.'
  },
  {
    id: 'small_cpu', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/small_cpu', name: 'Procesador Pequeño', icon: '⚙️', price: 4500, bcPrice: 150, warPrice: 15, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Microprocesador básico para automatización y lógica elemental.'
  },
  {
    id: 'small_monitor', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/small_monitor', name: 'Monitor Pequeño', icon: '⚙️', price: 6500, bcPrice: 217, warPrice: 22, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Monitor compacto para visualización de datos de terminales.'
  },
  {
    id: 'spring', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/spring', name: 'Resorte', icon: '⚙️', price: 400, bcPrice: 14, warPrice: 2, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Resorte helicoidal de acero para amortiguación y mecanismos móviles.'
  },
  {
    id: 'sweet_syrup', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/sweet_syrup', name: 'Sirope Dulce', icon: '⚙️', price: 1500, bcPrice: 50, warPrice: 5, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Jarabe espeso y dulce utilizado como aglutinante alimenticio.'
  },
  {
    id: 'transistor', craftingTier: 2, cat: 'component', sprite: 'crafting/tier2/transistor', name: 'Transistor', icon: '⚙️', price: 800, bcPrice: 27, warPrice: 3, unlockLv: 1, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Componente semiconductor para amplificar o conmutar señales.'
  },
  {
    id: '3d_printer', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/3d_printer', name: 'Impresora 3D', icon: '🏭', price: 60000, bcPrice: 2000, warPrice: 200, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Impresora 3D de alta precisión para fabricar carcasas y componentes complejos.'
  },
  {
    id: 'advanced_workbench', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/advanced_workbench', name: 'Banco de Trabajo Avanzado', icon: '🏭', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Banco de trabajo avanzado equipado con herramientas de alta precisión.'
  },
  {
    id: 'alembic', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/alembic', name: 'Alambique', icon: '🏭', price: 35000, bcPrice: 1167, warPrice: 117, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Alambique de laboratorio para destilar compuestos químicos y extractos médicos.'
  },
  {
    id: 'antenna', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/antenna', name: 'Antena', icon: '🏭', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Antena transmisora básica para enviar señales inalámbricas a corto alcance.'
  },
  {
    id: 'antimatter_generator', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/antimatter_generator', name: 'Generador de Antimateria', icon: '🏭', price: 180000, bcPrice: 6000, warPrice: 600, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Generador de antimateria experimental, produce energía casi ilimitada.'
  },
  {
    id: 'big_antenna', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/big_antenna', name: 'Antena Grande', icon: '🏭', price: 35000, bcPrice: 1167, warPrice: 117, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Antena parabólica grande para comunicación satelital o de larga distancia.'
  },
  {
    id: 'binoculars', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/binoculars', name: 'Binoculares', icon: '🛠️', price: 5000, bcPrice: 167, warPrice: 17, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Binoculares ópticos portátiles de largo alcance para avistamiento.'
  },
  {
    id: 'camera', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/camera', name: 'Cámara', icon: '🛠️', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cámara fotográfica de alta resolución para capturar imágenes.'
  },
  {
    id: 'charcoal', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/charcoal', name: 'Carbón vegetal', icon: '🪵', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 10, tier: 'rare', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Potencia los movimientos de tipo Fuego un 20%.'
  },
  {
    id: 'choice_scarf', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/choice_scarf', name: 'Pañuelo Elegido', icon: '🎗️', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 10, tier: 'legend', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Aumenta 50% la Velocidad, pero solo permite usar un movimiento.'
  },
  {
    id: 'choice_specs', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/choice_specs', name: 'Gafas Elegidas', icon: '👓', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 10, tier: 'legend', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Aumenta 50% el At. Especial, pero solo permite usar un movimiento.'
  },
  {
    id: 'coal_generator', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/coal_generator', name: 'Generador de Carbón', icon: '🏭', price: 35000, bcPrice: 1167, warPrice: 117, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Generador eléctrico impulsado por carbón, ideal para tus primeras máquinas.'
  },
  {
    id: 'cooking_pot', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/cooking_pot', name: 'Olla de Cocina', icon: '🏭', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Olla de cocina industrial para preparar deliciosos alimentos Pokémon en lote.'
  },
  {
    id: 'dive_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/dive_ball', name: 'Buceo Ball', icon: '🔵', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 10, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pokéball especial que facilita la captura de Pokémon en el agua.'
  },
  {
    id: 'dragon_fang', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/dragon_fang', name: 'Colmillo Dragón', icon: '🦷', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 10, tier: 'epic', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Potencia los movimientos de tipo Dragón un 20%.'
  },
  {
    id: 'dragon_scale', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/dragon_scale', name: 'Escama Dragón', icon: '🐚', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 10, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Escama dura y gruesa. Hace evolucionar a Seadra en Kingdra al equiparse.'
  },
  {
    id: 'energy_modulator', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/energy_modulator', name: 'Modulador de Energía', icon: '🏭', price: 50000, bcPrice: 1667, warPrice: 167, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Modulador magnético para estabilizar flujos de energía eléctrica de alta potencia.'
  },
  {
    id: 'eviolite', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/eviolite', name: 'Mineral Evolutivo', icon: '💎', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 10, tier: 'epic', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Aumenta 50% la Defensa y Def. Especial de Pokémon no evolucionados completamente.'
  },
  {
    id: 'food_dispenser', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/food_dispenser', name: 'Dispensador de Comida', icon: '🏭', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Dispensador automático para alimentar Pokémon de forma programada.'
  },
  {
    id: 'food_grinder', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/food_grinder', name: 'Molinillo de Comida', icon: '🏭', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Trituradora industrial de alimentos para preparar harinas y polvos base.'
  },
  {
    id: 'food_processor', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/food_processor', name: 'Procesador de Alimentos', icon: '🏭', price: 25000, bcPrice: 834, warPrice: 84, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Procesador de alimentos automático para dosificar e integrar ingredientes.'
  },
  {
    id: 'full_restore', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/full_restore', name: 'Restaurar Todo', icon: '🧴', price: 5000, bcPrice: 167, warPrice: 17, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Restaura todo el HP y cura todos los problemas de estado de un Pokémon.'
  },
  {
    id: 'furnace', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/furnace', name: 'Horno de Fundición', icon: '🏭', price: 25000, bcPrice: 834, warPrice: 84, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Horno de fundición de carbón para procesar metales y aleaciones básicas.'
  },
  {
    id: 'industrial_battery', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/industrial_battery', name: 'Batería Industrial', icon: '🏭', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Batería industrial de gran capacidad para almacenar energía sobrante.'
  },
  {
    id: 'lab_equipment', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/lab_equipment', name: 'Equipo de Laboratorio', icon: '🏭', price: 40000, bcPrice: 1334, warPrice: 134, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Conjunto de equipos de laboratorio para análisis químico y biológico.'
  },
  {
    id: 'lapidary_machine', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/lapidary_machine', name: 'Máquina Lapidaria', icon: '🏭', price: 40000, bcPrice: 1334, warPrice: 134, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Máquina lapidaria de precisión para cortar, facetar y pulir gemas y piedras.'
  },
  {
    id: 'laser_cutter', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/laser_cutter', name: 'Cortador Láser', icon: '🏭', price: 55000, bcPrice: 1834, warPrice: 184, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cortador láser de alta potencia para cortar planchas de metal y materiales duros.'
  },
  {
    id: 'life_orb', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/life_orb', name: 'Vidasfera', icon: '🔮', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 10, tier: 'legend', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Potencia los movimientos un 30% a cambio de perder 10% de HP por golpe.'
  },
  {
    id: 'luxury_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/luxury_ball', name: 'Lujo Ball', icon: '⚫', price: 10000, bcPrice: 334, warPrice: 34, unlockLv: 10, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pokéball muy cómoda que hace a los Pokémon capturados más amistosos.'
  },
  {
    id: 'medical_device', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/medical_device', name: 'Dispositivo Médico', icon: '🏭', price: 40000, bcPrice: 1334, warPrice: 134, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Dispositivo médico avanzado para el diagnóstico y curación de estados.'
  },
  {
    id: 'microscope', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/microscope', name: 'Microscopio', icon: '🛠️', price: 15000, bcPrice: 500, warPrice: 50, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Microscopio óptico de alta precisión para examinar muestras.'
  },
  {
    id: 'miracle_seed', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/miracle_seed', name: 'Semilla Milagro', icon: '🌱', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 10, tier: 'rare', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Potencia los movimientos de tipo Planta un 20%.'
  },
  {
    id: 'mystic_water', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/mystic_water', name: 'Agua Mística', icon: '💧', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 10, tier: 'rare', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Potencia los movimientos de tipo Agua un 20%.'
  },
  {
    id: 'nest_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/nest_ball', name: 'Nido Ball', icon: '🟢', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 10, tier: 'rare', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pokéball que facilita la captura de Pokémon de niveles inferiores.'
  },
  {
    id: 'nuclear_generator', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/nuclear_generator', name: 'Generador Nuclear', icon: '🏭', price: 95000, bcPrice: 3167, warPrice: 317, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Generador nuclear de fisión de altísima potencia para alimentar grandes redes.'
  },
  {
    id: 'poison_barb', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/poison_barb', name: 'Flecha Venenosa', icon: '🏹', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 10, tier: 'rare', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Potencia los movimientos de tipo Veneno un 20%.'
  },
  {
    id: 'pokedex', craftingTier: 3, cat: 'otros', sprite: 'crafting/tier3/pokedex', name: 'Pokédex', icon: '📱', price: 0, bcPrice: 0, warPrice: 0, unlockLv: 10, tier: 'legend', showInNormalShop: false, showInBCShop: true, showInWarShop: false,
    desc: 'Una enciclopedia electrónica de alta tecnología que registra todos los Pokémon.'
  },
  {
    id: 'pp_max', craftingTier: 3, cat: 'potions', sprite: 'crafting/tier3/pp_max', name: 'Máximo PP', icon: '📈', price: 35000, bcPrice: 1167, warPrice: 117, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Aumenta al máximo los PP de un movimiento de forma permanente.'
  },
  {
    id: 'quick_ball', craftingTier: 3, cat: 'pokeballs', sprite: 'crafting/tier3/quick_ball', name: 'Veloz Ball', icon: '🔵', price: 12000, bcPrice: 400, warPrice: 40, unlockLv: 10, tier: 'epic', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Pokéball con alta probabilidad de captura al inicio del combate.'
  },
  {
    id: 'radar', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/radar', name: 'Radar', icon: '🏭', price: 45000, bcPrice: 1500, warPrice: 150, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Dispositivo de radar active para escanear el terreno circundante.'
  },
  {
    id: 'rock_grinder', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/rock_grinder', name: 'Trituradora de Roca', icon: '🏭', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Trituradora de roca industrial para pulverizar minerales y extraer subproductos.'
  },
  {
    id: 'scale', craftingTier: 3, cat: 'tools', sprite: 'crafting/tier3/scale', name: 'Báscula', icon: '🛠️', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Báscula digital para pesar ingredientes y materiales.'
  },
  {
    id: 'server', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/server', name: 'Servidor', icon: '🏭', price: 50000, bcPrice: 1667, warPrice: 167, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Servidor de red para almacenar datos y gestionar automatizaciones complejas.'
  },
  {
    id: 'silver_powder', craftingTier: 3, cat: 'combat_held', sprite: 'crafting/tier3/silver_powder', name: 'Polvo Plata', icon: '✨', price: 8000, bcPrice: 267, warPrice: 27, unlockLv: 10, tier: 'rare', type: 'held', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Equipable. Potencia los movimientos de tipo Bicho un 20%.'
  },
  {
    id: 'smelter', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/smelter', name: 'Fundidora', icon: '🏭', price: 50000, bcPrice: 1667, warPrice: 167, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Fundidora de inducción eléctrica avanzada para aleaciones complejas.'
  },
  {
    id: 'solar_panel', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/solar_panel', name: 'Panel Solar', icon: '🏭', price: 40000, bcPrice: 1334, warPrice: 134, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Panel solar fotovoltaico para generar energía limpia en tu base.'
  },
  {
    id: 'weather_station', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/weather_station', name: 'Estación Meteorológica', icon: '🏭', price: 50000, bcPrice: 1667, warPrice: 167, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Estación meteorológica digital para medir el clima y predecir tormentas.'
  },
  {
    id: 'woodcutting_machine', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/woodcutting_machine', name: 'Cortadora de Madera', icon: '🏭', price: 30000, bcPrice: 1000, warPrice: 100, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Cortadora de madera eléctrica para procesar troncos en madera de construcción rápidamente.'
  },
  {
    id: 'workbench', craftingTier: 3, cat: 'machinery', sprite: 'crafting/tier3/workbench', name: 'Banco de Trabajo', icon: '🏭', price: 20000, bcPrice: 667, warPrice: 67, unlockLv: 10, tier: 'legend', showInNormalShop: true, showInBCShop: true, showInWarShop: false,
    desc: 'Banco de trabajo estándar para ensamblar componentes y herramientas.'
  }
];

export const getItemByName = (name: string) => SHOP_ITEMS.find(i => i.name === name);
export const getItemById = (id: string) => SHOP_ITEMS.find(i => i.id === id);
