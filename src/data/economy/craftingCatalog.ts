/**
 * src/data/economy/craftingCatalog.ts
 * Catálogo industrial de materiales crudos, recetas de taller y proyectos de construcción del rancho.
 * Fundamento matemático y económico para el sistema de crafteo y equilibrio de clases.
 */

export interface RawMaterial {
  id: string;
  name: string;
  icon: string;
  category: 'mineral' | 'botanical' | 'aquatic' | 'special';
  biome: 'mountain' | 'vegetation' | 'water' | 'trail';
  tier: 1 | 2 | 3;
  dropRate: number; // Probabilidad de hallazgo por evento de bioma (0.01 - 1.00)
  basePrice: number; // Valor estimado de intercambio en el mercado (₽)
  desc: string;
}

export interface CraftingIngredient {
  id: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'pokeballs' | 'medicine' | 'machinery' | 'alchemy' | 'buildings';
  tier: 1 | 2 | 3;
  durationSecs: number; // Tiempo de fabricación en taller
  moneyCost: number;    // Coste de mano de obra en Pokéyen (₽)
  ingredients: CraftingIngredient[];
  output: {
    id: string;
    quantity: number;
  };
  desc: string;
}

/**
 * CATÁLOGO COMPLETO DE MATERIALES CRUDOS (25+ Ítems)
 */
export const RAW_MATERIALS: Record<string, RawMaterial> = {
  // --- ⛰️ BIOMA MONTAÑA / CAVERNAS (Minerales y Metales) ---
  copper_ore: {
    id: 'copper_ore',
    name: 'Mineral de Cobre',
    icon: '🟤',
    category: 'mineral',
    biome: 'mountain',
    tier: 1,
    dropRate: 0.50,
    basePrice: 250,
    desc: 'Metal conductor maleable, base de circuitos y Poké Balls estándar.'
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Mineral de Hierro',
    icon: '🔩',
    category: 'mineral',
    biome: 'mountain',
    tier: 2,
    dropRate: 0.30,
    basePrice: 750,
    desc: 'Metal industrial pesado para Ultra Balls, incubadoras y refuerzos de taller.'
  },
  mine_coal: {
    id: 'mine_coal',
    name: 'Carbón de Mina',
    icon: '⚫',
    category: 'mineral',
    biome: 'mountain',
    tier: 2,
    dropRate: 0.20,
    basePrice: 500,
    desc: 'Combustible de alta energía para hornos de forja y recipientes oscuros.'
  },
  gold_nugget_raw: {
    id: 'gold_nugget_raw',
    name: 'Pepita de Oro en Bruto',
    icon: '🟡',
    category: 'mineral',
    biome: 'mountain',
    tier: 2,
    dropRate: 0.10,
    basePrice: 2500,
    desc: 'Mineral precioso sin refinar con excelente valor de mercado.'
  },
  silica_sand: {
    id: 'silica_sand',
    name: 'Arena de Sílice',
    icon: '⏳',
    category: 'mineral',
    biome: 'mountain',
    tier: 2,
    dropRate: 0.25,
    basePrice: 400,
    desc: 'Arena cristalina que se funde para crear cúpulas transparentes y visores.'
  },
  star_piece_raw: {
    id: 'star_piece_raw',
    name: 'Trozo de Estrella Cósmico',
    icon: '⭐',
    category: 'mineral',
    biome: 'mountain',
    tier: 3,
    dropRate: 0.03,
    basePrice: 6000,
    desc: 'Mineral de origen estelar con inmensas propiedades energéticas.'
  },
  shard_fire: {
    id: 'shard_fire',
    name: 'Fragmento Fuego',
    icon: '🔥',
    category: 'mineral',
    biome: 'mountain',
    tier: 2,
    dropRate: 0.08,
    basePrice: 1200,
    desc: 'Pedazo ardiente que emana calor continuo; 4 forman una Piedra Fuego.'
  },
  shard_thunder: {
    id: 'shard_thunder',
    name: 'Fragmento Trueno',
    icon: '⚡',
    category: 'mineral',
    biome: 'mountain',
    tier: 2,
    dropRate: 0.08,
    basePrice: 1200,
    desc: 'Trozo electrificado con chisporroteo permanente; 4 forman una Piedra Trueno.'
  },
  fossil_helix_raw: {
    id: 'fossil_helix_raw',
    name: 'Fósil Hélix Antiguo',
    icon: '🐚',
    category: 'mineral',
    biome: 'mountain',
    tier: 3,
    dropRate: 0.04,
    basePrice: 8000,
    desc: 'Fósil prehistórico de un Omanyte ancestral extraído de la roca profunda.'
  },

  // --- 🌿 BIOMA VEGETACIÓN / BOSQUES (Botánica y Biología) ---
  soft_wood: {
    id: 'soft_wood',
    name: 'Madera Blanda',
    icon: '🪵',
    category: 'botanical',
    biome: 'vegetation',
    tier: 1,
    dropRate: 0.55,
    basePrice: 150,
    desc: 'Ramas ligeras y flexibles para mangos, cercados iniciales y cajas.'
  },
  hard_oak_wood: {
    id: 'hard_oak_wood',
    name: 'Madera Dura de Roble',
    icon: '🌲',
    category: 'botanical',
    biome: 'vegetation',
    tier: 2,
    dropRate: 0.25,
    basePrice: 650,
    desc: 'Troncos macizos envejecidos indispensables para levantar edificios del rancho.'
  },
  silk_spool: {
    id: 'silk_spool',
    name: 'Hilo de Seda Resistente',
    icon: '🕸️',
    category: 'botanical',
    biome: 'vegetation',
    tier: 1,
    dropRate: 0.35,
    basePrice: 300,
    desc: 'Filamentos naturales tejidos por Pokémon tipo Bicho; base de Malla Balls.'
  },
  wild_honey: {
    id: 'wild_honey',
    name: 'Miel Silvestre',
    icon: '🍯',
    category: 'botanical',
    biome: 'vegetation',
    tier: 3,
    dropRate: 0.05,
    basePrice: 2000,
    desc: 'Néctar concentrado muy cotizado en botica y como cebo de captura.'
  },
  tree_resin: {
    id: 'tree_resin',
    name: 'Resina Natural',
    icon: '🧴',
    category: 'botanical',
    biome: 'vegetation',
    tier: 2,
    dropRate: 0.20,
    basePrice: 450,
    desc: 'Adhesivo orgánico impermeable para sellar carcasas de esferas y ungüentos.'
  },
  poison_barb_extract: {
    id: 'poison_barb_extract',
    name: 'Extracto de Aguijón Tóxico',
    icon: '🧪',
    category: 'botanical',
    biome: 'vegetation',
    tier: 2,
    dropRate: 0.15,
    basePrice: 550,
    desc: 'Compuesto defensivo natural que disuade a los Pokémon salvajes; base de repelentes.'
  },
  berry_cheri_raw: {
    id: 'berry_cheri_raw',
    name: 'Baya Zreza',
    icon: '🍒',
    category: 'botanical',
    biome: 'vegetation',
    tier: 1,
    dropRate: 0.40,
    basePrice: 180,
    desc: 'Baya picante que combate la parálisis y aporta calor al proceso de templado.'
  },
  berry_pecha_raw: {
    id: 'berry_pecha_raw',
    name: 'Baya Meloc',
    icon: '🍑',
    category: 'botanical',
    biome: 'vegetation',
    tier: 1,
    dropRate: 0.40,
    basePrice: 180,
    desc: 'Baya dulce y suave con extracto purificador antitoxinas.'
  },
  berry_oran_raw: {
    id: 'berry_oran_raw',
    name: 'Baya Aranja',
    icon: '🫐',
    category: 'botanical',
    biome: 'vegetation',
    tier: 1,
    dropRate: 0.45,
    basePrice: 160,
    desc: 'Baya silvestre muy jugosa; principio activo fundamental para las pociones curativas.'
  },
  berry_sitrus_raw: {
    id: 'berry_sitrus_raw',
    name: 'Baya Zidra',
    icon: '🍈',
    category: 'botanical',
    biome: 'vegetation',
    tier: 2,
    dropRate: 0.15,
    basePrice: 600,
    desc: 'Baya nutritiva de tamaño grande que regenera un 25% de salud en combate.'
  },
  berry_leppa_raw: {
    id: 'berry_leppa_raw',
    name: 'Baya Zanama',
    icon: '🍏',
    category: 'botanical',
    biome: 'vegetation',
    tier: 2,
    dropRate: 0.12,
    basePrice: 850,
    desc: 'Baya mística con energía reactiva; regenera puntos de poder (PP) en elixires.'
  },
  shard_leaf: {
    id: 'shard_leaf',
    name: 'Fragmento Hoja',
    icon: '🍃',
    category: 'botanical',
    biome: 'vegetation',
    tier: 2,
    dropRate: 0.08,
    basePrice: 1200,
    desc: 'Fósil vegetal que nunca se descompone; 4 forman una Piedra Hoja.'
  },

  // --- 🌊 BIOMA ACUÁTICO / COSTERO (Tesoros Marinos) ---
  pearl_shell: {
    id: 'pearl_shell',
    name: 'Concha Marina Perlada',
    icon: '🐚',
    category: 'aquatic',
    biome: 'water',
    tier: 1,
    dropRate: 0.45,
    basePrice: 350,
    desc: 'Caparazón nacarado resistente a la presión marina; base de Acua Balls y Buceo Balls.'
  },
  sea_pearl_small: {
    id: 'sea_pearl_small',
    name: 'Perla Marina',
    icon: '⚪',
    category: 'aquatic',
    biome: 'water',
    tier: 2,
    dropRate: 0.20,
    basePrice: 1500,
    desc: 'Gema redonda brillante recogida en el lecho marino; muy codiciada por joyeros.'
  },
  heart_scale_raw: {
    id: 'heart_scale_raw',
    name: 'Escama Corazón Pura',
    icon: '💖',
    category: 'aquatic',
    biome: 'water',
    tier: 3,
    dropRate: 0.07,
    basePrice: 3500,
    desc: 'Escama luminiscente capaz de reanimar la memoria de combate de cualquier Pokémon.'
  },
  deep_kelp: {
    id: 'deep_kelp',
    name: 'Alga Profunda',
    icon: '🌿',
    category: 'aquatic',
    biome: 'water',
    tier: 1,
    dropRate: 0.50,
    basePrice: 200,
    desc: 'Planta marina rica en minerales, base espesante para pociones y redes acuáticas.'
  },
  black_volcanic_sand: {
    id: 'black_volcanic_sand',
    name: 'Arena Negra Volcánica',
    icon: '🌑',
    category: 'aquatic',
    biome: 'water',
    tier: 2,
    dropRate: 0.22,
    basePrice: 600,
    desc: 'Arena pesada oscura proveniente de las fosas submarinas de Islas Espuma.'
  },
  pure_sea_salt: {
    id: 'pure_sea_salt',
    name: 'Sal Marina Pura',
    icon: '🧂',
    category: 'aquatic',
    biome: 'water',
    tier: 1,
    dropRate: 0.40,
    basePrice: 220,
    desc: 'Conservante natural indispensable para mezclar elixires y secar cuero.'
  },
  shard_water: {
    id: 'shard_water',
    name: 'Fragmento Agua',
    icon: '💧',
    category: 'aquatic',
    biome: 'water',
    tier: 2,
    dropRate: 0.08,
    basePrice: 1200,
    desc: 'Cristal azul que condensa humedad infinita; 4 forman una Piedra Agua.'
  }
};

/**
 * ÁRBOL COMPLETO DE RECETAS DEL TALLER Y PROYECTOS DEL RANCHO (46 Recetas)
 */
export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // ==========================================
  // CATEGORÍA A: POKÉ BALLS ESPECIALIZADAS (13)
  // ==========================================
  {
    id: 'craft_poke_ball',
    name: 'Poké Ball x5',
    category: 'pokeballs',
    tier: 1,
    durationSecs: 60,
    moneyCost: 200,
    ingredients: [
      { id: 'copper_ore', quantity: 2 },
      { id: 'berry_oran_raw', quantity: 1 }
    ],
    output: { id: 'poke_ball', quantity: 5 },
    desc: 'Lote básico de esferas estándar para captura cotidiana.'
  },
  {
    id: 'craft_super_ball',
    name: 'Super Ball x3',
    category: 'pokeballs',
    tier: 1,
    durationSecs: 180,
    moneyCost: 600,
    ingredients: [
      { id: 'iron_ore', quantity: 2 },
      { id: 'berry_cheri_raw', quantity: 1 }
    ],
    output: { id: 'great_ball', quantity: 3 },
    desc: 'Esferas reforzadas con ratio de captura x1.5.'
  },
  {
    id: 'craft_ultra_ball',
    name: 'Ultra Ball x2',
    category: 'pokeballs',
    tier: 2,
    durationSecs: 600,
    moneyCost: 1500,
    ingredients: [
      { id: 'iron_ore', quantity: 2 },
      { id: 'gold_nugget_raw', quantity: 1 },
      { id: 'berry_sitrus_raw', quantity: 1 }
    ],
    output: { id: 'ultra_ball', quantity: 2 },
    desc: 'Esfera de alto rendimiento con ratio de captura x2.0.'
  },
  {
    id: 'craft_nest_ball',
    name: 'Nido Ball x3',
    category: 'pokeballs',
    tier: 2,
    durationSecs: 600,
    moneyCost: 1200,
    ingredients: [
      { id: 'soft_wood', quantity: 2 },
      { id: 'silk_spool', quantity: 1 },
      { id: 'copper_ore', quantity: 1 }
    ],
    output: { id: 'nest_ball', quantity: 3 },
    desc: 'Muy eficaz contra Pokémon salvajes de bajo nivel.'
  },
  {
    id: 'craft_net_ball',
    name: 'Malla Ball x3',
    category: 'pokeballs',
    tier: 2,
    durationSecs: 600,
    moneyCost: 1200,
    ingredients: [
      { id: 'deep_kelp', quantity: 2 },
      { id: 'silk_spool', quantity: 2 },
      { id: 'pearl_shell', quantity: 1 }
    ],
    output: { id: 'net_ball', quantity: 3 },
    desc: 'Ratio x3.5 al intentar atrapar Pokémon de tipo Agua o Bicho.'
  },
  {
    id: 'craft_dive_ball',
    name: 'Buceo Ball x3',
    category: 'pokeballs',
    tier: 2,
    durationSecs: 600,
    moneyCost: 1400,
    ingredients: [
      { id: 'pearl_shell', quantity: 2 },
      { id: 'pure_sea_salt', quantity: 1 },
      { id: 'sea_pearl_small', quantity: 1 }
    ],
    output: { id: 'dive_ball', quantity: 3 },
    desc: 'Ratio x3.5 en combates marítimos y de pesca.'
  },
  {
    id: 'craft_repeat_ball',
    name: 'Acopio Ball x3',
    category: 'pokeballs',
    tier: 2,
    durationSecs: 600,
    moneyCost: 1300,
    ingredients: [
      { id: 'copper_ore', quantity: 2 },
      { id: 'tree_resin', quantity: 1 },
      { id: 'berry_pecha_raw', quantity: 1 }
    ],
    output: { id: 'repeat_ball', quantity: 3 },
    desc: 'Ratio x3.5 si ya has capturado previamente esa especie en la Pokédex.'
  },
  {
    id: 'craft_heal_ball',
    name: 'Sana Ball x3',
    category: 'pokeballs',
    tier: 1,
    durationSecs: 300,
    moneyCost: 800,
    ingredients: [
      { id: 'berry_oran_raw', quantity: 2 },
      { id: 'silk_spool', quantity: 1 },
      { id: 'copper_ore', quantity: 1 }
    ],
    output: { id: 'heal_ball', quantity: 3 },
    desc: 'Cura completamente los PS y problemas de estado del Pokémon al capturarlo.'
  },
  {
    id: 'craft_luxury_ball',
    name: 'Lujo Ball x2',
    category: 'pokeballs',
    tier: 2,
    durationSecs: 900,
    moneyCost: 2500,
    ingredients: [
      { id: 'gold_nugget_raw', quantity: 2 },
      { id: 'silk_spool', quantity: 1 },
      { id: 'sea_pearl_small', quantity: 1 }
    ],
    output: { id: 'luxury_ball', quantity: 2 },
    desc: 'Esfera ultra cómoda que duplica la ganancia de amistad con el entrenador.'
  },
  {
    id: 'craft_heavy_ball',
    name: 'Peso Ball x2',
    category: 'pokeballs',
    tier: 3,
    durationSecs: 1800,
    moneyCost: 3500,
    ingredients: [
      { id: 'iron_ore', quantity: 3 },
      { id: 'mine_coal', quantity: 2 }
    ],
    output: { id: 'heavy_ball', quantity: 2 },
    desc: 'Otorga un bono masivo de captura contra Pokémon de gran peso como Snorlax u Onix.'
  },
  {
    id: 'craft_dusk_ball',
    name: 'Ocaso Ball x3',
    category: 'pokeballs',
    tier: 2,
    durationSecs: 900,
    moneyCost: 2000,
    ingredients: [
      { id: 'black_volcanic_sand', quantity: 2 },
      { id: 'mine_coal', quantity: 1 },
      { id: 'berry_cheri_raw', quantity: 1 }
    ],
    output: { id: 'dusk_ball', quantity: 3 },
    desc: 'Ratio x3.0 garantizado de noche o dentro de cavernas y túneles.'
  },
  {
    id: 'craft_quick_ball',
    name: 'Veloz Ball x2',
    category: 'pokeballs',
    tier: 3,
    durationSecs: 2700,
    moneyCost: 4000,
    ingredients: [
      { id: 'copper_ore', quantity: 2 },
      { id: 'silica_sand', quantity: 2 },
      { id: 'shard_thunder', quantity: 1 }
    ],
    output: { id: 'quick_ball', quantity: 2 },
    desc: 'Ratio descomunal de x5.0 si se lanza en el primer turno del combate.'
  },
  {
    id: 'craft_timer_ball',
    name: 'Turno Ball x2',
    category: 'pokeballs',
    tier: 3,
    durationSecs: 2700,
    moneyCost: 4000,
    ingredients: [
      { id: 'iron_ore', quantity: 2 },
      { id: 'silica_sand', quantity: 1 },
      { id: 'wild_honey', quantity: 1 }
    ],
    output: { id: 'timer_ball', quantity: 2 },
    desc: 'Aumenta su eficacia con cada turno de combate, alcanzando un ratio de x4.0.'
  },

  // ==========================================
  // CATEGORÍA B: BOTICA Y MEDICINA (12)
  // ==========================================
  {
    id: 'craft_potion',
    name: 'Poción x5',
    category: 'medicine',
    tier: 1,
    durationSecs: 60,
    moneyCost: 150,
    ingredients: [
      { id: 'berry_oran_raw', quantity: 2 },
      { id: 'deep_kelp', quantity: 1 }
    ],
    output: { id: 'potion', quantity: 5 },
    desc: 'Restaura 20 PS a un Pokémon herido.'
  },
  {
    id: 'craft_super_potion',
    name: 'Superpoción x3',
    category: 'medicine',
    tier: 1,
    durationSecs: 120,
    moneyCost: 450,
    ingredients: [
      { id: 'berry_oran_raw', quantity: 2 },
      { id: 'tree_resin', quantity: 1 }
    ],
    output: { id: 'super_potion', quantity: 3 },
    desc: 'Restaura 50 PS con infusión de resina medicinal.'
  },
  {
    id: 'craft_hyper_potion',
    name: 'Hiperpoción x2',
    category: 'medicine',
    tier: 2,
    durationSecs: 600,
    moneyCost: 1200,
    ingredients: [
      { id: 'berry_sitrus_raw', quantity: 2 },
      { id: 'tree_resin', quantity: 1 }
    ],
    output: { id: 'hyper_potion', quantity: 2 },
    desc: 'Restaura 200 PS gracias al concentrado de Baya Zidra.'
  },
  {
    id: 'craft_max_potion',
    name: 'Poción Máxima x1',
    category: 'medicine',
    tier: 3,
    durationSecs: 1800,
    moneyCost: 3000,
    ingredients: [
      { id: 'berry_sitrus_raw', quantity: 3 },
      { id: 'heart_scale_raw', quantity: 1 },
      { id: 'sea_pearl_small', quantity: 1 }
    ],
    output: { id: 'max_potion', quantity: 1 },
    desc: 'Regenera por completo todos los PS de un Pokémon.'
  },
  {
    id: 'craft_full_heal',
    name: 'Cura Total x3',
    category: 'medicine',
    tier: 1,
    durationSecs: 300,
    moneyCost: 600,
    ingredients: [
      { id: 'berry_pecha_raw', quantity: 1 },
      { id: 'berry_cheri_raw', quantity: 1 },
      { id: 'pure_sea_salt', quantity: 1 }
    ],
    output: { id: 'full_heal', quantity: 3 },
    desc: 'Sana cualquier alteración de estado (veneno, parálisis, sueño, etc.).'
  },
  {
    id: 'craft_revive',
    name: 'Revivir x2',
    category: 'medicine',
    tier: 2,
    durationSecs: 900,
    moneyCost: 1500,
    ingredients: [
      { id: 'heart_scale_raw', quantity: 1 },
      { id: 'wild_honey', quantity: 1 },
      { id: 'copper_ore', quantity: 1 }
    ],
    output: { id: 'revive', quantity: 2 },
    desc: 'Reanima a un Pokémon debilitado devolviéndole la mitad de sus PS.'
  },
  {
    id: 'craft_revive_max',
    name: 'Revivir Máximo x1',
    category: 'medicine',
    tier: 3,
    durationSecs: 3600,
    moneyCost: 6000,
    ingredients: [
      { id: 'heart_scale_raw', quantity: 2 },
      { id: 'star_piece_raw', quantity: 1 },
      { id: 'tree_resin', quantity: 1 }
    ],
    output: { id: 'revive_max', quantity: 1 },
    desc: 'Reanima a un Pokémon debilitado con el 100% de sus PS y energía.'
  },
  {
    id: 'craft_elixir_pp',
    name: 'Elixir de PP x2',
    category: 'medicine',
    tier: 2,
    durationSecs: 1200,
    moneyCost: 2000,
    ingredients: [
      { id: 'berry_leppa_raw', quantity: 2 },
      { id: 'wild_honey', quantity: 1 }
    ],
    output: { id: 'elixir', quantity: 2 },
    desc: 'Restaura 10 PP a todos los ataques de un Pokémon.'
  },
  {
    id: 'craft_max_elixir',
    name: 'Máximo Elixir x1',
    category: 'medicine',
    tier: 3,
    durationSecs: 3600,
    moneyCost: 5000,
    ingredients: [
      { id: 'berry_leppa_raw', quantity: 4 },
      { id: 'star_piece_raw', quantity: 1 }
    ],
    output: { id: 'elixir_max', quantity: 1 },
    desc: 'Recarga al máximo todos los PP de todos los ataques del Pokémon.'
  },
  {
    id: 'craft_repel',
    name: 'Repelente de Aventura x3',
    category: 'medicine',
    tier: 1,
    durationSecs: 180,
    moneyCost: 300,
    ingredients: [
      { id: 'poison_barb_extract', quantity: 2 },
      { id: 'tree_resin', quantity: 1 }
    ],
    output: { id: 'repel', quantity: 3 },
    desc: 'Mantiene alejados a los Pokémon salvajes débiles durante 5 minutos.'
  },
  {
    id: 'craft_super_repel',
    name: 'Superrepelente x2',
    category: 'medicine',
    tier: 2,
    durationSecs: 600,
    moneyCost: 800,
    ingredients: [
      { id: 'poison_barb_extract', quantity: 2 },
      { id: 'mine_coal', quantity: 1 }
    ],
    output: { id: 'super_repel', quantity: 2 },
    desc: 'Efecto repelente prolongado durante 15 minutos de exploración.'
  },
  {
    id: 'craft_max_repel',
    name: 'Máximo Repelente x1',
    category: 'medicine',
    tier: 3,
    durationSecs: 1800,
    moneyCost: 2000,
    ingredients: [
      { id: 'poison_barb_extract', quantity: 3 },
      { id: 'silica_sand', quantity: 1 }
    ],
    output: { id: 'max_repel', quantity: 1 },
    desc: 'Concentración máxima que repele especies comunes durante 30 minutos.'
  },

  // ==========================================
  // CATEGORÍA C: MAQUINARIA Y HERRAMIENTAS (8)
  // ==========================================
  {
    id: 'craft_incubator_std',
    name: 'Incubadora Estándar',
    category: 'machinery',
    tier: 2,
    durationSecs: 900,
    moneyCost: 5000,
    ingredients: [
      { id: 'iron_ore', quantity: 3 },
      { id: 'mine_coal', quantity: 2 },
      { id: 'silica_sand', quantity: 2 }
    ],
    output: { id: 'incubator_standard', quantity: 1 },
    desc: 'Dispositivo portátil que permite llevar +1 huevo adicional durante tus viajes (3 usos).'
  },
  {
    id: 'craft_incubator_super',
    name: 'Súper Incubadora Térmica',
    category: 'machinery',
    tier: 3,
    durationSecs: 3600,
    moneyCost: 15000,
    ingredients: [
      { id: 'iron_ore', quantity: 3 },
      { id: 'shard_fire', quantity: 1 },
      { id: 'star_piece_raw', quantity: 1 }
    ],
    output: { id: 'incubator_super', quantity: 1 },
    desc: 'Incubadora avanzada con calor radiante; reduce los pasos necesarios un 33% (3 usos).'
  },
  {
    id: 'craft_pickaxe_iron',
    name: 'Pico de Minería de Hierro',
    category: 'machinery',
    tier: 2,
    durationSecs: 900,
    moneyCost: 4000,
    ingredients: [
      { id: 'iron_ore', quantity: 3 },
      { id: 'hard_oak_wood', quantity: 2 }
    ],
    output: { id: 'pickaxe_silver', quantity: 1 },
    desc: 'Herramienta resistente que aumenta la velocidad y el botín de eventos de minería en cavernas.'
  },
  {
    id: 'craft_pickaxe_gold',
    name: 'Pico de Oro Prospector',
    category: 'machinery',
    tier: 3,
    durationSecs: 2700,
    moneyCost: 12000,
    ingredients: [
      { id: 'gold_nugget_raw', quantity: 3 },
      { id: 'hard_oak_wood', quantity: 2 }
    ],
    output: { id: 'pickaxe_gold', quantity: 1 },
    desc: 'Pico de precisión que incrementa un 20% la probabilidad de desenterrar fósiles y minerales raros.'
  },
  {
    id: 'craft_super_rod',
    name: 'Supercaña de Carbono',
    category: 'machinery',
    tier: 3,
    durationSecs: 2700,
    moneyCost: 10000,
    ingredients: [
      { id: 'iron_ore', quantity: 2 },
      { id: 'mine_coal', quantity: 2 },
      { id: 'silk_spool', quantity: 3 }
    ],
    output: { id: 'fishing_rod_super', quantity: 1 },
    desc: 'Caña ultra flexible para capturar las especies marinas más poderosas de Kanto.'
  },
  {
    id: 'craft_squirtle_bottle',
    name: 'Regadera Reforzada Squirtle',
    category: 'machinery',
    tier: 2,
    durationSecs: 1200,
    moneyCost: 8000,
    ingredients: [
      { id: 'copper_ore', quantity: 3 },
      { id: 'pure_sea_salt', quantity: 2 },
      { id: 'pearl_shell', quantity: 2 }
    ],
    output: { id: 'squirtle_bottle_plus', quantity: 1 },
    desc: 'Herramienta de jardinería con capacidad ampliada para regar hasta 8 parcelas en un solo clic.'
  },
  {
    id: 'craft_dojo_punching_bag',
    name: 'Saco de Boxeo Reforzado',
    category: 'machinery',
    tier: 2,
    durationSecs: 1800,
    moneyCost: 15000,
    ingredients: [
      { id: 'silk_spool', quantity: 6 },
      { id: 'iron_ore', quantity: 3 },
      { id: 'hard_oak_wood', quantity: 2 }
    ],
    output: { id: 'dojo_equipment_atk', quantity: 1 },
    desc: 'Equipamiento de gimnasio para instalar en el Dojo de EVs (entrena EVs de Ataque).'
  },
  {
    id: 'craft_dojo_treadmill',
    name: 'Cinta de Correr de Velocidad',
    category: 'machinery',
    tier: 2,
    durationSecs: 1800,
    moneyCost: 15000,
    ingredients: [
      { id: 'copper_ore', quantity: 4 },
      { id: 'iron_ore', quantity: 2 },
      { id: 'silica_sand', quantity: 2 }
    ],
    output: { id: 'dojo_equipment_spe', quantity: 1 },
    desc: 'Equipamiento de gimnasio para instalar en el Dojo de EVs (entrena EVs de Velocidad).'
  },

  // ==========================================
  // CATEGORÍA D: ALQUIMIA Y PIEDRAS EVOLUTIVAS (5)
  // ==========================================
  {
    id: 'craft_stone_fire',
    name: 'Piedra Fuego',
    category: 'alchemy',
    tier: 2,
    durationSecs: 1200,
    moneyCost: 2500,
    ingredients: [
      { id: 'shard_fire', quantity: 4 },
      { id: 'mine_coal', quantity: 1 }
    ],
    output: { id: 'fire_stone', quantity: 1 },
    desc: 'Cristal incandescente capaz de provocar la evolución en Eevee, Growlithe y Vulpix.'
  },
  {
    id: 'craft_stone_water',
    name: 'Piedra Agua',
    category: 'alchemy',
    tier: 2,
    durationSecs: 1200,
    moneyCost: 2500,
    ingredients: [
      { id: 'shard_water', quantity: 4 },
      { id: 'sea_pearl_small', quantity: 1 }
    ],
    output: { id: 'water_stone', quantity: 1 },
    desc: 'Gema marina de pureza azul que evoluciona a Eevee, Poliwhirl, Shellder y Staryu.'
  },
  {
    id: 'craft_stone_thunder',
    name: 'Piedra Trueno',
    category: 'alchemy',
    tier: 2,
    durationSecs: 1200,
    moneyCost: 2500,
    ingredients: [
      { id: 'shard_thunder', quantity: 4 },
      { id: 'copper_ore', quantity: 2 }
    ],
    output: { id: 'thunder_stone', quantity: 1 },
    desc: 'Piedra fulgurante con carga eléctrica; evoluciona a Pikachu y Eevee.'
  },
  {
    id: 'craft_stone_leaf',
    name: 'Piedra Hoja',
    category: 'alchemy',
    tier: 2,
    durationSecs: 1200,
    moneyCost: 2500,
    ingredients: [
      { id: 'shard_leaf', quantity: 4 },
      { id: 'tree_resin', quantity: 2 }
    ],
    output: { id: 'leaf_stone', quantity: 1 },
    desc: 'Piedra fosilizada con impronta botánica; evoluciona a Gloom, Weepinbell y Exeggcute.'
  },
  {
    id: 'craft_stone_moon',
    name: 'Piedra Lunar',
    category: 'alchemy',
    tier: 3,
    durationSecs: 3600,
    moneyCost: 7500,
    ingredients: [
      { id: 'silica_sand', quantity: 3 },
      { id: 'star_piece_raw', quantity: 1 }
    ],
    output: { id: 'moon_stone', quantity: 1 },
    desc: 'Piedra mística tan oscura como la noche cósmica; evoluciona a Clefairy, Jigglypuff, Nidorina y Nidorino.'
  },

  // ==========================================
  // CATEGORÍA E: ESTRUCTURAS Y MEJORAS DEL RANCHO (8)
  // ==========================================
  {
    id: 'build_garden_basic',
    name: 'Construcción de Huerta Básica (4 Parcelas)',
    category: 'buildings',
    tier: 1,
    durationSecs: 900, // 15 min
    moneyCost: 10000,
    ingredients: [
      { id: 'soft_wood', quantity: 10 },
      { id: 'copper_ore', quantity: 5 }
    ],
    output: { id: 'building_garden_tier1', quantity: 1 },
    desc: 'Acondiciona el terreno de tu rancho para cultivar tus primeras 4 parcelas de bayas.'
  },
  {
    id: 'build_garden_upgrade',
    name: 'Ampliación de Huerta (8 Parcelas)',
    category: 'buildings',
    tier: 2,
    durationSecs: 2700, // 45 min
    moneyCost: 35000,
    ingredients: [
      { id: 'hard_oak_wood', quantity: 15 },
      { id: 'tree_resin', quantity: 8 }
    ],
    output: { id: 'building_garden_tier2', quantity: 1 },
    desc: 'Expande la zona de cultivo al doble, permitiendo cuidar hasta 8 plantas simultáneas.'
  },
  {
    id: 'build_workshop_basic',
    name: 'Construcción del Taller Mecánico',
    category: 'buildings',
    tier: 1,
    durationSecs: 1200, // 20 min
    moneyCost: 15000,
    ingredients: [
      { id: 'iron_ore', quantity: 8 },
      { id: 'copper_ore', quantity: 8 },
      { id: 'soft_wood', quantity: 10 }
    ],
    output: { id: 'building_workshop_tier1', quantity: 1 },
    desc: 'Levanta el taller de maquinarias con 2 ranuras de fabricación activa.'
  },
  {
    id: 'build_workshop_upgrade',
    name: 'Ampliación de Taller (4 Ranuras)',
    category: 'buildings',
    tier: 2,
    durationSecs: 3600, // 60 min
    moneyCost: 50000,
    ingredients: [
      { id: 'iron_ore', quantity: 12 },
      { id: 'mine_coal', quantity: 6 },
      { id: 'silica_sand', quantity: 4 }
    ],
    output: { id: 'building_workshop_tier2', quantity: 1 },
    desc: 'Duplica las prensas del taller para fabricar hasta 4 recetas simultáneamente.'
  },
  {
    id: 'build_dojo_basic',
    name: 'Construcción del Dojo de EVs',
    category: 'buildings',
    tier: 2,
    durationSecs: 5400, // 90 min
    moneyCost: 60000,
    ingredients: [
      { id: 'hard_oak_wood', quantity: 15 },
      { id: 'iron_ore', quantity: 10 },
      { id: 'silk_spool', quantity: 8 }
    ],
    output: { id: 'building_dojo_tier1', quantity: 1 },
    desc: 'Inaugura tu gimnasio privado para entrenar pasivamente 1 Pokémon a cambio de 2,500 ₽/h.'
  },
  {
    id: 'build_dojo_upgrade',
    name: 'Ampliación del Dojo (2º Slot + Meditación)',
    category: 'buildings',
    tier: 3,
    durationSecs: 7200, // 2 horas
    moneyCost: 100000,
    ingredients: [
      { id: 'iron_ore', quantity: 12 },
      { id: 'mine_coal', quantity: 5 },
      { id: 'silica_sand', quantity: 4 }
    ],
    output: { id: 'building_dojo_tier2', quantity: 1 },
    desc: 'Permite entrenar 2 Pokémon simultáneamente y desbloquea el régimen de EVs Especiales.'
  },
  {
    id: 'build_daycare_private',
    name: 'Construcción de la Guardería Privada',
    category: 'buildings',
    tier: 3,
    durationSecs: 10800, // 3 horas
    moneyCost: 150000,
    ingredients: [
      { id: 'hard_oak_wood', quantity: 25 },
      { id: 'iron_ore', quantity: 15 },
      { id: 'tree_resin', quantity: 10 },
      { id: 'pure_sea_salt', quantity: 5 }
    ],
    output: { id: 'building_daycare_tier1', quantity: 1 },
    desc: 'Hito de Endgame: Corral privado para criar 1 pareja en tu propio rancho sin viajar a Ruta 5.'
  },
  {
    id: 'build_daycare_triple',
    name: 'Ampliación de Guardería (Triple Corral)',
    category: 'buildings',
    tier: 3,
    durationSecs: 14400, // 4 horas
    moneyCost: 300000,
    ingredients: [
      { id: 'hard_oak_wood', quantity: 20 },
      { id: 'gold_nugget_raw', quantity: 10 },
      { id: 'star_piece_raw', quantity: 2 }
    ],
    output: { id: 'building_daycare_tier2', quantity: 1 },
    desc: 'Granja genética de alta escala: gestiona hasta 3 parejas de Pokémon criando a la vez.'
  }
];
